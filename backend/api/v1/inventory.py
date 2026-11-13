"""
Inventory API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for inventory and stock management
"""

from datetime import date, timedelta
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import csv
import io

from ...core.database import get_db
from ...core.logging import get_logger
from ...models.batch import Batch
from ...models.movement import Movement
from ...models.product import Product
from ...models.user import User
from ...schemas.inventory import (
    InventoryItemResponse,
    InventorySummaryResponse,
    LowStockItemResponse,
    MovementCreate,
    MovementResponse,
    StockUpdate,
)
from ...services.inventory_service import InventoryService
from ...core.security import RBACUtils, get_current_user

# Create router
router = APIRouter(prefix="/inventory", tags=["inventory"])

logger = get_logger(__name__)


def _require_stock_manager(current_user: User):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestionnaire de stock ou admin requis",
        )


@router.get(
    "/",
    summary="Get all inventory items",
    description="Get a list of all inventory items with stock levels",
)
async def get_inventory(
    category: Annotated[Optional[str], Query()] = None,
    low_stock_only: Annotated[bool, Query()] = False,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory endpoint"""
    inventory = await InventoryService.get_inventory(
        db=db, category=category, low_stock_only=low_stock_only
    )
    return inventory


@router.get(
    "/product/{product_id}",
    summary="Get inventory for a specific product",
    description="Get detailed inventory information for a specific product",
)
async def get_inventory_by_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by product endpoint"""
    inventory = await InventoryService.get_inventory_by_product(product_id, db)
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return inventory


@router.put(
    "/product/{product_id}",
    summary="Update inventory for a product",
    description="Update stock quantity and location for a product",
)
async def update_inventory(
    product_id: int,
    update_data: StockUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update inventory endpoint"""
    inventory = await InventoryService.update_inventory(product_id, update_data, db)
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return inventory


@router.get(
    "/low-stock",
    summary="Get low stock items",
    description="Get a list of products with low stock levels",
)
async def get_low_stock_items(
    threshold: Annotated[int, Query(ge=1)] = 10,
    db: AsyncSession = Depends(get_db),
):
    """Get low stock items endpoint"""
    items = await InventoryService.get_low_stock_items(threshold, db)
    return items


@router.get(
    "/expiring-soon",
    summary="Get items expiring soon",
    description="Get a list of batches that are expiring soon (FEFO priority)",
)
async def get_expiring_soon_items(
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get expiring soon items endpoint"""
    expiry_date = date.today() + timedelta(days=days)
    batches = await InventoryService.get_expiring_soon_batches(expiry_date, db)
    return batches


@router.get(
    "/by-category/{category_id}",
    summary="Get inventory by category",
    description="Get inventory filtered by category",
)
async def get_inventory_by_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by category endpoint"""
    inventory = await InventoryService.get_inventory_by_category(category_id, db)
    return inventory


@router.get(
    "/summary",
    summary="Get inventory summary",
    description="Get overall inventory statistics",
)
async def get_inventory_summary(
    db: AsyncSession = Depends(get_db),
):
    """Get inventory summary endpoint"""
    summary = await InventoryService.get_inventory_summary(db)
    return summary


@router.get(
    "/location/{location}",
    summary="Get inventory by location",
    description="Get inventory items stored at a specific location",
)
async def get_inventory_by_location(
    location: str,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by location endpoint"""
    inventory = await InventoryService.get_inventory_by_location(location, db)
    return inventory


# ============ Stock Management Endpoints (Gestionnaire + Admin) ============

@router.post(
    "/adjust",
    summary="Réajustement de stock",
    description="Réajuste le stock d'un lot après inventaire (gestionnaire ou admin uniquement)",
)
async def adjust_stock(
    movement: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Réajuste le stock d'un lot avec création d'un mouvement de stock"""
    _require_stock_manager(current_user)

    result = await db.execute(select(Batch).where(Batch.id == movement.batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    old_quantity = batch.quantity
    new_quantity = movement.quantity

    batch.quantity = new_quantity
    batch.initial_quantity = new_quantity

    # Create movement record
    db_movement = Movement(
        type="adjustment",
        product_id=batch.product_id,
        batch_id=batch.id,
        old_quantity=old_quantity,
        new_quantity=new_quantity,
        quantity_change=new_quantity - old_quantity,
        user_id=current_user.id,
        reason=movement.reason,
        notes=movement.notes,
    )
    db.add(db_movement)
    await db.commit()

    return {"status": "success", "old_quantity": old_quantity, "new_quantity": new_quantity}


@router.post(
    "/remove-expired",
    summary="Retirer produits périmés",
    description="Retire du stock tous les lots périmés (gestionnaire ou admin uniquement)",
)
async def remove_expired_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retire les lots périmés du stock"""
    _require_stock_manager(current_user)

    today = date.today()
    result = await db.execute(
        select(Batch).where(
            and_(Batch.status == "active", Batch.expiry_date < today)
        )
    )
    expired_batches = result.scalars().all()

    removed_count = 0
    removed_quantity = 0
    for batch in expired_batches:
        removed_quantity += batch.quantity
        batch.quantity = 0
        batch.status = "expired"

        db_movement = Movement(
            type="out",
            product_id=batch.product_id,
            batch_id=batch.id,
            old_quantity=batch.quantity,
            new_quantity=0,
            quantity_change=-batch.quantity,
            user_id=current_user.id,
            reason="Retrait produit périmé",
            notes=f"Lot {batch.batch_number} périmé le {batch.expiry_date}",
        )
        db.add(db_movement)
        removed_count += 1

    await db.commit()

    return {
        "status": "success",
        "batches_removed": removed_count,
        "quantity_removed": removed_quantity,
    }


@router.post(
    "/import",
    summary="Import stock par fichier CSV",
    description="Importe des entrées de stock via un fichier CSV (gestionnaire ou admin uniquement)",
)
async def import_stock_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importe des mises à jour de stock depuis un fichier CSV"""
    _require_stock_manager(current_user)

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    required_columns = {"product_id", "batch_number", "quantity", "expiry_date"}
    if not required_columns.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes requises : {', '.join(required_columns)}",
        )

    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            product_id = int(row["product_id"])
            batch_number = row["batch_number"].strip()
            quantity = int(row["quantity"])
            expiry_date = date.fromisoformat(row["expiry_date"].strip())
            location = row.get("location", "").strip() or None

            # Verify product exists
            prod_result = await db.execute(select(Product).where(Product.id == product_id))
            product = prod_result.scalar_one_or_none()
            if not product:
                errors.append(f"Ligne {row_num}: Produit {product_id} introuvable")
                continue

            # Check for duplicate batch number
            existing = await db.execute(
                select(Batch).where(Batch.batch_number == batch_number)
            )
            if existing.scalar_one_or_none():
                errors.append(f"Ligne {row_num}: Lot {batch_number} existe déjà")
                continue

            batch = Batch(
                product_id=product_id,
                batch_number=batch_number,
                quantity=quantity,
                initial_quantity=quantity,
                expiry_date=expiry_date,
                location=location or "Réception",
                received_date=date.today(),
                supplier_id=product.supplier_id,
                cost_price=float(product.cost_price if product.cost_price else 0),
                selling_price=float(product.price if product.price else 0),
                status="active",
            )
            db.add(batch)

            db_movement = Movement(
                type="in",
                product_id=product_id,
                batch_id=batch.id,
                old_quantity=0,
                new_quantity=quantity,
                quantity_change=quantity,
                user_id=current_user.id,
                reason="Import fichier stock",
                notes=f"Importé depuis {file.filename}",
            )
            db.add(db_movement)
            imported += 1

        except Exception as e:
            errors.append(f"Ligne {row_num}: {str(e)}")

    await db.commit()

    return {
        "status": "success",
        "imported": imported,
        "errors": errors,
    }
