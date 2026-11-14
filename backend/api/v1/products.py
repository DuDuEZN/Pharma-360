"""
Products API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for product management (CRUD + search + barcode scanning)
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.category import Category
from ...models.product import Product
from ...models.user import User
from ...schemas.product import (
    BarcodeScanRequest,
    ProductCreate,
    ProductDetailResponse,
    ProductListResponse,
    ProductResponse,
    ProductSearchResponse,
    ProductUpdate,
)
from ...services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])
logger = get_logger("products")


@router.get("/", response_model=ProductListResponse, summary="List all products")
async def list_products(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    category_id: Annotated[Optional[int], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
    search: Annotated[Optional[str], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductListResponse:
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


# Keep fixed GET paths before /{product_id}; otherwise strings like "search"
# and "low-stock" are captured by the dynamic route.
@router.get("/search", response_model=ProductSearchResponse, summary="Search products")
async def search_products(
    query: Annotated[str, Query(min_length=1)],
    category_id: Annotated[Optional[int], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductSearchResponse:
    return await ProductService.search_products(
        query=query, category_id=category_id, limit=limit, db=db
    )


@router.get("/low-stock", response_model=ProductListResponse)
async def get_low_stock_products(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProductListResponse:
    products = await ProductService.get_low_stock_products(db)
    responses = []
    for product in products:
        response = ProductResponse.model_validate(product)
        response.current_stock = product.current_stock
        response.is_low_stock = True
        response.is_overstocked = product.is_overstocked
        response.category_name = product.category.name if product.category else None
        responses.append(response)
    return ProductListResponse(
        products=responses,
        total=len(products),
        page=1,
        page_size=len(products),
        total_pages=1,
    )


@router.get("/expiring-soon", response_model=ProductListResponse)
async def get_expiring_soon_products(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProductListResponse:
    products = await ProductService.get_expiring_soon_products(db)
    responses = []
    for product in products:
        response = ProductResponse.model_validate(product)
        response.current_stock = product.current_stock
        response.is_low_stock = product.is_low_stock
        response.is_overstocked = product.is_overstocked
        response.has_expiring_soon = True
        response.category_name = product.category.name if product.category else None
        responses.append(response)
    return ProductListResponse(
        products=responses,
        total=len(products),
        page=1,
        page_size=len(products),
        total_pages=1,
    )


@router.get(
    "/categories",
    summary="List product categories",
    description="Liste des catégories actives (filtres de la page Produits)",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.name)
    )
    return {
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "parent_id": c.parent_id,
            }
            for c in result.scalars().all()
        ]
    }


@router.get(
    "/categories/stats",
    summary="Product count per category",
    description="Nombre de produits actifs par catégorie (tableau de bord)",
)
async def get_category_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category.name, func.count(Product.id))
        .select_from(Product)
        .join(Category, Product.category_id == Category.id)
        .where(Product.is_active.is_(True))
        .group_by(Category.name)
        .order_by(func.count(Product.id).desc())
    )
    return [{"category": name, "count": count} for name, count in result.all()]


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
    product = await ProductService.get_product_by_id(product_id, db)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    detail = ProductDetailResponse.model_validate(product)
    detail.current_stock = product.current_stock
    detail.is_low_stock = product.is_low_stock
    detail.is_overstocked = product.is_overstocked
    detail.next_expiring_batch = (
        product.next_expiring_batch.batch_number if product.next_expiring_batch else None
    )
    detail.has_expiring_soon = product.has_expiring_soon
    detail.category_name = product.category.name if product.category else None

    from ...schemas.batch import BatchResponse

    detail.batches = []
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
        detail.batches.append(batch_response)
    return detail


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Seul le gestionnaire de stock (ou un administrateur) "
                "peut créer un produit"
            ),
        )

    # Le système génère systématiquement un code-barres unique si aucun
    # n'a été fourni (saisie manuelle ou scan).
    barcode = (product_data.barcode or "").strip() or None
    if not barcode:
        import uuid
        while True:
            candidate = "PH" + uuid.uuid4().hex[:10].upper()
            exists = await db.execute(
                select(Product.id).where(Product.barcode == candidate)
            )
            if exists.scalar_one_or_none() is None:
                barcode = candidate
                break

    product = Product(
        name=product_data.name,
        dci=product_data.dci,
        barcode=barcode,
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
        is_bulk=product_data.is_bulk,
        units_per_box=max(int(product_data.units_per_box or 1), 1),
        bulk_price=product_data.bulk_price,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)

    response = ProductResponse.model_validate(product)
    response.current_stock = product.current_stock
    response.is_low_stock = product.is_low_stock
    response.is_overstocked = product.is_overstocked
    response.category_name = product.category.name if product.category else None
    return response


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
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

    # Use exclude_unset so valid falsy values (0, False, empty string) are applied,
    # while omitted fields remain unchanged.
    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.flush()
    await db.refresh(product)
    response = ProductResponse.model_validate(product)
    response.current_stock = product.current_stock
    response.is_low_stock = product.is_low_stock
    response.is_overstocked = product.is_overstocked
    response.category_name = product.category.name if product.category else None
    return response


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
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


@router.post("/scan", summary="Scan barcode")
async def scan_barcode(
    scan_data: BarcodeScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService.scan_barcode(barcode=scan_data.barcode, db=db)
