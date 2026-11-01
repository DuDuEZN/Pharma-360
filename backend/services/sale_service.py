"""
Sale Service for Pharmacie 360 Backend
Handles sale creation, FEFO batch selection, and sale processing
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.batch import Batch
from ..models.customer import Customer
from ..models.movement import Movement
from ..models.product import Product
from ..models.sale import Sale
from ..models.sale_item import SaleItem
from ..models.user import User
from ..schemas.sale import (QueueItem, SaleCreate, SaleDetailResponse,
                            SaleListResponse, SalePaymentResponse,
                            SaleResponse, SaleValidationResponse)
from ..services.product_service import ProductService


class SaleService:
    """Service for handling sale operations"""

    @staticmethod
    async def create_sale(
        sale_data: SaleCreate, db: AsyncSession, current_user: User
    ) -> SaleValidationResponse:
        """
        Create a new sale with FEFO batch selection

        Workflow:
        1. Validate all items have valid batches
        2. Check stock availability
        3. Reserve stock (temporarily)
        4. Create sale record
        5. Create sale items
        6. Create movement records
        """
        # Validate items and select FEFO batches
        validated_items = []
        errors = []

        for item in sale_data.items:
            # Get product
            product = await ProductService.get_product_by_id(item.product_id, db)
            if not product:
                errors.append(f"Produit {item.product_id} non trouvé")
                continue

            # Get FEFO batch
            batch = await ProductService.get_fefo_batch(
                item.product_id, item.quantity, db
            )

            if not batch:
                errors.append(
                    f"Produit {product.name}: pas de lot disponible "
                    f"avec quantité suffisante ({item.quantity} demandé)"
                )
                continue

            # Validate batch belongs to product
            if batch.product_id != item.product_id:
                errors.append(
                    f"Produit {product.name}: lot {batch.batch_number} "
                    f"n'appartient pas à ce produit"
                )
                continue

            # Check if batch has enough stock
            if batch.quantity < item.quantity:
                errors.append(
                    f"Produit {product.name}, lot {batch.batch_number}: "
                    f"stock insuffisant ({batch.quantity} disponible, "
                    f"{item.quantity} demandé)"
                )
                continue

            # Check if batch is expired
            if batch.is_expired:
                errors.append(
                    f"Produit {product.name}, lot {batch.batch_number}: "
                    f"lot périmé (date: {batch.expiry_date})"
                )
                continue

            # All validations passed
            validated_items.append({"item": item, "product": product, "batch": batch})

        # If there are errors, return them
        if errors:
            return SaleValidationResponse(
                success=False, sale_id=None, sale_number=None, errors=errors
            )

        # If no valid items, return error
        if not validated_items:
            return SaleValidationResponse(
                success=False,
                sale_id=None,
                sale_number=None,
                errors=["Aucun article valide dans la vente"],
            )

        # Generate sale number
        from datetime import datetime

        sale_number = f"SALE-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        # Create sale
        new_sale = Sale(
            sale_number=sale_number,
            customer_id=sale_data.customer_id,
            user_id=current_user.id,
            status="pending",
            subtotal=0.00,
            tax_amount=0.00,
            discount=0.00,
            total=0.00,
            payment_method=None,
            notes=sale_data.notes,
        )

        db.add(new_sale)
        await db.flush()
        await db.refresh(new_sale)

        # Create sale items and reserve stock
        total_subtotal = 0.00
        for validated_item in validated_items:
            item = validated_item["item"]
            product = validated_item["product"]
            batch = validated_item["batch"]

            # Calculate prices
            unit_price = float(item.unit_price)
            total_price = unit_price * item.quantity
            total_subtotal += total_price

            # Create sale item
            sale_item = SaleItem(
                sale_id=new_sale.id,
                batch_id=batch.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=unit_price,
                total_price=total_price,
                expiry_date=batch.expiry_date,
            )

            db.add(sale_item)

            # Reserve stock (temporarily)
            batch.quantity -= item.quantity

            # Create movement record for reservation
            movement = Movement(
                type="sale",
                reference_id=new_sale.id,
                reference_type="sale",
                product_id=product.id,
                batch_id=batch.id,
                old_quantity=batch.quantity + item.quantity,
                new_quantity=batch.quantity,
                quantity_change=-item.quantity,
                user_id=current_user.id,
                notes=f"Réservation temporaire pour vente {new_sale.sale_number}",
            )

            db.add(movement)

        # Update sale totals
        new_sale.subtotal = total_subtotal
        new_sale.tax_amount = 0.00  # Will be calculated later
        new_sale.discount = 0.00
        new_sale.total = total_subtotal

        await db.flush()
        await db.refresh(new_sale)

        return SaleValidationResponse(
            success=True,
            sale_id=new_sale.id,
            sale_number=new_sale.sale_number,
            errors=[],
        )

    @staticmethod
    async def get_sale_by_id(sale_id: int, db: AsyncSession) -> Optional[Sale]:
        """Get sale by ID"""
        result = await db.execute(select(Sale).where(Sale.id == sale_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_sale_by_number(sale_number: str, db: AsyncSession) -> Optional[Sale]:
        """Get sale by sale number"""
        result = await db.execute(select(Sale).where(Sale.sale_number == sale_number))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_sales(
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        db: AsyncSession = None,
    ) -> SaleListResponse:
        """List sales with pagination and filters"""
        from datetime import datetime

        from sqlalchemy import Date, func

        offset = (page - 1) * page_size

        # Build query
        query = select(Sale)
        count_query = select(func.count()).select_from(Sale)

        # Apply filters
        if status:
            query = query.where(Sale.status == status)
            count_query = count_query.where(Sale.status == status)

        if user_id:
            query = query.where(Sale.user_id == user_id)
            count_query = count_query.where(Sale.user_id == user_id)

        if customer_id:
            query = query.where(Sale.customer_id == customer_id)
            count_query = count_query.where(Sale.customer_id == customer_id)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                query = query.where(func.date(Sale.created_at) >= from_date)
                count_query = count_query.where(func.date(Sale.created_at) >= from_date)
            except:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                query = query.where(func.date(Sale.created_at) <= to_date)
                count_query = count_query.where(func.date(Sale.created_at) <= to_date)
            except:
                pass

        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Execute main query
        query = query.offset(offset).limit(page_size).order_by(Sale.created_at.desc())
        result = await db.execute(query)
        sales = result.scalars().all()

        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size

        # Convert to response objects
        sale_responses = []
        for sale in sales:
            response = SaleResponse.model_validate(sale)

            # Add computed fields
            response.customer_name = sale.customer.name if sale.customer else None
            response.user_name = sale.user.username
            response.is_pending = sale.is_pending
            response.is_paid = sale.is_paid
            response.is_cancelled = sale.is_cancelled
            response.is_refunded = sale.is_refunded
            response.item_count = sale.item_count
            response.total_items = sale.total_items

            sale_responses.append(response)

        return SaleListResponse(
            sales=sale_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    async def get_pending_sales(db: AsyncSession) -> list[Sale]:
        """Get all pending sales (for cashier queue)"""
        result = await db.execute(
            select(Sale).where(Sale.status == "pending").order_by(Sale.created_at.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def validate_payment(
        sale_id: int,
        payment_method: str,
        payment_reference: Optional[str] = None,
        db: AsyncSession = None,
        current_user: User = None,
    ) -> SalePaymentResponse:
        """Validate payment and finalize sale"""
        sale = await SaleService.get_sale_by_id(sale_id, db)

        if not sale:
            return SalePaymentResponse(
                success=False,
                sale_id=sale_id,
                sale_number=None,
                payment_date=None,
                error="Vente non trouvée",
            )

        if sale.status != "pending":
            return SalePaymentResponse(
                success=False,
                sale_id=sale_id,
                sale_number=sale.sale_number,
                payment_date=None,
                error=f"La vente ne peut pas être validée (statut: {sale.status})",
            )

        # Update sale status
        sale.status = "paid"
        sale.payment_method = payment_method
        sale.payment_reference = payment_reference
        sale.payment_date = datetime.now(timezone.utc)

        # Update batch quantities (final deduction)
        result = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale.id))
        sale_items = result.scalars().all()

        for item in sale_items:
            # Get batch and update movement to reflect final sale
            result = await db.execute(select(Batch).where(Batch.id == item.batch_id))
            batch = result.scalar_one_or_none()

            if batch:
                # Create final movement record
                movement = Movement(
                    type="sale",
                    reference_id=sale.id,
                    reference_type="sale",
                    product_id=item.product_id,
                    batch_id=batch.id,
                    old_quantity=batch.quantity + item.quantity,
                    new_quantity=batch.quantity,
                    quantity_change=-item.quantity,
                    user_id=current_user.id,
                    notes=f"Vente finalisée {sale.sale_number} - paiement validé",
                )

                db.add(movement)

        await db.flush()
        await db.refresh(sale)

        return SalePaymentResponse(
            success=True,
            sale_id=sale.id,
            sale_number=sale.sale_number,
            payment_date=sale.payment_date,
            error=None,
        )

    @staticmethod
    async def cancel_sale(sale_id: int, db: AsyncSession, current_user: User) -> bool:
        """Cancel a sale and restore stock"""
        sale = await SaleService.get_sale_by_id(sale_id, db)

        if not sale:
            return False

        if sale.status != "pending":
            return False

        # Restore stock from all items
        result = await db.execute(select(SaleItem).where(SaleItem.sale_id == sale.id))
        sale_items = result.scalars().all()

        for item in sale_items:
            # Get batch and restore quantity
            result = await db.execute(select(Batch).where(Batch.id == item.batch_id))
            batch = result.scalar_one_or_none()

            if batch:
                batch.quantity += item.quantity

                # Create movement record for stock restoration
                movement = Movement(
                    type="return",
                    reference_id=sale.id,
                    reference_type="sale",
                    product_id=item.product_id,
                    batch_id=batch.id,
                    old_quantity=batch.quantity - item.quantity,
                    new_quantity=batch.quantity,
                    quantity_change=item.quantity,
                    user_id=current_user.id,
                    notes=f"Annulation vente {sale.sale_number} - stock restauré",
                )

                db.add(movement)

        # Update sale status
        sale.status = "cancelled"

        await db.flush()
        await db.commit()

        return True

    @staticmethod
    async def get_queue_items(db: AsyncSession) -> list[QueueItem]:
        """Get queue items for cashier display"""
        pending_sales = await SaleService.get_pending_sales(db)

        queue_items = []
        for sale in pending_sales:
            # Calculate total
            result = await db.execute(
                select(SaleItem).where(SaleItem.sale_id == sale.id)
            )
            items = result.scalars().all()
            total = sum(float(item.total_price) for item in items)

            queue_items.append(
                QueueItem(
                    sale_id=sale.id,
                    sale_number=sale.sale_number,
                    customer_name=sale.customer.name if sale.customer else None,
                    total=total,
                    item_count=len(items),
                    timestamp=sale.created_at,
                )
            )

        return queue_items


# Singleton instance
sale_service = SaleService()
