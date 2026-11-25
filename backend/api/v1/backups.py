"""API de gestion des sauvegardes (espace gestionnaire)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from ...services.backup_service import (
    BackupError,
    create_backup,
    delete_backup,
    list_backups,
    resolve_backup,
    restore_backup,
)

router = APIRouter(prefix="/manager/backups", tags=["backups"])
logger = get_logger(__name__)


def _require_manager(current_user: User) -> None:
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin required",
        )


@router.get("")
async def get_backups(current_user: User = Depends(get_current_user)):
    """Liste les sauvegardes disponibles."""
    _require_manager(current_user)
    return {"backups": list_backups()}


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_new_backup(current_user: User = Depends(get_current_user)):
    """Crée une sauvegarde complète de la base de données."""
    _require_manager(current_user)
    try:
        entry = await create_backup()
    except BackupError as exc:
        logger.error("Backup creation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    return {"status": "success", "backup": entry, "message": "Sauvegarde créée"}


@router.get("/{backup_id}/download")
async def download_backup(
    backup_id: str, current_user: User = Depends(get_current_user)
):
    """Télécharge une sauvegarde."""
    _require_manager(current_user)
    path = resolve_backup(backup_id)
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sauvegarde introuvable"
        )
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=path.name,
    )


@router.delete("/{backup_id}")
async def remove_backup(
    backup_id: str, current_user: User = Depends(get_current_user)
):
    """Supprime une sauvegarde."""
    _require_manager(current_user)
    if not delete_backup(backup_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sauvegarde introuvable"
        )
    return {"status": "success", "message": "Sauvegarde supprimée"}


@router.post("/{backup_id}/restore")
async def restore_existing_backup(
    backup_id: str, current_user: User = Depends(get_current_user)
):
    """Restaure une sauvegarde (administrateur uniquement)."""
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin required"
        )
    try:
        await restore_backup(backup_id)
    except BackupError as exc:
        logger.error("Backup restore failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    return {"status": "success", "message": "Sauvegarde restaurée"}
