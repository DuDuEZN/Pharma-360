"""
Suppliers API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for supplier management
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import (RBACUtils, get_current_user,
                              get_current_user_with_role)
from ...models.supplier import Supplier
from ...models.user import User
from ...schemas.supplier import (SupplierCreate, SupplierDetailResponse,
                                 SupplierListResponse, SupplierResponse,
                                 SupplierUpdate)
from ...services.supplier_service import SupplierService

# Create router
router = APIRouter(prefix="/suppliers", tags=["suppliers"])

logger = get_logger(__name__)


@router.get(
    "/",
    summary="List all suppliers",
    description="Get a paginated list of all suppliers",
)
async def list_suppliers(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[Optional[str], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List suppliers endpoint"""
    return await SupplierService.list_suppliers(
        page=page, page_size=page_size, search=search, is_active=is_active, db=db
    )


@router.post(
    "/",
    summary="Create a new supplier",
    description="Create a new supplier (manager or admin only)",
)
async def create_supplier(
    supplier_data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create supplier endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can create suppliers",
        )

    # Check if supplier with same name already exists
    existing = await SupplierService.get_supplier_by_name(supplier_data.name, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier with this name already exists",
        )

    return await SupplierService.create_supplier(supplier_data, db)


@router.get(
    "/{supplier_id}",
    summary="Get a specific supplier",
    description="Get detailed supplier information",
)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get supplier endpoint"""
    supplier = await SupplierService.get_supplier_by_id(supplier_id, db)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
        )

    return await SupplierService.get_supplier_detail(supplier_id, db)


@router.put(
    "/{supplier_id}",
    summary="Update a supplier",
    description="Update supplier information (manager or admin only)",
)
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update supplier endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can update suppliers",
        )

    response = await SupplierService.update_supplier(supplier_id, supplier_data, db)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
        )

    return response


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a supplier",
    description="Delete a supplier (admin only)",
)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete supplier endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can delete suppliers",
        )

    success = await SupplierService.delete_supplier(supplier_id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
        )


@router.get(
    "/stats",
    summary="Get supplier statistics",
    description="Get statistics about suppliers",
)
async def get_supplier_stats(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get supplier statistics endpoint"""
    return await SupplierService.get_supplier_stats(db)


@router.get(
    "/{supplier_id}/products",
    summary="Get products from a supplier",
    description="Get all products from a specific supplier",
)
async def get_supplier_products(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get supplier products endpoint"""
    supplier = await SupplierService.get_supplier_by_id(supplier_id, db)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
        )

    # Get products
    from sqlalchemy import select

    from ...models.product import Product

    result = await db.execute(
        select(Product)
        .where(Product.supplier_id == supplier_id)
        .order_by(Product.name.asc())
    )
    products = result.scalars().all()

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "dci": p.dci,
                "price": float(p.price),
                "cost_price": float(p.cost_price),
                "current_stock": p.current_stock,
                "unit": p.unit,
            }
            for p in products
        ],
    }


@router.get(
    "/{supplier_id}/invoices",
    summary="Get invoices from a supplier",
    description="Get all invoices from a specific supplier",
)
async def get_supplier_invoices(
    supplier_id: int,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get supplier invoices endpoint"""
    supplier = await SupplierService.get_supplier_by_id(supplier_id, db)

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
        )

    # Get invoices
    from sqlalchemy import desc, func, select

    from ...models.invoice import Invoice

    query = select(Invoice).where(Invoice.supplier_id == supplier_id)

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Apply pagination
    query = query.order_by(desc(Invoice.date))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    invoices = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "date": inv.date.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "subtotal": float(inv.subtotal),
                "tax_amount": float(inv.tax_amount),
                "total_final": float(inv.total_final),
                "status": inv.status,
                "payment_date": (
                    inv.payment_date.isoformat() if inv.payment_date else None
                ),
            }
            for inv in invoices
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
