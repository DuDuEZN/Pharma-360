"""Sauvegardes de la base de données.

La sauvegarde est produite sans dépendance externe : chaque table est
exportée en CSV via ``COPY`` (asyncpg), puis compressée dans une archive ZIP
avec un manifeste. La restauration vide les tables puis réimporte les CSV.

Ce format fonctionne même lorsque ``pg_dump`` n'est pas installé dans
l'image. Les anciennes sauvegardes ``.dump`` restent restaurables si
``pg_restore`` est disponible.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from ..core.database import engine

BACKUP_SUFFIX = ".zip"
LEGACY_SUFFIX = ".dump"
_BACKUP_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")


class BackupError(RuntimeError):
    """Erreur de sauvegarde ou de restauration."""


def get_backup_dir() -> Path:
    """Répertoire des sauvegardes (créé au besoin)."""
    env_dir = os.environ.get("BACKUP_DIR")
    if env_dir:
        directory = Path(env_dir)
    elif Path("/app/uploads").is_dir():
        directory = Path("/app/uploads") / "backups"
    else:
        directory = Path(__file__).resolve().parents[2] / "backups"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _entry(path: Path) -> Dict[str, Any]:
    stat = path.stat()
    return {
        "id": path.stem,
        "filename": path.name,
        "name": path.name,
        "size": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "status": "completed",
    }


def list_backups() -> List[Dict[str, Any]]:
    directory = get_backup_dir()
    entries = [
        _entry(path)
        for path in directory.iterdir()
        if path.is_file() and path.suffix in (BACKUP_SUFFIX, LEGACY_SUFFIX)
    ]
    return sorted(entries, key=lambda item: item["created_at"], reverse=True)


def resolve_backup(backup_id: str) -> Optional[Path]:
    """Retrouve un fichier de sauvegarde à partir de son identifiant."""
    candidate = (backup_id or "").strip()
    if not candidate or not _BACKUP_NAME_RE.match(candidate):
        return None
    directory = get_backup_dir()
    for name in (
        candidate,
        f"{candidate}{BACKUP_SUFFIX}",
        f"{candidate}{LEGACY_SUFFIX}",
    ):
        path = (directory / name).resolve()
        if path.parent != directory.resolve():
            continue
        if path.is_file():
            return path
    return None


async def _list_tables(conn) -> List[str]:
    result = await conn.execute(
        text(
            "SELECT tablename FROM pg_tables "
            "WHERE schemaname = 'public' ORDER BY tablename"
        )
    )
    return [row[0] for row in result.all()]


async def _driver(conn):
    """Connexion asyncpg brute sous-jacente à une connexion SQLAlchemy."""
    raw = await conn.get_raw_connection()
    return raw.driver_connection


async def create_backup() -> Dict[str, Any]:
    """Crée une archive ZIP contenant toutes les tables (CSV)."""
    directory = get_backup_dir()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = directory / f"pharma360_{stamp}{BACKUP_SUFFIX}"
    tmpdir = Path(tempfile.mkdtemp(prefix="pharma360_backup_", dir=str(directory)))

    try:
        async with engine.connect() as conn:
            # Instantané cohérent : toutes les tables au même instant.
            await conn.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
            await conn.execute(text("SET TRANSACTION READ ONLY"))
            driver = await _driver(conn)
            tables = await _list_tables(conn)
            for table in tables:
                await driver.copy_from_table(
                    table,
                    output=str(tmpdir / f"{table}.csv"),
                    format="csv",
                    header=True,
                )

        manifest = {
            "format": "pharma360-csv-zip",
            "version": 1,
            "created_at": datetime.now().isoformat(),
            "tables": tables,
        }
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(
                "manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2)
            )
            for table in tables:
                archive.write(
                    tmpdir / f"{table}.csv", f"data/{table}.csv"
                )
    except BackupError:
        target.unlink(missing_ok=True)
        raise
    except Exception as exc:  # noqa: BLE001 - remonté en erreur métier
        target.unlink(missing_ok=True)
        raise BackupError(f"Échec de la sauvegarde : {exc}") from exc
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    if not target.exists() or target.stat().st_size == 0:
        target.unlink(missing_ok=True)
        raise BackupError("Le fichier de sauvegarde est vide")
    return _entry(target)


def delete_backup(backup_id: str) -> bool:
    path = resolve_backup(backup_id)
    if not path:
        return False
    path.unlink(missing_ok=True)
    return True


async def _reset_sequences(conn, tables: List[str]) -> None:
    for table in tables:
        sequence = (
            await conn.execute(
                text("SELECT pg_get_serial_sequence(:table, 'id')"),
                {"table": table},
            )
        ).scalar()
        if not sequence:
            continue
        await conn.execute(
            text(
                f'SELECT setval(:sequence, '
                f'COALESCE((SELECT MAX(id) FROM "{table}"), 1), '
                f'(SELECT COUNT(*) FROM "{table}") > 0)'
            ),
            {"sequence": sequence},
        )


async def _restore_zip(path: Path) -> None:
    tmpdir = Path(tempfile.mkdtemp(prefix="pharma360_restore_"))
    try:
        with zipfile.ZipFile(path) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            tables = manifest.get("tables") or []
            if not tables:
                raise BackupError("Archive de sauvegarde invalide (aucune table)")
            archive.extractall(tmpdir)

        async with engine.begin() as conn:
            driver = await _driver(conn)
            replication_role_set = False
            try:
                # Désactive les contraintes pendant le réimport (superuser).
                await driver.execute("SET session_replication_role = replica")
                replication_role_set = True
            except Exception:  # noqa: BLE001 - droits insuffisants
                pass

            quoted = ", ".join(f'"{table}"' for table in tables)
            await conn.execute(
                text(f"TRUNCATE {quoted} RESTART IDENTITY CASCADE")
            )

            for table in tables:
                source = tmpdir / "data" / f"{table}.csv"
                if not source.exists():
                    continue
                await driver.copy_to_table(
                    table,
                    source=str(source),
                    format="csv",
                    header=True,
                )

            await _reset_sequences(conn, tables)

            if replication_role_set:
                try:
                    await driver.execute("SET session_replication_role = origin")
                except Exception:  # noqa: BLE001
                    pass
    except BackupError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise BackupError(f"Échec de la restauration : {exc}") from exc
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _restore_legacy_dump(path: Path) -> None:
    env = os.environ.copy()
    env.setdefault("PGHOST", os.environ.get("POSTGRES_HOST", "localhost"))
    env.setdefault("PGPORT", os.environ.get("POSTGRES_PORT", "5432"))
    env.setdefault("PGDATABASE", os.environ.get("POSTGRES_DB", "pharma360_prod"))
    env.setdefault("PGUSER", os.environ.get("POSTGRES_USER", "pharma_admin"))
    env.setdefault("PGPASSWORD", os.environ.get("POSTGRES_PASSWORD", ""))
    try:
        proc = subprocess.run(
            [
                "pg_restore",
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges",
                "--dbname",
                env["PGDATABASE"],
                str(path),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=900,
            check=False,
        )
    except FileNotFoundError as exc:
        raise BackupError(
            "pg_restore est introuvable : ce format de sauvegarde ne peut pas "
            "être restauré sur cette installation."
        ) from exc
    if proc.returncode != 0:
        raise BackupError((proc.stderr or proc.stdout or "pg_restore a échoué").strip())


async def restore_backup(backup_id: str) -> None:
    path = resolve_backup(backup_id)
    if not path:
        raise BackupError("Sauvegarde introuvable")
    if path.suffix == BACKUP_SUFFIX:
        await _restore_zip(path)
    else:
        _restore_legacy_dump(path)
