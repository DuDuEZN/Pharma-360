"""
Dashboard API Endpoints for Pharma-360 Backend

Fournit les rubriques du tableau de bord gestionnaire :
- Vue générale : produits en stock, en rupture, périmés, péremption proche
- Activités : produits en stock, dormants, en surstock
- Valorisation : valeur d'achat, valeur de vente, marge, stock périmé
- Mouvements de stock sur les deux dernières semaines
"""

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.category import Category
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


@router.get("/sales-stats")
async def get_dashboard_sales_stats(
    start_date: Optional[date] = Query(None, description="Début de période (incluse)"),
    end_date: Optional[date] = Query(None, description="Fin de période (incluse)"),
    limit: int = Query(5, ge=1, le=20, description="Nombre de produits du top"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Statistiques de ventes calculées sur les tables réelles.

    Source fiable : ``sales`` et ``sale_items`` (la table ``sale_history``
    n'est pas alimentée par le flux de caisse). Les ventes annulées ou
    remboursées sont exclues. Les périodes sans vente sont renvoyées à zéro
    pour que les graphiques restent continus.
    """
    _require_manager(current_user)

    today = date.today()
    end = end_date or today
    start = start_date or (end - timedelta(days=29))
    if start > end:
        start, end = end, start

    period_days = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)

    excluded_statuses = ("cancelled", "refunded")

    def _sale_filters(period_start: date, period_end: date):
        return (
            Sale.status.notin_(excluded_statuses),
            func.date(Sale.created_at) >= period_start,
            func.date(Sale.created_at) <= period_end,
        )

    async def _totals(period_start: date, period_end: date):
        filters = _sale_filters(period_start, period_end)
        row = (
            await db.execute(
                select(
                    func.count(Sale.id),
                    func.coalesce(func.sum(Sale.total), 0),
                    func.coalesce(func.sum(Sale.subtotal), 0),
                    func.coalesce(func.sum(Sale.tax_amount), 0),
                    func.coalesce(func.sum(Sale.discount), 0),
                    func.count(func.distinct(Sale.customer_id)),
                ).where(*filters)
            )
        ).one()
        items_sold = (
            await db.execute(
                select(func.coalesce(func.sum(SaleItem.quantity), 0))
                .join(Sale, Sale.id == SaleItem.sale_id)
                .where(*filters)
            )
        ).scalar() or 0

        sales_count = int(row[0] or 0)
        revenue = float(row[1] or 0)
        return {
            "sales_count": sales_count,
            "revenue": round(revenue, 2),
            "subtotal": round(float(row[2] or 0), 2),
            "tax": round(float(row[3] or 0), 2),
            "discount": round(float(row[4] or 0), 2),
            "customers": int(row[5] or 0),
            "items_sold": int(items_sold or 0),
            "average_basket": round(revenue / sales_count, 2) if sales_count else 0.0,
        }

    current = await _totals(start, end)
    previous = await _totals(previous_start, previous_end)

    filters = _sale_filters(start, end)

    daily_rows = (
        await db.execute(
            select(
                func.date(Sale.created_at).label("day"),
                func.count(Sale.id),
                func.coalesce(func.sum(Sale.total), 0),
            )
            .where(*filters)
            .group_by(func.date(Sale.created_at))
            .order_by(func.date(Sale.created_at))
        )
    ).all()
    daily_items_rows = (
        await db.execute(
            select(
                func.date(Sale.created_at).label("day"),
                func.coalesce(func.sum(SaleItem.quantity), 0),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(*filters)
            .group_by(func.date(Sale.created_at))
        )
    ).all()

    def _as_date(value) -> date:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return date.fromisoformat(str(value)[:10])

    sales_by_day = {_as_date(day): (int(count or 0), float(revenue or 0)) for day, count, revenue in daily_rows}
    items_by_day = {_as_date(day): int(qty or 0) for day, qty in daily_items_rows}

    daily = []
    for offset in range(period_days):
        day = start + timedelta(days=offset)
        count, revenue = sales_by_day.get(day, (0, 0.0))
        daily.append(
            {
                "date": day.isoformat(),
                "sales_count": count,
                "revenue": round(revenue, 2),
                "items_sold": items_by_day.get(day, 0),
            }
        )

    top_rows = (
        await db.execute(
            select(
                Product.id,
                Product.name,
                func.coalesce(func.sum(SaleItem.quantity), 0),
                func.coalesce(func.sum(SaleItem.total_price), 0),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(*filters)
            .group_by(Product.id, Product.name)
            .order_by(func.sum(SaleItem.quantity).desc(), Product.name.asc())
            .limit(limit)
        )
    ).all()

    category_rows = (
        await db.execute(
            select(
                func.coalesce(Category.name, "Non classé"),
                func.coalesce(func.sum(SaleItem.quantity), 0),
                func.coalesce(func.sum(SaleItem.total_price), 0),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .outerjoin(Category, Category.id == Product.category_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(*filters)
            .group_by(Category.name)
            .order_by(func.sum(SaleItem.total_price).desc())
        )
    ).all()

    def _variation(current_value, previous_value):
        if not previous_value:
            return None if current_value else 0.0
        return round(((current_value - previous_value) / previous_value) * 100, 1)

    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "days": period_days,
        },
        "totals": current,
        "previous": {
            "start": previous_start.isoformat(),
            "end": previous_end.isoformat(),
            "sales_count": previous["sales_count"],
            "revenue": previous["revenue"],
            "items_sold": previous["items_sold"],
            "average_basket": previous["average_basket"],
        },
        "variation": {
            "sales_count": _variation(current["sales_count"], previous["sales_count"]),
            "revenue": _variation(current["revenue"], previous["revenue"]),
            "items_sold": _variation(current["items_sold"], previous["items_sold"]),
        },
        "daily": daily,
        "top_products": [
            {
                "product_id": product_id,
                "name": name,
                "quantity": int(quantity or 0),
                "revenue": round(float(revenue or 0), 2),
            }
            for product_id, name, quantity, revenue in top_rows
        ],
        "categories": [
            {
                "category": category,
                "quantity": int(quantity or 0),
                "revenue": round(float(revenue or 0), 2),
            }
            for category, quantity, revenue in category_rows
        ],
    }
