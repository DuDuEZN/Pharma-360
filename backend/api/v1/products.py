"""
Products API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for product management (CRUD + search + barcode scanning)
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger, log_business_event
from ...core.security import RBACUtils, get_current_user, get_current_user_with_role
from ...models.category import Category
from ...models.movement import Movement
from ...models.product import Product
from ...models.sale_item import SaleItem
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


async def _ensure_category_exists(category_id: Optional[int], db: AsyncSession) -> None:
    """Reject unknown category ids with a clear 400 instead of a database error"""
    if category_id is None:
        return
    found = await db.execute(select(Category.id).where(Category.id == category_id))
    if found.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Catégorie introuvable",
        )


async def _ensure_barcode_free(
    barcode: Optional[str], db: AsyncSession, exclude_id: Optional[int] = None
) -> None:
    """Reject a barcode already used by another product (409)"""
    if not barcode:
        return
    query = select(Product.id).where(Product.barcode == barcode)
    if exclude_id is not None:
        query = query.where(Product.id != exclude_id)
    if (await db.execute(query)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce code-barres est déjà utilisé par un autre produit",
        )


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
    "/categories/stats",
    summary="Product count per category",
    description="Number of products per category (used by the dashboard)",
)
async def get_categories_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Categories statistics endpoint"""
    result = await db.execute(
        select(Category.name, func.count(Product.id))
        .select_from(Category)
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id, Category.name)
        .order_by(Category.name)
    )
    return [
        {"category_name": name, "product_count": count} for name, count in result.all()
    ]


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

    await _ensure_category_exists(product_data.category_id, db)
    await _ensure_barcode_free(product_data.barcode, db)

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

    # Update only the fields sent by the client (0, "" and null are valid values)
    changes = product_data.model_dump(exclude_unset=True)
    if "name" in changes and not (changes["name"] or "").strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nom du produit est obligatoire",
        )
    if "category_id" in changes:
        await _ensure_category_exists(changes["category_id"], db)
    if "barcode" in changes:
        changes["barcode"] = changes["barcode"] or None
        await _ensure_barcode_free(changes["barcode"], db, exclude_id=product_id)

    for field, value in changes.items():
        setattr(product, field, value)

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

    # Le schéma SQL supprime en cascade les ventes et mouvements liés :
    # on refuse la suppression d'un produit qui a un historique.
    sales_count = (
        await db.execute(
            select(func.count()).select_from(SaleItem).where(SaleItem.product_id == product_id)
        )
    ).scalar_one()
    movements_count = (
        await db.execute(
            select(func.count()).select_from(Movement).where(Movement.product_id == product_id)
        )
    ).scalar_one()
    if sales_count or movements_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ce produit a un historique (ventes ou mouvements de stock) et ne peut pas "
                "être supprimé. Désactivez-le plutôt (Modifier > décocher « Produit actif »)."
            ),
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
