"""
Batches API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for batch management with FEFO/FIFO support
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role, RBACUtils
from ...models.user import User
from ...models.batch import Batch
from ...models.product import Product
from ...schemas.batch import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchListResponse,
    FEFOSelectionRequest,
    FEFOSelectionResponse,
    BatchStockAdjustment,
    BatchStockResponse,
)
from ...services.product_service import ProductService


# Create router
router = APIRouter(prefix="/batches", tags=["batches"])

logger = get_logger(__name__)


@router.get(
    "/",
    response_model=BatchListResponse,
    summary="List all batches",
    description="Get a paginated list of all batches"
)
async def list_batches(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    product_id: Annotated[Optional[int], Query()] = None,
    status: Annotated[Optional[str], Query()] = None,
    expiring_soon: Annotated[Optional[bool], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BatchListResponse:
    """List batches endpoint"""
    offset = (page - 1) * page_size
    
    # Build query
    query = select(Batch)
    count_query = select(func.count()).select_from(Batch)
    
    # Apply filters
    if product_id:
        query = query.where(Batch.product_id == product_id)
        count_query = count_query.where(Batch.product_id == product_id)
    
    if status:
        query = query.where(Batch.status == status)
        count_query = count_query.where(Batch.status == status)
    
    if expiring_soon:
        from datetime import timedelta
        today = date.today()
        threshold = today + timedelta(days=30)
        query = query.where(Batch.expiry_date <= threshold)
        count_query = count_query.where(Batch.expiry_date <= threshold)
    
    # Execute count query
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Execute main query
    query = query.offset(offset).limit(page_size).order_by(Batch.expiry_date)
    result = await db.execute(query)
    batches = result.scalars().all()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size
    
    # Convert to response objects
    batch_responses = []
    for batch in batches:
        response = BatchResponse.model_validate(batch)
        
        # Add computed fields
        if batch.product:
            response.product_name = batch.product.name
        response.supplier_name = (
            batch.supplier.name if batch.supplier else None
        )
        response.is_active = batch.is_active
        response.is_expired = batch.is_expired
        response.is_available = batch.is_available
        response.percentage_used = batch.percentage_used
        response.days_until_expiry = batch.days_until_expiry
        response.is_expiring_soon = batch.is_expiring_soon
        response.fefo_priority = batch.fefo_priority
        
        batch_responses.append(response)
    
    return BatchListResponse(
        batches=batch_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/{batch_id}",
    response_model=BatchResponse,
    summary="Get a specific batch",
    description="Get detailed batch information"
)
async def get_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BatchResponse:
    """Get batch endpoint"""
    result = await db.execute(
        select(Batch).where(Batch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Convert to response
    response = BatchResponse.model_validate(batch)
    
    # Add computed fields
    if batch.product:
        response.product_name = batch.product.name
    response.supplier_name = (
        batch.supplier.name if batch.supplier else None
    )
    response.is_active = batch.is_active
    response.is_expired = batch.is_expired
    response.is_available = batch.is_available
    response.percentage_used = batch.percentage_used
    response.days_until_expiry = batch.days_until_expiry
    response.is_expiring_soon = batch.is_expiring_soon
    response.fefo_priority = batch.fefo_priority
    
    return response


@router.post(
    "/",
    response_model=BatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new batch",
    description="Create a new product batch (manager or admin only)"
)
async def create_batch(
    batch_data: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BatchResponse:
    """Create batch endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can create batches"
        )
    
    # Verify product exists
    result = await db.execute(
        select(Product).where(Product.id == batch_data.product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product not found"
        )
    
    # Create batch
    new_batch = Batch(
        product_id=batch_data.product_id,
        batch_number=batch_data.batch_number,
        expiry_date=batch_data.expiry_date,
        quantity=batch_data.quantity,
        initial_quantity=batch_data.initial_quantity or batch_data.quantity,
        location=batch_data.location,
        received_date=batch_data.received_date,
        supplier_id=batch_data.supplier_id,
        cost_price=batch_data.cost_price,
        selling_price=batch_data.selling_price,
        purchase_invoice_id=batch_data.purchase_invoice_id,
        status=batch_data.status,
        notes=batch_data.notes
    )
    
    db.add(new_batch)
    await db.flush()
    await db.refresh(new_batch)
    
    # Convert to response
    response = BatchResponse.model_validate(new_batch)
    response.product_name = product.name
    response.supplier_name = (
        new_batch.supplier.name if new_batch.supplier else None
    )
    response.is_active = new_batch.is_active
    response.is_expired = new_batch.is_expired
    response.is_available = new_batch.is_available
    response.percentage_used = new_batch.percentage_used
    response.days_until_expiry = new_batch.days_until_expiry
    response.is_expiring_soon = new_batch.is_expiring_soon
    response.fefo_priority = new_batch.fefo_priority
    
    return response


@router.put(
    "/{batch_id}",
    response_model=BatchResponse,
    summary="Update a batch",
    description="Update batch information (manager or admin only)"
)
async def update_batch(
    batch_id: int,
    batch_data: BatchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BatchResponse:
    """Update batch endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can update batches"
        )
    
    result = await db.execute(
        select(Batch).where(Batch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    # Update fields
    if batch_data.product_id:
        batch.product_id = batch_data.product_id
    if batch_data.batch_number:
        batch.batch_number = batch_data.batch_number
    if batch_data.expiry_date:
        batch.expiry_date = batch_data.expiry_date
    if batch_data.quantity is not None:
        batch.quantity = batch_data.quantity
    if batch_data.initial_quantity is not None:
        batch.initial_quantity = batch_data.initial_quantity
    if batch_data.location:
        batch.location = batch_data.location
    if batch_data.received_date:
        batch.received_date = batch_data.received_date
    if batch_data.supplier_id:
        batch.supplier_id = batch_data.supplier_id
    if batch_data.cost_price:
        batch.cost_price = batch_data.cost_price
    if batch_data.selling_price:
        batch.selling_price = batch_data.selling_price
    if batch_data.purchase_invoice_id:
        batch.purchase_invoice_id = batch_data.purchase_invoice_id
    if batch_data.status:
        batch.status = batch_data.status
    if batch_data.notes:
        batch.notes = batch_data.notes
    
    await db.flush()
    await db.refresh(batch)
    
    # Convert to response
    response = BatchResponse.model_validate(batch)
    
    # Add computed fields
    if batch.product:
        response.product_name = batch.product.name
    response.supplier_name = (
        batch.supplier.name if batch.supplier else None
    )
    response.is_active = batch.is_active
    response.is_expired = batch.is_expired
    response.is_available = batch.is_available
    response.percentage_used = batch.percentage_used
    response.days_until_expiry = batch.days_until_expiry
    response.is_expiring_soon = batch.is_expiring_soon
    response.fefo_priority = batch.fefo_priority
    
    return response


@router.post(
    "/fefo",
    response_model=FEFOSelectionResponse,
    summary="Get FEFO batch selection",
    description="Get the best batch for FEFO (First Expired, First Out) selection"
)
async def get_fefo_batch(
    selection_data: FEFOSelectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> FEFOSelectionResponse:
    """Get FEFO batch endpoint"""
    # Get all available batches for the product
    result = await db.execute(
        select(Batch)
        .where(
            and_(
                Batch.product_id == selection_data.product_id,
                Batch.quantity >= selection_data.quantity,
                Batch.status == "active",
                Batch.expiry_date >= date.today()
            )
        )
        .order_by(Batch.expiry_date.asc())
    )
    available_batches = result.scalars().all()
    
    if not available_batches:
        return FEFOSelectionResponse(
            product_id=selection_data.product_id,
            requested_quantity=selection_data.quantity,
            selected_batch=None,
            available_batches=[],
            error="Aucun lot disponible avec quantité suffisante"
        )
    
    # Select first batch (FEFO)
    selected_batch = available_batches[0]
    
    # Convert to response objects
    available_batch_responses = []
    for batch in available_batches:
        batch_response = BatchResponse.model_validate(batch)
        if batch.product:
            batch_response.product_name = batch.product.name
        batch_response.supplier_name = (
            batch.supplier.name if batch.supplier else None
        )
        batch_response.is_active = batch.is_active
        batch_response.is_expired = batch.is_expired
        batch_response.is_available = batch.is_available
        batch_response.percentage_used = batch.percentage_used
        batch_response.days_until_expiry = batch.days_until_expiry
        batch_response.is_expiring_soon = batch.is_expiring_soon
        batch_response.fefo_priority = batch.fefo_priority
        available_batch_responses.append(batch_response)
    
    # Convert selected batch
    selected_batch_response = BatchResponse.model_validate(selected_batch)
    if selected_batch.product:
        selected_batch_response.product_name = selected_batch.product.name
    selected_batch_response.supplier_name = (
        selected_batch.supplier.name if selected_batch.supplier else None
    )
    selected_batch_response.is_active = selected_batch.is_active
    selected_batch_response.is_expired = selected_batch.is_expired
    selected_batch_response.is_available = selected_batch.is_available
    selected_batch_response.percentage_used = selected_batch.percentage_used
    selected_batch_response.days_until_expiry = selected_batch.days_until_expiry
    selected_batch_response.is_expiring_soon = selected_batch.is_expiring_soon
    selected_batch_response.fefo_priority = selected_batch.fefo_priority
    
    return FEFOSelectionResponse(
        product_id=selection_data.product_id,
        requested_quantity=selection_data.quantity,
        selected_batch=selected_batch_response,
        available_batches=available_batch_responses,
        error=None
    )


@router.post(
    "/{batch_id}/adjust",
    response_model=BatchStockResponse,
    summary="Adjust batch stock",
    description="Add or subtract stock from a batch (manager or admin only)"
)
async def adjust_batch_stock(
    batch_id: int,
    adjustment_data: BatchStockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BatchStockResponse:
    """Adjust batch stock endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can adjust stock"
        )
    
    result = await db.execute(
        select(Batch).where(Batch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    
    if not batch:
        return BatchStockResponse(
            success=False,
            new_quantity=0,
            movement_id=None,
            error="Lot non trouvé"
        )
    
    # Calculate new quantity
    if adjustment_data.adjustment_type == "add":
        new_quantity = batch.quantity + adjustment_data.quantity
    elif adjustment_data.adjustment_type == "subtract":
        new_quantity = batch.quantity - adjustment_data.quantity
    else:
        return BatchStockResponse(
            success=False,
            new_quantity=batch.quantity,
            movement_id=None,
            error="Type d'ajustement invalide (doit être 'add' ou 'subtract')"
        )
    
    # Validate new quantity
    if new_quantity < 0:
        return BatchStockResponse(
            success=False,
            new_quantity=batch.quantity,
            movement_id=None,
            error="Quantité insuffisante pour soustraire"
        )
    
    if new_quantity > batch.initial_quantity:
        return BatchStockResponse(
            success=False,
            new_quantity=batch.quantity,
            movement_id=None,
            error="La nouvelle quantité dépasse la quantité initiale"
        )
    
    # Update batch
    batch.quantity = new_quantity
    await db.flush()
    
    # Create movement record
    from ...models.movement import Movement
    movement = Movement(
        type="adjustment",
        reference_id=batch.id,
        reference_type="batch",
        product_id=batch.product_id,
        batch_id=batch.id,
        old_quantity=batch.quantity - adjustment_data.quantity if adjustment_data.adjustment_type == "add" else batch.quantity + adjustment_data.quantity,
        new_quantity=new_quantity,
        quantity_change=adjustment_data.quantity if adjustment_data.adjustment_type == "add" else -adjustment_data.quantity,
        user_id=current_user.id,
        notes=adjustment_data.reason or f"Ajustement manuel: {adjustment_data.adjustment_type}"
    )
    
    db.add(movement)
    await db.flush()
    await db.refresh(batch)
    
    return BatchStockResponse(
        success=True,
        new_quantity=new_quantity,
        movement_id=movement.id,
        error=None
    )
