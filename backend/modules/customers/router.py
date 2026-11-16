"""
Customers API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for customer management
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.customer import Customer
from ...models.user import User
from .schemas import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from .service import CustomerService

# Create router
router = APIRouter(prefix="/customers", tags=["customers"])

logger = get_logger(__name__)


def _require_read(user: User) -> None:
    """Lecture et création réservées aux rôles seller et supérieurs (pas caissier)."""
    if not RBACUtils.has_permission(user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux vendeurs, gestionnaires et administrateurs",
        )


def _require_manage(user: User) -> None:
    """Modification et suppression réservées aux gestionnaires et administrateurs."""
    if not RBACUtils.has_permission(user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestionnaire ou administrateur requis",
        )



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
    current_user: User = Depends(get_current_user),
):
    """List customers endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Get customer endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Create customer endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Update customer endpoint"""
    _require_manage(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Delete customer endpoint"""
    _require_manage(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Get customer orders endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Get customer invoices endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Get customer purchases endpoint"""
    _require_read(current_user)
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
    current_user: User = Depends(get_current_user),
):
    """Get customer stats endpoint"""
    _require_read(current_user)
    stats = await CustomerService.get_customer_stats(customer_id, db)
    return stats


@router.get(
    "/{customer_id}/credit",
    summary="Get customer credit",
    description="Credit balance and credit (unpaid) purchases for a customer",
)
async def get_customer_credit(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get customer credit endpoint"""
    _require_read(current_user)
    return await CustomerService.get_customer_credit(customer_id, db)
