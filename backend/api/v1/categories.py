"""
Categories API Endpoints for Pharmacie 360 Backend
List and create product categories
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.category import Category
from ...models.product import Product
from ...models.user import User
from ...schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "/",
    response_model=list[CategoryResponse],
    summary="List categories",
    description="List active product categories with their product count",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CategoryResponse]:
    """List categories endpoint"""
    result = await db.execute(
        select(Category, func.count(Product.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .where(Category.is_active.is_(True))
        .group_by(Category.id)
        .order_by(Category.name)
    )
    return [
        CategoryResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            is_active=category.is_active,
            product_count=count,
        )
        for category, count in result.all()
    ]


@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
    description="Create a new category (manager or admin only)",
)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    """Create category endpoint"""
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can create categories",
        )

    name = category_data.name.strip()
    existing = await db.execute(
        select(Category).where(func.lower(Category.name) == name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une catégorie avec ce nom existe déjà",
        )

    category = Category(name=name, description=category_data.description)
    db.add(category)
    await db.flush()

    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        product_count=0,
    )
