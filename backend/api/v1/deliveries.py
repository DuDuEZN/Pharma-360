from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, RBACUtils
from ...models.user import User
from ...schemas.delivery import DeliveryCreate, DeliveryUpdate, DeliveryResponse, DeliveryListResponse
from ...services.order_service import DeliveryService

router = APIRouter(prefix="/manager/deliveries", tags=["deliveries"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/", response_model=DeliveryListResponse)
async def list_deliveries(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await DeliveryService.list_deliveries(db=db, search=search, status=status, limit=limit)
    return data


@router.get("/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    delivery = await DeliveryService.get_delivery(db, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("/", response_model=DeliveryResponse, status_code=201)
async def create_delivery(data: DeliveryCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Le manager ne crée pas de livraison : il valide ou rejette uniquement.
    if current_user.role not in ("seller", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller or admin required")
    return await DeliveryService.create_delivery(db, data)


@router.put("/{delivery_id}", response_model=DeliveryResponse)
async def update_delivery(delivery_id: int, data: DeliveryUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Le manager ne modifie pas les livraisons ; il ne fait que les valider/rejeter.
    if current_user.role not in ("seller", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller or admin required")
    delivery = await DeliveryService.update_delivery(db, delivery_id, data)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.put("/{delivery_id}/status", response_model=DeliveryResponse)
async def update_status(delivery_id: int, body: StatusUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    delivery = await DeliveryService.update_status(db, delivery_id, body.status)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("/{delivery_id}/validate", response_model=DeliveryResponse)
async def validate_delivery(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    try:
        delivery = await DeliveryService.validate_delivery(db, delivery_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as exc:
        import logging
        logging.getLogger(__name__).exception("validate_delivery failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la validation de la livraison",
        ) from exc
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("/{delivery_id}/reject", response_model=DeliveryResponse)
async def reject_delivery(delivery_id: int, body: Optional[StatusUpdate] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or admin required")
    reason = body.status if body else None
    try:
        delivery = await DeliveryService.reject_delivery(db, delivery_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("/{delivery_id}/invoice", response_model=DeliveryResponse)
async def upload_invoice(
    delivery_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # La facture fait partie de la saisie de livraison : vendeur, gestionnaire
    # de stock ou admin.
    if current_user.role not in ("seller", "manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller, manager or admin required")
    import os, uuid
    delivery = await DeliveryService.get_delivery(db, delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    # Sauvegarder le fichier
    upload_dir = "/app/uploads/invoices"
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except OSError:
        upload_dir = os.path.join(os.getcwd(), "uploads", "invoices")
        os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = "delivery_%d_%s%s" % (delivery_id, uuid.uuid4().hex[:8], ext)
    filepath = os.path.join(upload_dir, filename)
    try:
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
    except OSError as exc:
        import logging
        logging.getLogger(__name__).exception("invoice upload failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'enregistrer la facture sur le serveur",
        ) from exc
    # Mettre à jour la livraison
    orm = await DeliveryService._get_orm(db, delivery_id)
    orm.invoice_path = filepath
    await db.commit()
    await db.refresh(orm)
    return await DeliveryService.get_delivery(db, delivery_id)


@router.get("/{delivery_id}/invoice")
async def download_invoice(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    import os
    from fastapi.responses import FileResponse
    delivery = await DeliveryService.get_delivery(db, delivery_id)
    if not delivery or not delivery.invoice_path:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not os.path.exists(delivery.invoice_path):
        raise HTTPException(status_code=404, detail="Invoice file not found")
    return FileResponse(delivery.invoice_path, filename=os.path.basename(delivery.invoice_path))


@router.delete("/{delivery_id}", status_code=204)
async def delete_delivery(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Suppression réservée à l'administrateur : le manager valide/rejette seulement.
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    ok = await DeliveryService.delete_delivery(db, delivery_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return None
