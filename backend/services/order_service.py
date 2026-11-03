"""
Order Service for Pharmacie 360 Backend
Business logic for order management
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models.order import Order
from ..models.product import Product
from ..models.supplier import Supplier
from ..models.user import User
from ..schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderDetailResponse,
    OrderListResponse,
)


class OrderService:
    """Service class for order operations"""

    @staticmethod
    async def create_order(
        order_data: OrderCreate,
        db: AsyncSession,
        current_user_id: Optional[int] = None
    ) -> OrderResponse:
        """Create a new order"""
        # Validate product exists
        product = await db.get(Product, order_data.product_id)
        if not product:
            raise ValueError(f"Product {order_data.product_id} not found")
        
        # Validate supplier if provided
        if order_data.supplier_id:
            supplier = await db.get(Supplier, order_data.supplier_id)
            if not supplier:
                raise ValueError(f"Supplier {order_data.supplier_id} not found")
        
        # Generate order number
        result = await db.execute(
            select(func.coalesce(func.max(Order.order_number), "ORD-0000"))
        )
        last_number = result.scalar_one_or_none() or "ORD-0000"
        try:
            last_num = int(last_number.split('-')[1])
        except (ValueError, IndexError):
            last_num = 0
        order_number = f"ORD-{last_num + 1:04d}"
        
        # Create order
        new_order = Order(
            order_number=order_number,
            product_id=order_data.product_id,
            supplier_id=order_data.supplier_id,
            quantity=order_data.quantity,
            notes=order_data.notes,
            status="pending",
            created_by=current_user_id,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_order)
        await db.flush()
        await db.refresh(new_order)
        
        return OrderResponse.model_validate(new_order)

    @staticmethod
    async def get_order(
        order_id: int,
        db: AsyncSession
    ) -> OrderDetailResponse:
        """Get order by ID with related data"""
        result = await db.execute(
            select(Order)
            .options(
                joinedload(Order.product),
                joinedload(Order.supplier),
                joinedload(Order.created_by_user),
                joinedload(Order.approved_by_user)
            )
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        return OrderDetailResponse.model_validate(order)

    @staticmethod
    async def list_orders(
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        product_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        db: AsyncSession = None
    ) -> OrderListResponse:
        """List orders with pagination and filters"""
        query = select(Order).order_by(desc(Order.created_at))
        
        # Apply filters
        if status:
            query = query.where(Order.status == status)
        if product_id:
            query = query.where(Order.product_id == product_id)
        if supplier_id:
            query = query.where(Order.supplier_id == supplier_id)
        
        # Count total
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()
        
        # Paginate
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        orders = result.scalars().all()
        
        return OrderListResponse(
            orders=[OrderResponse.model_validate(o) for o in orders],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        )

    @staticmethod
    async def update_order(
        order_id: int,
        order_data: OrderUpdate,
        db: AsyncSession,
        current_user_id: Optional[int] = None
    ) -> OrderResponse:
        """Update an existing order"""
        order = await db.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Update fields
        if order_data.status:
            order.status = order_data.status
            
            # Update timestamps based on status
            if order_data.status == "approved" and not order.approved_at:
                order.approved_at = datetime.utcnow()
                order.approved_by = current_user_id
            elif order_data.status == "delivered" and not order.delivered_at:
                order.delivered_at = datetime.utcnow()
        
        if order_data.notes:
            order.notes = order_data.notes
        if order_data.unit_price:
            order.unit_price = order_data.unit_price
        if order_data.total_price:
            order.total_price = order_data.total_price
        
        order.updated_at = datetime.utcnow()
        
        await db.flush()
        await db.refresh(order)
        
        return OrderResponse.model_validate(order)

    @staticmethod
    async def delete_order(
        order_id: int,
        db: AsyncSession
    ) -> bool:
        """Delete an order"""
        order = await db.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        await db.delete(order)
        await db.flush()
        return True

    @staticmethod
    async def get_orders_by_product(
        product_id: int,
        db: AsyncSession
    ) -> list[OrderResponse]:
        """Get all orders for a specific product"""
        result = await db.execute(
            select(Order)
            .where(Order.product_id == product_id)
            .order_by(desc(Order.created_at))
        )
        orders = result.scalars().all()
        return [OrderResponse.model_validate(o) for o in orders]

    @staticmethod
    async def get_pending_orders(
        db: AsyncSession
    ) -> list[OrderResponse]:
        """Get all pending orders"""
        result = await db.execute(
            select(Order)
            .where(Order.status == "pending")
            .order_by(Order.created_at)
        )
        orders = result.scalars().all()
        return [OrderResponse.model_validate(o) for o in orders]
