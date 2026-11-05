"""
Products API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for product management (CRUD + search + barcode scanning)
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger, log_business_event
from ...core.security import RBACUtils, get_current_user, get_current_user_with_role
from ...models.user import User
from ...schemas.product import (
    BarcodeScanRequest,
    BarcodeScanResponse,
    ProductCreate,
    ProductDetailResponse,
    ProductListResponse,
    ProductResponse,
    ProductSearchResponse,
    ProductUpdate,
)
from ...services.product_service import ProductService

# Create router
router = APIRouter(prefix="/products", tags=["products"])
logger = get_logger("products")


@router.get(
    "/",
    response_model=ProductListResponse,
    summary="List all products",
    description="Get a paginated list of all products",
)
async def list_products(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    category_id: Annotated[Optional[int], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
    search: Annotated[Optional[str], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductListResponse:
    """List products endpoint"""
    logger.info(
        f"Listing products - page: {page}, page_size: {page_size}",
        user_id=current_user.id,
        category_id=category_id,
        search=search[:50] if search else None,
    )

    return await ProductService.list_products(
        page=page,
        page_size=page_size,
        category_id=category_id,
        is_active=is_active,
        search=search,
        db=db,
    )


@router.get(
    "/{product_id}",
    summary="Get a specific product",
    description="Get detailed product information including all batches",
)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get product endpoint"""
    logger.info(
        f"Getting product details - product_id: {product_id}", user_id=current_user.id
    )

    product = await ProductService.get_product_by_id(product_id, db)

    if not product:
        logger.warning(
            f"Product not found - product_id: {product_id}", user_id=current_user.id
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    # Convert to detail response
    detail_response = ProductDetailResponse.model_validate(product)

    # Add computed fields
    detail_response.current_stock = product.current_stock
    detail_response.is_low_stock = product.is_low_stock
    detail_response.is_overstocked = product.is_overstocked
    detail_response.next_expiring_batch = (
        product.next_expiring_batch.batch_number
        if product.next_expiring_batch
        else None
    )
    detail_response.has_expiring_soon = product.has_expiring_soon
    detail_response.category_name = product.category.name if product.category else None

    # Add batches
    from ...schemas.batch import BatchResponse

    detail_response.batches = []
    for batch in product.batches:
        batch_response = BatchResponse.model_validate(batch)
        batch_response.product_name = product.name
        batch_response.supplier_name = batch.supplier.name if batch.supplier else None
        batch_response.is_active = batch.is_active
        batch_response.is_expired = batch.is_expired
        batch_response.is_available = batch.is_available
        batch_response.percentage_used = batch.percentage_used
        batch_response.days_until_expiry = batch.days_until_expiry
        batch_response.is_expiring_soon = batch.is_expiring_soon
        batch_response.fefo_priority = batch.fefo_priority
        detail_response.batches.append(batch_response)

    return detail_response


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Create a new product (manager or admin only)",
)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    """Create product endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can create products",
        )

    # Create product
    new_product = Product(
        name=product_data.name,
        dci=product_data.dci,
        barcode=product_data.barcode,
        category_id=product_data.category_id,
        description=product_data.description,
        price=product_data.price,
        cost_price=product_data.cost_price,
        stock_min=product_data.stock_min,
        stock_max=product_data.stock_max,
        unit=product_data.unit,
        manufacturer=product_data.manufacturer,
        is_active=product_data.is_active,
        requires_prescription=product_data.requires_prescription,
    )

    db.add(new_product)
    await db.flush()
    await db.refresh(new_product)

    # Convert to response
    response = ProductResponse.model_validate(new_product)
    response.current_stock = new_product.current_stock
    response.is_low_stock = new_product.is_low_stock
    response.is_overstocked = new_product.is_overstocked
    response.category_name = new_product.category.name if new_product.category else None

    return response


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update a product",
    description="Update product information (manager or admin only)",
)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    """Update product endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can update products",
        )

    product = await ProductService.get_product_by_id(product_id, db)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    # Update fields
    if product_data.name:
        product.name = product_data.name
    if product_data.dci:
        product.dci = product_data.dci
    if product_data.barcode:
        product.barcode = product_data.barcode
    if product_data.category_id:
        product.category_id = product_data.category_id
    if product_data.description:
        product.description = product_data.description
    if product_data.price:
        product.price = product_data.price
    if product_data.cost_price:
        product.cost_price = product_data.cost_price
    if product_data.stock_min:
        product.stock_min = product_data.stock_min
    if product_data.stock_max:
        product.stock_max = product_data.stock_max
    if product_data.unit:
        product.unit = product_data.unit
    if product_data.manufacturer:
        product.manufacturer = product_data.manufacturer
    if product_data.is_active is not None:
        product.is_active = product_data.is_active
    if product_data.requires_prescription is not None:
        product.requires_prescription = product_data.requires_prescription

    await db.flush()
    await db.refresh(product)

    # Convert to response
    response = ProductResponse.model_validate(product)
    response.current_stock = product.current_stock
    response.is_low_stock = product.is_low_stock
    response.is_overstocked = product.is_overstocked
    response.category_name = product.category.name if product.category else None

    return response


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
    description="Delete a product (admin only)",
)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete product endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can delete products",
        )

    product = await ProductService.get_product_by_id(product_id, db)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    await db.delete(product)
    await db.commit()


@router.get(
    "/search",
    response_model=ProductSearchResponse,
    summary="Search products",
    description="Search products by name, barcode, DCI, or manufacturer",
)
async def search_products(
    query: Annotated[str, Query(min_length=1)] = "",
    category_id: Annotated[Optional[int], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductSearchResponse:
    """Search products endpoint"""
    return await ProductService.search_products(
        query=query, category_id=category_id, limit=limit, db=db
    )


@router.post(
    "/scan",
    summary="Scan barcode",
    description="Scan a barcode and get product with FEFO batch selection",
)
async def scan_barcode(
    scan_data: BarcodeScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan barcode endpoint"""
    return await ProductService.scan_barcode(barcode=scan_data.barcode, db=db)


@router.get(
    "/low-stock",
    response_model=ProductListResponse,
    summary="Get low stock products",
    description="Get all products with stock below minimum level",
)
async def get_low_stock_products(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProductListResponse:
    """Get low stock products endpoint"""
    low_stock_products = await ProductService.get_low_stock_products(db)

    # Convert to response
    product_responses = []
    for product in low_stock_products:
        response = ProductResponse.model_validate(product)
        response.current_stock = product.current_stock
        response.is_low_stock = True
        response.is_overstocked = product.is_overstocked
        response.category_name = product.category.name if product.category else None
        product_responses.append(response)

    return ProductListResponse(
        products=product_responses,
        total=len(low_stock_products),
        page=1,
        page_size=len(low_stock_products),
        total_pages=1,
    )


@router.get(
    "/expiring-soon",
    response_model=ProductListResponse,
    summary="Get products with expiring batches",
    description="Get all products with batches expiring within 30 days",
)
async def get_expiring_soon_products(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProductListResponse:
    """Get expiring soon products endpoint"""
    expiring_products = await ProductService.get_expiring_soon_products(db)

    # Convert to response
    product_responses = []
    for product in expiring_products:
        response = ProductResponse.model_validate(product)
        response.current_stock = product.current_stock
        response.is_low_stock = product.is_low_stock
        response.is_overstocked = product.is_overstocked
        response.has_expiring_soon = True
        response.category_name = product.category.name if product.category else None
        product_responses.append(response)

    return ProductListResponse(
        products=product_responses,
        total=len(expiring_products),
        page=1,
        page_size=len(expiring_products),
        total_pages=1,
    )
