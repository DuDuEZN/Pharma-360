"""
Inventory Service for Pharmacie 360 Backend
Business logic for inventory and stock management with FEFO support
"""

from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ...models.batch import Batch
from ...models.category import Category
from ...models.movement import Movement
from ...models.product import Product
from ...models.supplier import Supplier
from .schemas import (
    InventoryItemResponse,
    InventorySummaryResponse,
    LowStockItemResponse,
    MovementCreate,
    MovementResponse,
    StockUpdate,
)


class InventoryService:
    """Service class for inventory operations with FEFO support"""

    @staticmethod
    async def get_inventory(
        db: AsyncSession,
        category: Optional[str] = None,
        low_stock_only: bool = False,
    ) -> List[InventoryItemResponse]:
        """Get all inventory items with stock levels"""
        query = (
            select(Product)
            .options(
                joinedload(Product.batches),
                joinedload(Product.category),
                joinedload(Product.supplier),
            )
            .order_by(asc(Product.name))
        )

        if category:
            query = query.join(Product.category).where(
                Category.name.ilike(f"%{category}%")
            )

        result = await db.execute(query)
        products = result.scalars().unique().all()

        inventory_items = []
        today = date.today()
        for product in products:
            sellable_batches = [
                batch
                for batch in product.batches
                if batch.status == "active" and batch.expiry_date >= today
            ]
            total_quantity = sum(int(batch.quantity or 0) for batch in sellable_batches)
            available_quantity = sum(
                int(batch.quantity or 0)
                - int(getattr(batch, "reserved_quantity", 0) or 0)
                for batch in sellable_batches
            )
            reserved_quantity = sum(
                int(getattr(batch, "reserved_quantity", 0) or 0)
                for batch in sellable_batches
            )
            bulk_quantity = sum(
                int(getattr(batch, "bulk_quantity", 0) or 0)
                for batch in sellable_batches
            )
            expired_quantity = sum(
                int(batch.quantity or 0)
                for batch in product.batches
                if batch.status == "active" and batch.expiry_date < today
            )

            if low_stock_only and total_quantity > 10 and bulk_quantity == 0:
                continue

            batches_data = [
                {
                    "batch_id": batch.id,
                    "batch_number": batch.batch_number,
                    "quantity": batch.quantity,
                    "available_quantity": batch.quantity
                    - getattr(batch, "reserved_quantity", 0),
                    "bulk_quantity": int(getattr(batch, "bulk_quantity", 0) or 0),
                    "expiry_date": batch.expiry_date,
                    "unit_price": (
                        float(batch.selling_price) if batch.selling_price else 0.0
                    ),
                    "location": batch.location,
                    "status": batch.status,
                    "is_expired": batch.is_expired,
                }
                for batch in product.batches
                if batch.status != "deleted"
            ]

            inventory_items.append(
                InventoryItemResponse(
                    product_id=product.id,
                    product_name=product.name,
                    product_code=product.code or str(product.id),
                    category_id=product.category_id,
                    category_name=product.category.name if product.category else None,
                    total_quantity=total_quantity,
                    expired_quantity=expired_quantity,
                    available_quantity=available_quantity,
                    reserved_quantity=reserved_quantity,
                    bulk_quantity=bulk_quantity,
                    unit_price=float(product.price) if product.price else 0.0,
                    location=batches_data[0]["location"] if batches_data else None,
                    supplier_id=product.supplier_id,
                    supplier_name=product.supplier.name if product.supplier else None,
                    batches=batches_data,
                )
            )

        return inventory_items

    @staticmethod
    async def get_inventory_by_product(
        product_id: int, db: AsyncSession
    ) -> Optional[InventoryItemResponse]:
        """Get inventory for a specific product"""
        result = await db.execute(
            select(Product)
            .where(Product.id == product_id)
            .options(
                joinedload(Product.batches),
                joinedload(Product.category),
                joinedload(Product.supplier),
            )
        )
        product = result.scalars().unique().one_or_none()

        if not product:
            return None

        today = date.today()
        sellable_batches = [
            batch
            for batch in product.batches
            if batch.status == "active" and batch.expiry_date >= today
        ]
        total_quantity = sum(int(batch.quantity or 0) for batch in sellable_batches)
        available_quantity = sum(
            int(batch.quantity or 0)
            - int(getattr(batch, "reserved_quantity", 0) or 0)
            for batch in sellable_batches
        )
        reserved_quantity = sum(
            int(getattr(batch, "reserved_quantity", 0) or 0)
            for batch in sellable_batches
        )
        bulk_quantity = sum(
            int(getattr(batch, "bulk_quantity", 0) or 0)
            for batch in sellable_batches
        )
        expired_quantity = sum(
            int(batch.quantity or 0)
            for batch in product.batches
            if batch.status == "active" and batch.expiry_date < today
        )

        batches_data = [
            {
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "quantity": batch.quantity,
                "available_quantity": batch.quantity
                - getattr(batch, "reserved_quantity", 0),
                "bulk_quantity": int(getattr(batch, "bulk_quantity", 0) or 0),
                "expiry_date": batch.expiry_date,
                "unit_price": (
                    float(batch.selling_price) if batch.selling_price else 0.0
                ),
                "location": batch.location,
                "status": batch.status,
                "is_expired": batch.is_expired,
            }
            for batch in product.batches
            if batch.status != "deleted"
        ]

        return InventoryItemResponse(
            product_id=product.id,
            product_name=product.name,
            product_code=product.code or str(product.id),
            category_id=product.category_id,
            category_name=product.category.name if product.category else None,
            total_quantity=total_quantity,
            expired_quantity=expired_quantity,
            available_quantity=available_quantity,
            reserved_quantity=reserved_quantity,
            bulk_quantity=bulk_quantity,
            unit_price=float(product.price) if product.price else 0.0,
            location=batches_data[0]["location"] if batches_data else None,
            supplier_id=product.supplier_id,
            supplier_name=product.supplier.name if product.supplier else None,
            batches=batches_data,
        )

    @staticmethod
    async def update_inventory(
        product_id: int, update_data: StockUpdate, db: AsyncSession
    ) -> Optional[InventoryItemResponse]:
        """Update inventory for a product"""
        result = await db.execute(
            select(Product)
            .where(Product.id == product_id)
            .options(joinedload(Product.batches))
        )
        product = result.scalars().unique().one_or_none()

        if not product:
            return None

        # Update product location if provided
        if update_data.location:
            product.location = update_data.location

        # Update all batches location
        if update_data.location:
            for batch in product.batches:
                batch.location = update_data.location

        # If quantity is provided, update the first batch (or create one)
        if update_data.quantity is not None:
            if product.batches:
                # Update the first batch
                product.batches[0].quantity = update_data.quantity
            else:
                # Create a new batch
                import uuid

                new_batch = Batch(
                    product_id=product_id,
                    batch_number=f"BATCH-{uuid.uuid4().hex[:8]}",
                    quantity=update_data.quantity,
                    initial_quantity=update_data.quantity,
                    location=update_data.location or "default",
                    expiry_date=date.today() + timedelta(days=365),
                )
                product.batches.append(new_batch)

        await db.flush()
        await db.refresh(product)

        return await InventoryService.get_inventory_by_product(product_id, db)

    @staticmethod
    async def get_low_stock_items(
        threshold: int = 10, db: AsyncSession = None
    ) -> List[LowStockItemResponse]:
        """Get products with low stock levels"""
        result = await db.execute(
            select(Product)
            .options(joinedload(Product.category), joinedload(Product.supplier))
            .order_by(asc(Product.name))
        )
        products = result.scalars().unique().all()

        low_stock_items = []
        for product in products:
            total_quantity = product.current_stock
            bulk_quantity = product.current_bulk_stock
            # Un produit dont il reste des unités de vrac n'est pas en rupture.
            if total_quantity <= threshold and bulk_quantity == 0:
                low_stock_items.append(
                    LowStockItemResponse(
                        product_id=product.id,
                        product_name=product.name,
                        product_code=product.code or str(product.id),
                        current_quantity=total_quantity,
                        threshold=threshold,
                        category_name=(
                            product.category.name if product.category else None
                        ),
                        supplier_name=(
                            product.supplier.name if product.supplier else None
                        ),
                    )
                )

        return low_stock_items

    @staticmethod
    async def get_expiring_soon_batches(
        expiry_date: date, db: AsyncSession
    ) -> List[dict]:
        """Get batches that are expiring soon (FEFO priority)"""
        result = await db.execute(
            select(Batch)
            .where(
                Batch.expiry_date <= expiry_date,
                Batch.expiry_date >= date.today(),
                Batch.status == "active",
                Batch.quantity > 0,
            )
            .order_by(asc(Batch.expiry_date))
            .options(joinedload(Batch.product))
        )
        batches = result.scalars().unique().all()

        return [
            {
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "product_id": batch.product_id,
                "product_name": batch.product.name if batch.product else "Unknown",
                "quantity": batch.quantity,
                "expiry_date": batch.expiry_date,
                "days_until_expiry": (batch.expiry_date - date.today()).days,
                "location": batch.location,
            }
            for batch in batches
        ]

    @staticmethod
    async def get_inventory_by_category(
        category_id: int, db: AsyncSession
    ) -> List[InventoryItemResponse]:
        """Get inventory filtered by category"""
        result = await db.execute(
            select(Product)
            .where(Product.category_id == category_id)
            .options(
                joinedload(Product.batches),
                joinedload(Product.category),
                joinedload(Product.supplier),
            )
            .order_by(asc(Product.name))
        )
        products = result.scalars().unique().all()

        return await InventoryService._convert_products_to_inventory(products)

    @staticmethod
    async def get_inventory_by_location(
        location: str, db: AsyncSession
    ) -> List[InventoryItemResponse]:
        """Get inventory by storage location"""
        result = await db.execute(
            select(Product)
            .join(Product.batches)
            .where(Batch.location == location)
            .options(
                joinedload(Product.batches),
                joinedload(Product.category),
                joinedload(Product.supplier),
            )
            .distinct()
            .order_by(asc(Product.name))
        )
        products = result.scalars().unique().all()

        return await InventoryService._convert_products_to_inventory(products)

    @staticmethod
    async def get_inventory_summary(db: AsyncSession) -> InventorySummaryResponse:
        """Get overall inventory statistics"""
        today = date.today()

        # Count total products
        result = await db.execute(select(func.count(Product.id)))
        total_products = int(result.scalar() or 0)

        sellable_filter = (
            Batch.status == "active",
            Batch.expiry_date >= today,
        )

        # Quantité vendable (lots actifs non périmés)
        result = await db.execute(
            select(func.coalesce(func.sum(Batch.quantity), 0)).where(*sellable_filter)
        )
        total_quantity = int(result.scalar() or 0)

        # Unités de vrac déjà reconditionnées (vendables à l'unité)
        result = await db.execute(
            select(func.coalesce(func.sum(Batch.bulk_quantity), 0)).where(
                *sellable_filter
            )
        )
        total_bulk_quantity = int(result.scalar() or 0)

        # Calculate total value (hors périmés)
        result = await db.execute(
            select(
                func.coalesce(func.sum(Batch.quantity * Batch.selling_price), 0)
            ).where(*sellable_filter)
        )
        total_value = float(result.scalar() or 0)

        # Périmés : valeur et quantité encore présentes en stock
        result = await db.execute(
            select(
                func.coalesce(func.sum(Batch.quantity), 0),
                func.coalesce(func.sum(Batch.quantity * Batch.selling_price), 0),
                func.count(func.distinct(Batch.product_id)),
                func.count(Batch.id),
            ).where(
                Batch.status == "active",
                Batch.expiry_date < today,
                Batch.quantity > 0,
            )
        )
        expired_row = result.one()
        expired_quantity = int(expired_row[0] or 0)
        expired_value = float(expired_row[1] or 0)
        expired_products_count = int(expired_row[2] or 0)
        expired_batches_count = int(expired_row[3] or 0)

        # Count low stock items + valeur du vrac
        low_stock_count = 0
        total_bulk_value = 0.0
        result = await db.execute(select(Product))
        products = result.scalars().unique().all()
        for product in products:
            total_qty = product.current_stock
            product_bulk_qty = product.current_bulk_stock
            if total_qty <= 10 and product_bulk_qty == 0:
                low_stock_count += 1
            if product_bulk_qty:
                total_bulk_value += product_bulk_qty * float(product.bulk_unit_price)

        # Count expiring soon items (périmés exclus)
        expiry_date = today + timedelta(days=30)
        result = await db.execute(
            select(func.count(Batch.id)).where(
                Batch.expiry_date <= expiry_date,
                Batch.expiry_date >= today,
                Batch.status == "active",
                Batch.quantity > 0,
            )
        )
        expiring_soon_count = int(result.scalar() or 0)

        # Get breakdown by category (hors périmés)
        result = await db.execute(
            select(
                Category.id,
                Category.name,
                func.coalesce(func.sum(Batch.quantity), 0),
            )
            .join(Product, Product.category_id == Category.id)
            .join(Batch, Batch.product_id == Product.id)
            .where(*sellable_filter)
            .group_by(Category.id, Category.name)
        )
        categories = [
            {"id": row[0], "name": row[1], "quantity": int(row[2])}
            for row in result.all()
        ]

        # Get breakdown by location (hors périmés)
        result = await db.execute(
            select(Batch.location, func.coalesce(func.sum(Batch.quantity), 0))
            .where(*sellable_filter)
            .group_by(Batch.location)
            .having(Batch.location.isnot(None))
        )
        locations = [
            {"location": row[0], "quantity": int(row[1])} for row in result.all()
        ]

        return InventorySummaryResponse(
            total_products=total_products,
            total_quantity=total_quantity,
            total_bulk_quantity=total_bulk_quantity,
            total_value=total_value,
            total_bulk_value=total_bulk_value,
            low_stock_count=low_stock_count,
            expiring_soon_count=expiring_soon_count,
            expired_batches_count=expired_batches_count,
            expired_products_count=expired_products_count,
            expired_quantity=expired_quantity,
            expired_value=expired_value,
            categories=categories,
            locations=locations,
        )

    @staticmethod
    async def get_expired_batches(db: AsyncSession) -> List[dict]:
        """Liste les lots actuellement périmés (encore en stock, avant retrait)."""
        today = date.today()
        result = await db.execute(
            select(Batch)
            .where(
                Batch.status == "active",
                Batch.expiry_date < today,
                Batch.quantity > 0,
            )
            .options(joinedload(Batch.product))
            .order_by(asc(Batch.expiry_date))
        )
        batches = result.scalars().unique().all()
        return [
            {
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "product_id": batch.product_id,
                "product_name": batch.product.name if batch.product else None,
                "product_code": (
                    (batch.product.code or str(batch.product.id))
                    if batch.product
                    else None
                ),
                "quantity": int(batch.quantity or 0),
                "bulk_quantity": int(batch.bulk_quantity or 0),
                "expiry_date": batch.expiry_date,
                "days_until_expiry": (batch.expiry_date - today).days,
                "location": batch.location,
                "value": float(
                    (batch.quantity or 0) * (batch.selling_price or 0)
                ),
            }
            for batch in batches
        ]

    @staticmethod
    async def get_expired_history(
        db: AsyncSession, limit: int = 100, offset: int = 0
    ) -> List[dict]:
        """Historique des produits périmés sortis du stock."""
        from ...models.audit_log import ExpiredProductLog

        result = await db.execute(
            select(ExpiredProductLog)
            .order_by(desc(ExpiredProductLog.created_at))
            .limit(limit)
            .offset(offset)
        )
        entries = result.scalars().all()
        return [
            {
                "id": entry.id,
                "product_id": entry.product_id,
                "batch_id": entry.batch_id,
                "batch_number": entry.batch_number,
                "quantity": entry.quantity,
                "expiry_date": entry.expiry_date,
                "user_id": entry.user_id,
                "reason": entry.reason,
                "created_at": entry.created_at,
            }
            for entry in entries
        ]

    @staticmethod
    async def _convert_products_to_inventory(
        products: List[Product],
    ) -> List[InventoryItemResponse]:
        """Helper method to convert products to inventory items"""
        inventory_items = []
        today = date.today()
        for product in products:
            sellable_batches = [
                batch
                for batch in product.batches
                if batch.status == "active" and batch.expiry_date >= today
            ]
            total_quantity = sum(int(batch.quantity or 0) for batch in sellable_batches)
            available_quantity = sum(
                int(batch.quantity or 0)
                - int(getattr(batch, "reserved_quantity", 0) or 0)
                for batch in sellable_batches
            )
            reserved_quantity = sum(
                int(getattr(batch, "reserved_quantity", 0) or 0)
                for batch in sellable_batches
            )
            bulk_quantity = sum(
                int(getattr(batch, "bulk_quantity", 0) or 0)
                for batch in sellable_batches
            )
            expired_quantity = sum(
                int(batch.quantity or 0)
                for batch in product.batches
                if batch.status == "active" and batch.expiry_date < today
            )

            batches_data = [
                {
                    "batch_id": batch.id,
                    "batch_number": batch.batch_number,
                    "quantity": batch.quantity,
                    "available_quantity": batch.quantity
                    - getattr(batch, "reserved_quantity", 0),
                    "bulk_quantity": int(getattr(batch, "bulk_quantity", 0) or 0),
                    "expiry_date": batch.expiry_date,
                    "unit_price": (
                        float(batch.selling_price) if batch.selling_price else 0.0
                    ),
                    "location": batch.location,
                    "status": batch.status,
                    "is_expired": batch.is_expired,
                }
                for batch in product.batches
                if batch.status != "deleted"
            ]

            inventory_items.append(
                InventoryItemResponse(
                    product_id=product.id,
                    product_name=product.name,
                    product_code=product.code or str(product.id),
                    category_id=product.category_id,
                    category_name=product.category.name if product.category else None,
                    total_quantity=total_quantity,
                    expired_quantity=expired_quantity,
                    available_quantity=available_quantity,
                    reserved_quantity=reserved_quantity,
                    bulk_quantity=bulk_quantity,
                    unit_price=float(product.price) if product.price else 0.0,
                    location=batches_data[0]["location"] if batches_data else None,
                    supplier_id=product.supplier_id,
                    supplier_name=product.supplier.name if product.supplier else None,
                    batches=batches_data,
                )
            )

        return inventory_items


# Singleton instance
inventory_service = InventoryService()
