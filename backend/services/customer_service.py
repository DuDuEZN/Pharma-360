"""
Customer Service for Pharmacie 360 Backend
Business logic for customer management
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models.customer import Customer
from ..models.sale import Sale
from ..schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerStatsResponse,
    CustomerUpdate,
)


class CustomerService:
    """Service class for customer operations"""

    @staticmethod
    async def create_customer(
        customer_data: CustomerCreate, db: AsyncSession
    ) -> CustomerResponse:
        """Create a new customer"""
        new_customer = Customer(
            name=customer_data.name,
            contact=customer_data.contact,
            email=customer_data.email,
            phone=customer_data.phone,
            address=customer_data.address,
            city=customer_data.city,
            country=customer_data.country,
            tax_id=customer_data.tax_id,
        )

        db.add(new_customer)
        await db.flush()
        await db.refresh(new_customer)

        return CustomerResponse.model_validate(new_customer)

    @staticmethod
    async def get_customer_by_id(
        customer_id: int, db: AsyncSession
    ) -> Optional[Customer]:
        """Get a customer by ID"""
        result = await db.execute(select(Customer).where(Customer.id == customer_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_customer_by_name(name: str, db: AsyncSession) -> Optional[Customer]:
        """Get a customer by name"""
        result = await db.execute(select(Customer).where(Customer.name == name))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_customers(
        db: AsyncSession,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[CustomerResponse]:
        """List all customers with optional filters"""
        query = select(Customer)

        # Apply filters
        if name:
            query = query.where(Customer.name.ilike(f"%{name}%"))
        if phone:
            query = query.where(Customer.phone.ilike(f"%{phone}%"))

        query = query.offset(skip).limit(limit).order_by(asc(Customer.name))

        result = await db.execute(query)
        customers = result.scalars().all()

        return [CustomerResponse.model_validate(customer) for customer in customers]

    @staticmethod
    async def update_customer(
        customer_id: int, customer_data: CustomerUpdate, db: AsyncSession
    ) -> Optional[CustomerResponse]:
        """Update a customer"""
        customer = await CustomerService.get_customer_by_id(customer_id, db)
        if not customer:
            return None

        # Update fields
        if customer_data.name is not None:
            customer.name = customer_data.name
        if customer_data.contact is not None:
            customer.contact = customer_data.contact
        if customer_data.email is not None:
            customer.email = customer_data.email
        if customer_data.phone is not None:
            customer.phone = customer_data.phone
        if customer_data.address is not None:
            customer.address = customer_data.address
        if customer_data.city is not None:
            customer.city = customer_data.city
        if customer_data.country is not None:
            customer.country = customer_data.country
        if customer_data.tax_id is not None:
            customer.tax_id = customer_data.tax_id

        customer.updated_at = func.now()
        await db.flush()
        await db.refresh(customer)

        return CustomerResponse.model_validate(customer)

    @staticmethod
    async def delete_customer(customer_id: int, db: AsyncSession) -> bool:
        """Delete a customer"""
        customer = await CustomerService.get_customer_by_id(customer_id, db)
        if not customer:
            return False

        await db.delete(customer)
        await db.flush()
        return True

    @staticmethod
    async def get_customer_orders(customer_id: int, db: AsyncSession) -> List[dict]:
        """Get all orders for a customer"""
        result = await db.execute(
            select(Sale)
            .where(Sale.customer_id == customer_id)
            .order_by(desc(Sale.created_at))
        )
        orders = result.scalars().all()
        return [
            {
                "id": order.id,
                "date": order.created_at,
                "total": order.total,
                "status": order.status,
                "items_count": len(order.items) if order.items else 0,
            }
            for order in orders
        ]

    @staticmethod
    async def get_customer_invoices(customer_id: int, db: AsyncSession) -> List[dict]:
        """Get all sales/invoices for a customer"""
        result = await db.execute(
            select(Sale)
            .where(Sale.customer_id == customer_id)
            .order_by(desc(Sale.created_at))
        )
        sales = result.scalars().all()
        return [
            {
                "id": sale.id,
                "sale_number": sale.sale_number,
                "date": sale.created_at,
                "total": sale.total,
                "status": sale.status,
            }
            for sale in sales
        ]

    @staticmethod
    async def get_customer_purchases(customer_id: int, db: AsyncSession) -> List[dict]:
        """Get purchase history for a customer"""
        result = await db.execute(
            select(Sale)
            .where(Sale.customer_id == customer_id)
            .order_by(desc(Sale.created_at))
            .limit(50)
        )
        purchases = result.scalars().all()
        return [
            {
                "id": purchase.id,
                "date": purchase.created_at,
                "total": purchase.total,
                "payment_method": purchase.payment_method,
                "items": [
                    {
                        "product_id": item.product_id,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "total": item.total_price,
                    }
                    for item in (purchase.items if purchase.items else [])
                ],
            }
            for purchase in purchases
        ]

    @staticmethod
    async def get_customer_stats(
        customer_id: int, db: AsyncSession
    ) -> CustomerStatsResponse:
        """Get statistics for a customer"""
        # Get total purchases
        result = await db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.customer_id == customer_id
            )
        )
        total_purchases = float(result.scalar() or 0)

        # Get purchase count
        result = await db.execute(
            select(func.count(Sale.id)).where(Sale.customer_id == customer_id)
        )
        purchase_count = int(result.scalar() or 0)

        # Get first and last purchase dates
        result = await db.execute(
            select(func.min(Sale.created_at)).where(Sale.customer_id == customer_id)
        )
        first_purchase_date = result.scalar()

        result = await db.execute(
            select(func.max(Sale.created_at)).where(Sale.customer_id == customer_id)
        )
        last_purchase_date = result.scalar()

        # Calculate average purchase value
        avg_purchase_value = (
            total_purchases / purchase_count if purchase_count > 0 else 0.0
        )

        return CustomerStatsResponse(
            customer_id=customer_id,
            total_purchases=total_purchases,
            purchase_count=purchase_count,
            avg_purchase_value=avg_purchase_value,
            first_purchase_date=first_purchase_date,
            last_purchase_date=last_purchase_date,
            most_purchased_category=None,  # Would need additional query
        )


# Singleton instance
customer_service = CustomerService()
