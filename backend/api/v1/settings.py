"""
Settings API Endpoints for Pharmacie 360 Backend
Provides system settings management (GET/PUT) and backup listing (GET).
Settings are persisted server-side in a JSON file for simplicity.
"""
import json
import os
from datetime import datetime
from typing import Annotated, Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger(__name__)

# Simple file-based settings store (single instance, no DB table needed)
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "settings.json")


def _load_settings() -> Dict[str, Any]:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_settings(data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all system settings."""
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin required",
        )
    return _load_settings()


@router.put("")
async def update_settings(
    settings: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update system settings."""
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin required",
        )
    current = _load_settings()
    current.update(settings)
    current["updated_at"] = datetime.utcnow().isoformat()
    current["updated_by"] = current_user.username
    _save_settings(current)
    return {"status": "success", "message": "Paramètres sauvegardés"}


@router.get("/backups")
async def list_backups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available database backups."""
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin required",
        )
    backups_dir = os.path.join(os.path.dirname(__file__), "..", "..", "backups")
    backups = []
    if os.path.exists(backups_dir):
        for fname in sorted(os.listdir(backups_dir)):
            fpath = os.path.join(backups_dir, fname)
            if os.path.isfile(fpath):
                stat = os.stat(fpath)
                backups.append({
                    "name": fname,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                })
    return {"backups": backups}
