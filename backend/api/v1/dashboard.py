"""
Dashboard API Endpoints for Pharma-360 Backend

Fournit les rubriques du tableau de bord gestionnaire :
- Vue générale : produits en stock, en rupture, périmés, péremption proche
- Activités : produits en stock, dormants, en surstock
- Valorisation : valeur d'achat, valeur de vente, marge, stock périmé
- Mouvements de stock sur les deux dernières semaines
"""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.movement import Movement
from ...models.product import Product
from ...models.sale import Sale
from ...models.sale_item import SaleItem
from ...models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

EXPIRING_SOON_DAYS = 30
DORMANT_DAYS = 90
MOVEMENT_DAYS = 14


def _require_manager(user: User) -> None:
    if not RBACUtils.has_permission(user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin required",
        )


@router.get("/overview")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Synthèse complète du tableau de bord (stock, activité, valorisation, mouvements)."""
    _require_manager(current_user)

    today = date.today()
    expiring_limit = today + timedelta(days=EXPIRING_SOON_DAYS)

    result = await db.execute(select(Product).where(Product.is_active.is_(True)))
    products = result.scalars().all()

    in_stock = out_of_stock = expired = expiring_soon = overstocked = 0
    purchase_value = sale_value = expired_value = 0.0

    for product in products:
        stock = int(product.current_stock or 0)
        if stock > 0:
            in_stock += 1
        else:
            out_of_stock += 1

        if product.stock_max and stock > int(product.stock_max):
            overstocked += 1

        purchase_value += stock * float(product.cost_price or 0)
        sale_value += stock * float(product.price or 0)

        product_expired = False
        product_expiring = False
        for batch in product.batches or []:
            if not batch.quantity or int(batch.quantity) <= 0:
                continue
            if batch.expiry_date < today:
                product_expired = True
                unit_cost = float(batch.cost_price or product.cost_price or 0)
                expired_value += int(batch.quantity) * unit_cost
            elif batch.expiry_date <= expiring_limit:
                product_expiring = True

        if product_expired:
            expired += 1
        if product_expiring:
            expiring_soon += 1

    # Produits dormants : aucun vente sur les DORMANT_DAYS derniers jours.
    dormant_start = today - timedelta(days=DORMANT_DAYS)
    sold_result = await db.execute(
        select(SaleItem.product_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.status == "paid",
            func.date(Sale.created_at) >= dormant_start,
        )
        .group_by(SaleItem.product_id)
    )
    sold_ids = {row[0] for row in sold_result.all()}

    dormant = sum(
        1
        for product in products
        if int(product.current_stock or 0) > 0 and product.id not in sold_ids
    )

    # Mouvements de stock sur les deux dernières semaines.
    movement_start = datetime.combine(
        today - timedelta(days=MOVEMENT_DAYS - 1), datetime.min.time()
    )
    movement_result = await db.execute(
        select(Movement).where(Movement.created_at >= movement_start)
    )
    movements = movement_result.scalars().all()

    daily_map = {}
    for offset in range(MOVEMENT_DAYS):
        day = today - timedelta(days=MOVEMENT_DAYS - 1 - offset)
        daily_map[day.isoformat()] = {"date": day.isoformat(), "inbound": 0, "outbound": 0}

    total_inbound = total_outbound = 0
    for movement in movements:
        change = int(movement.quantity_change or 0)
        day_key = movement.created_at.date().isoformat()
        entry = daily_map.get(day_key)
        if entry is None:
            continue
        if change >= 0:
            entry["inbound"] += change
            total_inbound += change
        else:
            entry["outbound"] += abs(change)
            total_outbound += abs(change)

    return {
        "overview": {
            "total_products": len(products),
            "in_stock": in_stock,
            "out_of_stock": out_of_stock,
            "expired": expired,
            "expiring_soon": expiring_soon,
        },
        "activity": {
            "in_stock": in_stock,
            "dormant": dormant,
            "overstocked": overstocked,
        },
        "valuation": {
            "purchase_value": round(purchase_value, 2),
            "sale_value": round(sale_value, 2),
            "margin": round(sale_value - purchase_value, 2),
            "expired_value": round(expired_value, 2),
        },
        "movements": {
            "days": MOVEMENT_DAYS,
            "daily": list(daily_map.values()),
            "totals": {
                "inbound": total_inbound,
                "outbound": total_outbound,
            },
        },
    }
