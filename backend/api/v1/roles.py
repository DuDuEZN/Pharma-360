"""
Roles & Permissions API Endpoints for Pharmacie 360 Backend
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role
from ...models.user import User
from ...models.role import Role
from ...models.permission import Permission, RolePermission

router = APIRouter(tags=["roles"])


class PermissionOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class RoleIn(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[int] = []


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: List[int] = []

    class Config:
        from_attributes = True


DEFAULT_PERMISSIONS = [
    ("view_users", "Voir les utilisateurs", "Utilisateurs"),
    ("create_user", "Créer un utilisateur", "Utilisateurs"),
    ("edit_user", "Modifier un utilisateur", "Utilisateurs"),
    ("delete_user", "Supprimer un utilisateur", "Utilisateurs"),
    ("view_products", "Voir les produits", "Produits"),
    ("create_product", "Créer un produit", "Produits"),
    ("edit_product", "Modifier un produit", "Produits"),
    ("delete_product", "Supprimer un produit", "Produits"),
    ("view_sales", "Voir les ventes", "Ventes"),
    ("create_sale", "Créer une vente", "Ventes"),
    ("cancel_sale", "Annuler une vente", "Ventes"),
    ("view_inventory", "Voir l'inventaire", "Stock"),
    ("adjust_stock", "Ajuster le stock", "Stock"),
    ("remove_expired", "Retirer les périmés", "Stock"),
    ("view_reports", "Voir les rapports", "Rapports"),
    ("export_reports", "Exporter les rapports", "Rapports"),
    ("view_settings", "Voir les paramètres", "Paramètres"),
    ("edit_settings", "Modifier les paramètres", "Paramètres"),
    ("view_roles", "Voir les rôles", "Rôles"),
    ("manage_roles", "Gérer les rôles", "Rôles"),
]


DEFAULT_ROLE_PERMISSIONS = {
    "admin": None,  # all
    "manager": ["view_products", "view_sales", "view_inventory", "adjust_stock", "remove_expired", "view_reports", "export_reports", "view_settings", "edit_settings"],
    "seller": ["view_products", "view_sales", "create_sale", "view_inventory"],
    "cashier": ["view_sales", "create_sale"],
}


async def _seed(db: AsyncSession):
    # Permissions
    existing = (await db.execute(select(Permission))).scalars().all()
    if not existing:
        for name, desc, cat in DEFAULT_PERMISSIONS:
            db.add(Permission(name=name, description=desc, category=cat))
        await db.commit()
    perms = (await db.execute(select(Permission))).scalars().all()
    perm_map = {p.name: p.id for p in perms}

    # Roles
    roles = (await db.execute(select(Role))).scalars().all()
    if not roles:
        for rname in ("admin", "manager", "seller", "cashier"):
            db.add(Role(name=rname, description=rname.capitalize()))
        await db.commit()
        roles = (await db.execute(select(Role))).scalars().all()

    # Link permissions
    for role in roles:
        existing_links = (await db.execute(
            select(RolePermission).where(RolePermission.role_id == role.id)
        )).scalars().all()
        if existing_links:
            continue
        allowed = DEFAULT_ROLE_PERMISSIONS.get(role.name)
        if allowed is None:
            # admin: all permissions
            to_link = list(perm_map.values())
        else:
            to_link = [perm_map[n] for n in allowed if n in perm_map]
        for pid in to_link:
            db.add(RolePermission(role_id=role.id, permission_id=pid))
        await db.commit()


@router.get("/permissions")
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _seed(db)
    perms = (await db.execute(select(Permission).order_by(Permission.category, Permission.name))).scalars().all()
    return {"permissions": [
        {"id": p.id, "name": p.name, "description": p.description, "category": p.category} for p in perms
    ]}


@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _seed(db)
    roles = (await db.execute(select(Role))).scalars().all()
    out = []
    for role in roles:
        links = (await db.execute(
            select(RolePermission.permission_id).where(RolePermission.role_id == role.id)
        )).scalars().all()
        out.append({"id": role.id, "name": role.name, "description": role.description, "permissions": list(links)})
    return {"roles": out}


@router.post("/roles")
async def create_role(
    data: RoleIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"])),
):
    await _seed(db)
    role = Role(name=data.name, description=data.description)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    for pid in (data.permissions or []):
        db.add(RolePermission(role_id=role.id, permission_id=pid))
    await db.commit()
    links = (await db.execute(
        select(RolePermission.permission_id).where(RolePermission.role_id == role.id)
    )).scalars().all()
    return {"id": role.id, "name": role.name, "description": role.description, "permissions": list(links)}


@router.put("/roles/{role_id}")
async def update_role(
    role_id: int,
    data: RoleIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"])),
):
    await _seed(db)
    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rôle introuvable")
    role.name = data.name
    role.description = data.description
    # reset permissions
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    for pid in (data.permissions or []):
        db.add(RolePermission(role_id=role_id, permission_id=pid))
    await db.commit()
    links = (await db.execute(
        select(RolePermission.permission_id).where(RolePermission.role_id == role_id)
    )).scalars().all()
    return {"id": role.id, "name": role.name, "description": role.description, "permissions": list(links)}


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"])),
):
    await _seed(db)
    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rôle introuvable")
    if role.name in ("admin", "manager", "seller", "cashier"):
        raise HTTPException(status_code=400, detail="Impossible de supprimer un rôle système")
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    await db.delete(role)
    await db.commit()
    return {"message": "Rôle supprimé"}
