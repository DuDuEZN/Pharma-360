#!/usr/bin/env bash
# Crée un compte administrateur dans la base de production Pharma-360.
# Le mot de passe est demandé en saisie masquée : il n'est écrit nulle part.
#
# Usage : bash create-admin.sh
set -euo pipefail

CONTAINER="${BACKEND_CONTAINER:-pharma360-backend-prod}"

docker inspect "$CONTAINER" >/dev/null 2>&1 \
  || { echo "Conteneur $CONTAINER introuvable (est-il démarré ?)."; exit 1; }

read -r -p "Nom d'utilisateur [admin] : " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"
read -r -p "Email [admin@pharma360.local] : " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@pharma360.local}"
read -r -p "Nom complet [Administrateur] : " ADMIN_NAME
ADMIN_NAME="${ADMIN_NAME:-Administrateur}"

read -r -s -p "Mot de passe (10 caractères minimum) : " ADMIN_PASSWORD; echo
read -r -s -p "Confirmer le mot de passe : " CONFIRM; echo
[ "$ADMIN_PASSWORD" = "$CONFIRM" ] || { echo "Les mots de passe ne correspondent pas."; exit 1; }
[ "${#ADMIN_PASSWORD}" -ge 10 ] || { echo "Mot de passe trop court (10 caractères minimum)."; exit 1; }

docker exec -i \
  -e ADMIN_USER="$ADMIN_USER" \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  "$CONTAINER" python - <<'PY'
import asyncio
import os
import sys

from sqlalchemy import text

from backend.core.database import engine
from backend.core.security import PasswordUtils

username = os.environ["ADMIN_USER"]
email = os.environ["ADMIN_EMAIL"]
full_name = os.environ["ADMIN_NAME"]
password = os.environ["ADMIN_PASSWORD"]


async def main() -> int:
    async with engine.begin() as conn:
        existing = await conn.execute(
            text("SELECT id FROM users WHERE username = :u OR email = :e"),
            {"u": username, "e": email},
        )
        if existing.first():
            print(f"Un utilisateur '{username}' ou '{email}' existe déjà : rien n'a été modifié.")
            return 1
        await conn.execute(
            text(
                "INSERT INTO users (username, email, full_name, role, password_hash, is_active) "
                "VALUES (:u, :e, :n, 'admin', :h, true)"
            ),
            {"u": username, "e": email, "n": full_name, "h": PasswordUtils.hash_password(password)},
        )
    await engine.dispose()
    print(f"Compte administrateur '{username}' créé.")
    return 0


sys.exit(asyncio.run(main()))
PY

unset ADMIN_PASSWORD CONFIRM
echo "Tu peux maintenant te connecter avec ce compte sur l'application."
