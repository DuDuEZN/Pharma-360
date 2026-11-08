"""
Customers API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for customer management
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...models.customer import Customer
from ...schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from ...services.customer_service import CustomerService

# Create router
router = APIRouter(prefix="/customers", tags=["customers"])

logger = get_logger(__name__)


@router.get(
    "/",
    summary="List all customers",
    description="Get a list of all customers",
)
async def list_customers(
    name: Annotated[Optional[str], Query()] = None,
    phone: Annotated[Optional[str], Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
):
    """List customers endpoint"""
    customers = await CustomerService.list_customers(
        db=db, name=name, phone=phone, skip=skip, limit=limit
    )
    return customers


@router.get(
    "/{customer_id}",
    summary="Get a specific customer",
    description="Get detailed customer information by ID",
    response_model=CustomerResponse,
)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get customer endpoint"""
    customer = await CustomerService.get_customer_by_id(customer_id, db)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )
    return customer


@router.post(
    "/",
    summary="Create a new customer",
    description="Create a new customer",
    status_code=status.HTTP_201_CREATED,
    response_model=CustomerResponse,
)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create customer endpoint"""
    customer = await CustomerService.create_customer(customer_data, db)
    return customer


@router.put(
    "/{customer_id}",
    summary="Update a customer",
    description="Update customer information",
    response_model=CustomerResponse,
)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update customer endpoint"""
    customer = await CustomerService.update_customer(customer_id, customer_data, db)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )
    return customer


@router.delete(
    "/{customer_id}",
    summary="Delete a customer",
    description="Delete a customer by ID",
    status_code=status.HTTP_200_OK,
)
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete customer endpoint"""
    success = await CustomerService.delete_customer(customer_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )
    return {"message": "Customer deleted successfully"}


@router.get(
    "/{customer_id}/orders",
    summary="Get customer orders",
    description="Get all orders for a specific customer",
)
async def get_customer_orders(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get customer orders endpoint"""
    orders = await CustomerService.get_customer_orders(customer_id, db)
    return orders


@router.get(
    "/{customer_id}/invoices",
    summary="Get customer invoices",
    description="Get all invoices for a specific customer",
)
async def get_customer_invoices(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get customer invoices endpoint"""
    invoices = await CustomerService.get_customer_invoices(customer_id, db)
    return invoices


@router.get(
    "/{customer_id}/purchases",
    summary="Get customer purchase history",
    description="Get purchase history for a specific customer",
)
async def get_customer_purchases(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get customer purchases endpoint"""
    purchases = await CustomerService.get_customer_purchases(customer_id, db)
    return purchases


@router.get(
    "/{customer_id}/stats",
    summary="Get customer statistics",
    description="Get statistics for a specific customer",
)
async def get_customer_stats(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get customer stats endpoint"""
    stats = await CustomerService.get_customer_stats(customer_id, db)
    return stats
