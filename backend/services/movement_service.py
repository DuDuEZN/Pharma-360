"""
Movement Service for Pharmacie 360 Backend
Business logic for stock movement tracking (COMPLETE AUDIT TRAIL)
"""

from datetime import date as date_type, datetime
from typing import List, Optional

from sqlalchemy import and_, asc, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.batch import Batch
from ..models.movement import Movement
from ..models.product import Product
from ..models.user import User
from ..schemas.inventory import MovementCreate, MovementResponse


class MovementService:
    """Service class for stock movement operations (AUDIT TRAIL)"""

    @staticmethod
    async def create_movement(
        movement_data: MovementCreate, db: AsyncSession
    ) -> MovementResponse:
        """
        Create a new stock movement with complete audit trail

        FEFO Support: When recording stock OUT, prioritize batches with earliest expiry
        """
        # Get the product
        result = await db.execute(
            select(Product).where(Product.id == movement_data.product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise ValueError("Product not found")

        # For stock OUT movements, apply FEFO logic
        batch_id = movement_data.batch_id
        if movement_data.movement_type == "out" and not batch_id:
            # Find batch with earliest expiry date
            result = await db.execute(
                select(Batch)
                .where(Batch.product_id == movement_data.product_id)
                .where(Batch.quantity > 0)
                .order_by(asc(Batch.expiry_date))
                .limit(1)
            )
            batch = result.scalar_one_or_none()
            if batch:
                batch_id = batch.id

        # Get the current batch if specified
        current_batch = None
        if batch_id:
            result = await db.execute(select(Batch).where(Batch.id == batch_id))
            current_batch = result.scalar_one_or_none()

        # Get old quantity
        old_quantity = 0
        if current_batch:
            old_quantity = current_batch.quantity

        # Create the movement record
        new_movement = Movement(
            product_id=movement_data.product_id,
            batch_id=batch_id,
            quantity=movement_data.quantity,
            old_quantity=old_quantity,
            new_quantity=old_quantity,  # Will be updated after batch update
            movement_type=movement_data.movement_type,
            reason=movement_data.reason,
            reference=movement_data.reference,
            notes=movement_data.notes,
            user_id=None,  # Will be set if user is authenticated
        )

        db.add(new_movement)
        await db.flush()

        # Update the batch quantity based on movement type
        if current_batch:
            if movement_data.movement_type == "in":
                current_batch.quantity += movement_data.quantity
                new_movement.new_quantity = current_batch.quantity
            elif movement_data.movement_type == "out":
                current_batch.quantity -= movement_data.quantity
                new_movement.new_quantity = current_batch.quantity
                if current_batch.quantity < 0:
                    current_batch.quantity = 0
                    new_movement.new_quantity = 0
            elif movement_data.movement_type == "adjustment":
                current_batch.quantity = movement_data.quantity
                new_movement.new_quantity = movement_data.quantity

        await db.refresh(new_movement)

        # Return the movement with product details
        return MovementResponse(
            id=new_movement.id,
            product_id=new_movement.product_id,
            product_name=product.name,
            batch_id=new_movement.batch_id,
            quantity=new_movement.quantity,
            old_quantity=new_movement.old_quantity,
            new_quantity=new_movement.new_quantity,
            movement_type=new_movement.movement_type,
            reason=new_movement.reason,
            reference=new_movement.reference,
            date=new_movement.date,
            user_id=new_movement.user_id,
            created_at=new_movement.created_at,
        )

    @staticmethod
    async def get_movement_by_id(
        movement_id: int, db: AsyncSession
    ) -> Optional[MovementResponse]:
        """Get a movement by ID"""
        result = await db.execute(
            select(Movement)
            .where(Movement.id == movement_id)
            .options(joinedload(Movement.product))
        )
        movement = result.scalar_one_or_none()

        if not movement:
            return None

        return MovementResponse(
            id=movement.id,
            product_id=movement.product_id,
            product_name=movement.product.name if movement.product else "Unknown",
            batch_id=movement.batch_id,
            quantity=movement.quantity,
            old_quantity=movement.old_quantity,
            new_quantity=movement.new_quantity,
            movement_type=movement.movement_type,
            reason=movement.reason,
            reference=movement.reference,

            user_id=movement.user_id,
            created_at=movement.created_at,
        )

    @staticmethod
    async def list_movements(
        db: AsyncSession,
        product_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[date_type] = None,
        end_date: Optional[date_type] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> List[MovementResponse]:
        """List all movements with optional filters"""
        query = (
            select(Movement)
            .options(joinedload(Movement.product))
            .order_by(desc(Movement.created_at))
        )

        # Apply filters
        if product_id:
            query = query.where(Movement.product_id == product_id)
        if movement_type:
            query = query.where(Movement.movement_type == movement_type)
        if start_date:
            query = query.where(Movement.created_at >= datetime(start_date.year, start_date.month, start_date.day))
        if end_date:
            query = query.where(Movement.created_at <= datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59))

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        movements = result.scalars().all()

        return [
            MovementResponse(
                id=movement.id,
                product_id=movement.product_id,
                product_name=movement.product.name if movement.product else "Unknown",
                batch_id=movement.batch_id,
                quantity=movement.quantity,
                old_quantity=movement.old_quantity,
                new_quantity=movement.new_quantity,
                movement_type=movement.movement_type,
                reason=movement.reason,
                reference=movement.reference,
    
                user_id=movement.user_id,
                created_at=movement.created_at,
            )
            for movement in movements
        ]

    @staticmethod
    async def get_movements_by_product(
        product_id: int, db: AsyncSession
    ) -> List[MovementResponse]:
        """Get all movements for a specific product"""
        result = await db.execute(
            select(Movement)
            .where(Movement.product_id == product_id)
            .options(joinedload(Movement.product))
            .order_by(desc(Movement.created_at))
        )
        movements = result.scalars().all()

        return [
            MovementResponse(
                id=movement.id,
                product_id=movement.product_id,
                product_name=movement.product.name if movement.product else "Unknown",
                batch_id=movement.batch_id,
                quantity=movement.quantity,
                old_quantity=movement.old_quantity,
                new_quantity=movement.new_quantity,
                movement_type=movement.movement_type,
                reason=movement.reason,
                reference=movement.reference,
    
                user_id=movement.user_id,
                created_at=movement.created_at,
            )
            for movement in movements
        ]


# Singleton instance
movement_service = MovementService()
