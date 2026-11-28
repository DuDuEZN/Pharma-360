from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from .schemas import OrderCreate, OrderUpdate, OrderResponse, OrderListResponse
from .service import OrderService

router = APIRouter(prefix="/manager/orders", tags=["orders"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/", response_model=OrderListResponse)
async def list_orders(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await OrderService.list_orders(db=db, search=search, status=status, limit=limit)
    return data


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = await OrderService.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Le manager ne crée pas de commande : il valide ou rejette uniquement.
    if current_user.role not in ("seller", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller or admin required")
    try:
        return await OrderService.create_order(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("create_order failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur interne lors de la création de la commande")


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(order_id: int, data: OrderUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Le manager ne modifie pas les commandes ; il ne fait que les valider/rejeter.
    if current_user.role not in ("seller", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller or admin required")
    existing = await OrderService.get_order(db, order_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "seller" and existing.status not in ("pending", "to_modify"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Une commande n'est modifiable que tant qu'elle est en attente ou à corriger",
        )
    try:
        order = await OrderService.update_order(db, order_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    order = await OrderService.update_status(db, order_id, body.status, current_user.id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/validate", response_model=OrderResponse)
async def validate_order(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    try:
        order = await OrderService.validate_order(db, order_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/reject", response_model=OrderResponse)
async def reject_order(order_id: int, body: Optional[StatusUpdate] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    reason = body.status if body else None
    try:
        order = await OrderService.reject_order(db, order_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.delete("/{order_id}", status_code=204)
async def delete_order(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Admin : suppression libre. Vendeur : uniquement une commande rejetée
    # (to_modify), pour lui permettre de la retirer après rejet.
    if current_user.role not in ("admin", "seller"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or seller required")
    order = await OrderService.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "seller" and order.status != "to_modify":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le vendeur ne peut supprimer qu'une commande rejetée (à corriger)",
        )
    ok = await OrderService.delete_order(db, order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Order not found")
    return None


@router.get("/{order_id}/purchase-order")
async def purchase_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bon de commande structure, imprimable/telechargeable (HTML)."""
    from fastapi.responses import HTMLResponse
    order = await OrderService.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    lines = ""
    for it in (order.items or []):
        lines += (
            "<tr><td>" + str(it.product_name or "") + "</td>"
            "<td>" + str(it.product_barcode or "") + "</td>"
            "<td style='text-align:center'>" + str(it.quantity) + "</td>"
            "<td style='text-align:right'>" + format(it.unit_price, ".2f") + "</td>"
            "<td style='text-align:right'>" + format(it.total_price, ".2f") + "</td></tr>"
        )
    html = ("<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'>"
            "<title>Bon de commande " + str(order.reference or order.id) + "</title>"
            "<style>body{font-family:Arial,sans-serif;margin:20px;color:#222}"
            "h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}"
            "th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f2f2f2}"
            ".total{text-align:right;font-weight:bold;margin-top:12px}"
            "@media print{.noprint{display:none}}</style></head><body>"
            "<div class='noprint'><button onclick='window.print()'>Imprimer / Enregistrer en PDF</button></div>"
            "<h1>Bon de commande</h1>"
            "<p><strong>Reference :</strong> " + str(order.reference or order.id) + "<br>"
            "<strong>Fournisseur :</strong> " + str(order.supplier_name or "-") + "<br>"
            "<strong>Date :</strong> " + str(order.order_date) + "<br>"
            "<strong>Statut :</strong> " + str(order.status) + "<br>"
            "<strong>Lignes figees :</strong> " + ("Oui" if order.lines_frozen else "Non") + "</p>"
            "<table><thead><tr><th>Produit</th><th>Code-barres</th><th>Qte</th><th>P.U.</th><th>Total</th></tr></thead>"
            "<tbody>" + lines + "</tbody></table>"
            "<p class='total'>Total : " + format(order.total_amount, ".2f") + "</p>"
            "</body></html>")
    return HTMLResponse(content=html)
