"""
Order & Delivery Service for Pharmacie 360 Backend
"""
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func, or_, delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.order import Order, OrderItem, Delivery, DeliveryItem
from ..models.supplier import Supplier
from ..models.product import Product
from ..models.batch import Batch
from ..schemas.order import (
    OrderCreate, OrderUpdate, OrderResponse, OrderListResponse, OrderItemResponse,
)
from ..schemas.delivery import (
    DeliveryCreate, DeliveryUpdate, DeliveryResponse, DeliveryListResponse, DeliveryItemResponse,
)


class OrderService:
    @staticmethod
    async def list_orders(db, search=None, status=None, limit=100, offset=0):
        query = select(Order).options(selectinload(Order.supplier), selectinload(Order.items))
        count_query = select(func.count()).select_from(Order)
        if status and status != "all":
            query = query.where(Order.status == status)
            count_query = count_query.where(Order.status == status)
        if search:
            like = f"%{search}%"
            query = query.where(or_(Order.reference.ilike(like), Order.status.ilike(like)))
        total = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        result = []
        for o in rows:
            supplier_name = o.supplier.name if o.supplier else None
            items_count = len(o.items)
            total_amount = float(sum((i.total_price or 0) for i in o.items))
            result.append(OrderResponse(
                id=o.id,
                supplier_id=o.supplier_id,
                supplier_name=supplier_name,
                reference=o.reference,
                order_date=o.order_date,
                expected_delivery_date=o.expected_delivery_date,
                status=o.status,
                priority=o.priority,
                notes=o.notes,
                approved_by=o.approved_by,
                approved_at=o.approved_at,
                items_count=items_count,
                total_amount=total_amount,
                created_at=o.created_at,
                updated_at=o.updated_at,
            ))
        return {"orders": result, "total": total, "page": 1, "page_size": limit, "total_pages": 1}

    @staticmethod
    async def get_order(db, order_id):
        result = await db.execute(
            select(Order).options(
                selectinload(Order.supplier),
                selectinload(Order.items),
            ).where(Order.id == order_id)
        )
        o = result.scalar_one_or_none()
        if not o:
            return None
        product_ids = {i.product_id for i in o.items if i.product_id}
        product_names = {}
        product_barcodes = {}
        if product_ids:
            pres = await db.execute(
                select(Product.id, Product.name, Product.barcode).where(Product.id.in_(product_ids))
            )
            for pid, pname, pbarcode in pres.all():
                product_names[pid] = pname
                product_barcodes[pid] = pbarcode
        item_objs = [OrderItemResponse(
            id=i.id, order_id=i.order_id, product_id=i.product_id,
            product_name=product_names.get(i.product_id),
            product_barcode=product_barcodes.get(i.product_id),
            quantity=i.quantity, unit_price=float(i.unit_price or 0),
            total_price=float(i.total_price or 0), created_at=i.created_at,
        ) for i in o.items]
        supplier_name = o.supplier.name if o.supplier else None
        total_amount = float(sum((i.total_price or 0) for i in o.items))
        return OrderResponse(
            id=o.id,
            supplier_id=o.supplier_id,
            supplier_name=supplier_name,
            reference=o.reference,
            order_date=o.order_date,
            expected_delivery_date=o.expected_delivery_date,
            status=o.status,
            priority=o.priority,
            notes=o.notes,
            approved_by=o.approved_by,
            approved_at=o.approved_at,
            items_count=len(o.items),
            total_amount=total_amount,
            created_at=o.created_at,
            updated_at=o.updated_at,
            items=item_objs,
        )

    @staticmethod
    async def create_order(db, data: OrderCreate):
        # Validation du fournisseur si fourni
        if data.supplier_id is not None:
            supplier = await db.get(Supplier, data.supplier_id)
            if not supplier:
                raise ValueError(f"Fournisseur {data.supplier_id} introuvable")
        # Un seller ne peut créer qu'une commande en attente
        status = data.status or "pending"
        o = Order(
            supplier_id=data.supplier_id,
            reference=data.reference,
            order_date=data.order_date or date.today(),
            expected_delivery_date=data.expected_delivery_date,
            status=status,
            priority=data.priority or "normal",
            notes=data.notes,
        )
        db.add(o)
        await db.flush()
        for it in (data.items or []):
            qty = it.quantity or 1
            up = float(it.unit_price or 0)
            item = OrderItem(
                order_id=o.id,
                product_id=it.product_id,
                quantity=qty,
                unit_price=up,
                total_price=qty * up,
            )
            db.add(item)
        await db.commit()
        await db.refresh(o)
        return await OrderService.get_order(db, o.id)

    @staticmethod
    async def update_order(db, order_id, data: OrderUpdate):
        o = await OrderService._get_orm(db, order_id)
        if not o:
            return None
        o.supplier_id = data.supplier_id
        o.reference = data.reference
        o.order_date = data.order_date or o.order_date
        o.expected_delivery_date = data.expected_delivery_date
        o.status = data.status or o.status
        o.priority = data.priority or o.priority
        o.notes = data.notes
        from sqlalchemy import delete as sql_delete
        await db.execute(sql_delete(OrderItem).where(OrderItem.order_id == order_id), execution_options={"synchronize_session": False})
        await db.flush()
        for it in (data.items or []):
            qty = it.quantity or 1
            up = float(it.unit_price or 0)
            db.add(OrderItem(order_id=o.id, product_id=it.product_id, quantity=qty, unit_price=up, total_price=qty * up))
        await db.commit()
        return await OrderService.get_order(db, order_id)

    @staticmethod
    async def update_status(db, order_id, status, user_id=None):
        o = await OrderService._get_orm(db, order_id)
        if not o:
            return None
        o.status = status
        if status in ("confirmed", "pending_delivery"):
            o.approved_by = user_id
            o.approved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(o)
        return await OrderService.get_order(db, o.id)

    @staticmethod
    async def validate_order(db, order_id, user_id=None):
        o = await OrderService._get_orm(db, order_id)
        if not o:
            return None
        if o.status not in ("pending", "to_modify"):
            raise ValueError("Commande %d ne peut pas etre validee (statut: %s)" % (order_id, o.status))
        o.status = "confirmed"
        o.approved_by = user_id
        o.approved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(o)
        o.status = "pending_delivery"
        await db.commit()
        await db.refresh(o)
        return await OrderService.get_order(db, o.id)

    @staticmethod
    async def reject_order(db, order_id, user_id=None, reason=None):
        o = await OrderService._get_orm(db, order_id)
        if not o:
            return None
        if o.status not in ("pending", "pending_delivery"):
            raise ValueError("Commande %d ne peut pas etre rejetee (statut: %s)" % (order_id, o.status))
        o.status = "to_modify"
        if reason:
            o.notes = (o.notes or "") + "\n[Rejet] " + str(reason)
        await db.commit()
        await db.refresh(o)
        return await OrderService.get_order(db, o.id)

    @staticmethod
    async def delete_order(db, order_id):
        o = await OrderService._get_orm(db, order_id)
        if not o:
            return False
        await db.delete(o)
        await db.commit()
        return True

    @staticmethod
    async def _get_orm(db, order_id):
        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        )
        return result.scalar_one_or_none()


class DeliveryService:
    @staticmethod
    async def list_deliveries(db, search=None, status=None, limit=100, offset=0):
        query = select(Delivery).options(
            selectinload(Delivery.supplier),
            selectinload(Delivery.items),
            selectinload(Delivery.order),
        )
        count_query = select(func.count()).select_from(Delivery)
        if status and status != "all":
            query = query.where(Delivery.status == status)
            count_query = count_query.where(Delivery.status == status)
        if search:
            like = f"%{search}%"
            query = query.where(or_(Delivery.reference.ilike(like), Delivery.tracking_number.ilike(like)))
        total = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(Delivery.created_at.desc()).offset(offset).limit(limit)
        rows = (await db.execute(query)).scalars().all()
        result = []
        for d in rows:
            supplier_name = d.supplier.name if d.supplier else None
            order_reference = d.order.reference if d.order else None
            result.append(DeliveryResponse(
                id=d.id,
                supplier_id=d.supplier_id,
                supplier_name=supplier_name,
                reference=d.reference,
                delivery_date=d.delivery_date,
                expected_date=d.expected_date,
                status=d.status,
                tracking_number=d.tracking_number,
                notes=d.notes,
                order_id=d.order_id,
                order_reference=order_reference,
                received_at=d.received_at,
                reception_notes=d.reception_notes,
                stock_applied=d.stock_applied,
                items_count=len(d.items),
                created_at=d.created_at,
                updated_at=d.updated_at,
            ))
        return {"deliveries": result, "total": total, "page": 1, "page_size": limit, "total_pages": 1}

    @staticmethod
    async def get_delivery(db, delivery_id):
        result = await db.execute(
            select(Delivery).options(
                selectinload(Delivery.supplier),
                selectinload(Delivery.items),
                selectinload(Delivery.order),
            ).where(Delivery.id == delivery_id)
        )
        d = result.scalar_one_or_none()
        if not d:
            return None
        product_ids = {i.product_id for i in d.items if i.product_id}
        product_names = {}
        product_barcodes = {}
        product_prices = {}
        if product_ids:
            pres = await db.execute(
                select(Product.id, Product.name, Product.barcode, Product.price).where(Product.id.in_(product_ids))
            )
            for pid, pname, pbarcode, pprice in pres.all():
                product_names[pid] = pname
                product_barcodes[pid] = pbarcode
                product_prices[pid] = float(pprice or 0)
        item_objs = [DeliveryItemResponse(
            id=i.id, delivery_id=i.delivery_id, product_id=i.product_id,
            product_name=product_names.get(i.product_id),
            product_barcode=product_barcodes.get(i.product_id),
            barcode=i.barcode or product_barcodes.get(i.product_id),
            product_price=product_prices.get(i.product_id, 0) or 0,
            quantity=i.quantity, unit_price=float(i.unit_price or 0),
            selling_price=(
                float(i.selling_price)
                if getattr(i, "selling_price", None) not in (None, 0)
                else (product_prices.get(i.product_id, 0) or 0)
            ),
            total_price=float(i.total_price or 0),
            received_quantity=i.received_quantity or 0,
            non_conforming_quantity=i.non_conforming_quantity or 0,
            expiry_date=i.expiry_date,
            location=i.location,
            notes=i.notes,
            batch_number=i.batch_number,
            created_at=i.created_at,
        ) for i in d.items]
        supplier_name = d.supplier.name if d.supplier else None
        order_reference = d.order.reference if d.order else None
        return DeliveryResponse(
            id=d.id,
            supplier_id=d.supplier_id,
            supplier_name=supplier_name,
            reference=d.reference,
            delivery_date=d.delivery_date,
            expected_date=d.expected_date,
            status=d.status,
            tracking_number=d.tracking_number,
            notes=d.notes,
            order_id=d.order_id,
            order_reference=order_reference,
            received_at=d.received_at,
            reception_notes=d.reception_notes,
            invoice_path=d.invoice_path,
            stock_applied=d.stock_applied,
            items_count=len(d.items),
            created_at=d.created_at,
            updated_at=d.updated_at,
            items=item_objs,
        )

    @staticmethod
    async def create_delivery(db, data: DeliveryCreate):
        # order_id est obligatoire
        if not data.order_id:
            raise ValueError("Une livraison doit être associée à une commande")

        # Charger la commande
        res = await db.execute(
            select(Order).options(selectinload(Order.items), selectinload(Order.supplier))
            .where(Order.id == data.order_id)
        )
        order = res.scalar_one_or_none()
        if not order:
            raise ValueError(f"Commande {data.order_id} introuvable")

        # Une commande déjà livrée ne peut pas avoir une nouvelle livraison
        if order.status == "delivered":
            raise ValueError(f"La commande {order.reference} est déjà livrée")

        # Vérifier qu'il n'existe pas déjà une livraison livrée pour cette commande
        existing = await db.execute(
            select(Delivery).where(
                Delivery.order_id == data.order_id,
                Delivery.status == "delivered"
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"La commande {order.reference} a déjà une livraison validée")

        supplier_id = data.supplier_id or order.supplier_id
        reference = data.reference or f"LIV-{order.reference or order.id}"

        d = Delivery(
            supplier_id=supplier_id,
            reference=reference,
            delivery_date=data.delivery_date or date.today(),
            expected_date=data.expected_date,
            status=data.status or "pending",
            tracking_number=data.tracking_number,
            notes=data.notes,
            order_id=data.order_id,
            received_at=data.received_at,
            reception_notes=data.reception_notes,
            invoice_path=data.invoice_path,
        )
        db.add(d)
        await db.flush()

        items_source = data.items or []
        if order is not None and not items_source:
            for oi in order.items:
                items_source.append(DeliveryItemCreateProxy(
                    product_id=oi.product_id,
                    quantity=oi.quantity,
                    unit_price=float(oi.unit_price or 0),
                ))

        # Le code-barres n'est jamais saisi librement : il est toujours celui
        # du produit sélectionné, pour éviter toute incohérence de stock.
        product_ids = {
            getattr(it, "product_id", None) for it in items_source
            if getattr(it, "product_id", None)
        }
        product_barcodes = {}
        product_prices = {}
        if product_ids:
            pres = await db.execute(
                select(Product.id, Product.barcode, Product.price).where(Product.id.in_(product_ids))
            )
            for pid, pbarcode, pprice in pres.all():
                product_barcodes[pid] = pbarcode
                product_prices[pid] = float(pprice or 0)

        for it in items_source:
            qty = getattr(it, "quantity", None) or 1
            up = float(getattr(it, "unit_price", 0) or 0)
            pid = getattr(it, "product_id", None)
            selling = getattr(it, "selling_price", None)
            if selling is None or float(selling or 0) <= 0:
                selling = product_prices.get(pid, 0)
            ri = getattr(it, "received_quantity", 0) or 0
            nci = getattr(it, "non_conforming_quantity", 0) or 0
            expiry = getattr(it, "expiry_date", None)
            location = getattr(it, "location", None)
            note = getattr(it, "notes", None)
            batch_number = getattr(it, "batch_number", None)
            db.add(DeliveryItem(
                delivery_id=d.id,
                product_id=pid,
                quantity=qty,
                unit_price=up,
                selling_price=Decimal(str(selling or 0)),
                total_price=qty * up,
                received_quantity=ri,
                non_conforming_quantity=nci,
                expiry_date=expiry,
                location=location,
                notes=note,
                batch_number=batch_number,
                barcode=product_barcodes.get(pid),
            ))
        await db.commit()
        await db.refresh(d)
        return await DeliveryService.get_delivery(db, d.id)

    @staticmethod
    async def update_delivery(db, delivery_id, data: DeliveryUpdate):
        d = await DeliveryService._get_orm(db, delivery_id)
        if not d:
            return None
        d.supplier_id = data.supplier_id
        d.reference = data.reference
        d.delivery_date = data.delivery_date or d.delivery_date
        d.expected_date = data.expected_date
        d.status = data.status or d.status
        d.tracking_number = data.tracking_number
        d.notes = data.notes
        d.order_id = data.order_id
        d.received_at = data.received_at
        d.reception_notes = data.reception_notes
        d.invoice_path = data.invoice_path or d.invoice_path
        await db.execute(sql_delete(DeliveryItem).where(DeliveryItem.delivery_id == delivery_id), execution_options={"synchronize_session": False})
        await db.flush()
        # Code-barres et prix catalogue : source de vérité = produit.
        product_ids = {it.product_id for it in (data.items or []) if it.product_id}
        product_barcodes = {}
        product_prices = {}
        if product_ids:
            pres = await db.execute(
                select(Product.id, Product.barcode, Product.price).where(Product.id.in_(product_ids))
            )
            for pid, pbarcode, pprice in pres.all():
                product_barcodes[pid] = pbarcode
                product_prices[pid] = float(pprice or 0)
        for it in (data.items or []):
            qty = it.quantity or 1
            up = float(it.unit_price or 0)
            selling = it.selling_price
            if selling is None or float(selling or 0) <= 0:
                selling = product_prices.get(it.product_id, 0)
            db.add(DeliveryItem(
                delivery_id=d.id,
                product_id=it.product_id,
                quantity=qty,
                unit_price=up,
                selling_price=Decimal(str(selling or 0)),
                total_price=qty * up,
                received_quantity=it.received_quantity or 0,
                non_conforming_quantity=it.non_conforming_quantity or 0,
                expiry_date=it.expiry_date,
                location=it.location,
                notes=it.notes,
                batch_number=it.batch_number,
                barcode=product_barcodes.get(it.product_id),
            ))
        await db.commit()
        return await DeliveryService.get_delivery(db, delivery_id)

    @staticmethod
    async def update_status(db, delivery_id, status):
        d = await DeliveryService._get_orm(db, delivery_id)
        if not d:
            return None
        d.status = status
        # Stock entry on delivery validation
        if status == "delivered" and not d.stock_applied:
            for item in (d.items or []):
                conforming = max(0, (item.received_quantity or 0) - (item.non_conforming_quantity or 0))
                if conforming <= 0 or not item.product_id:
                    continue
                product = await db.get(Product, item.product_id)
                # Utiliser le numéro de lot saisi à la livraison
                batch_number = item.batch_number or f"REC-{d.id}-{item.id}-{uuid.uuid4().hex[:6]}"
                expiry = item.expiry_date or (date.today() + timedelta(days=365))
                location = item.location or "Réception"
                batch = Batch(
                    product_id=item.product_id,
                    batch_number=batch_number,
                    expiry_date=expiry,
                    quantity=conforming,
                    reserved_quantity=0,
                    initial_quantity=conforming,
                    location=location,
                    received_date=date.today(),
                    supplier_id=d.supplier_id,
                    cost_price=Decimal(str(item.unit_price or 0)),
                    selling_price=Decimal(
                        str(
                            item.selling_price
                            if getattr(item, "selling_price", None) and float(item.selling_price) > 0
                            else (product.price if product else 0)
                        )
                    ),
                    status="active",
                )
                db.add(batch)
            d.stock_applied = True
            if d.order_id:
                order = await db.get(Order, d.order_id)
                if order is not None:
                    order.status = "delivered"
        await db.commit()
        await db.refresh(d)
        return await DeliveryService.get_delivery(db, d.id)

    @staticmethod
    async def validate_delivery(db, delivery_id, user_id=None):
        d = await DeliveryService._get_orm(db, delivery_id)
        if not d:
            return None
        if d.status not in ("pending",):
            raise ValueError("Livraison %d ne peut pas etre validee (statut: %s)" % (delivery_id, d.status))
        d.status = "delivered"
        d.received_at = datetime.utcnow()
        if not d.stock_applied:
            for item in (d.items or []):
                conforming = max(0, (item.received_quantity or 0) - (item.non_conforming_quantity or 0))
                if conforming <= 0 or not item.product_id:
                    continue
                product = await db.get(Product, item.product_id)
                batch_number = item.batch_number or ("REC-%d-%d" % (d.id, item.id))
                expiry = item.expiry_date or (date.today() + timedelta(days=365))
                location = item.location or "Reception"
                existing = await db.execute(
                    select(Batch).where(Batch.batch_number == batch_number)
                )
                existing_batch = existing.scalar_one_or_none()
                if existing_batch is not None and existing_batch.product_id == item.product_id:
                    # Le meme lot est receptionne a nouveau : on cumule les
                    # quantites au lieu de violer la contrainte d'unicite.
                    existing_batch.quantity = int(existing_batch.quantity or 0) + conforming
                    existing_batch.initial_quantity = int(existing_batch.initial_quantity or 0) + conforming
                else:
                    if existing_batch is not None:
                        # Numero de lot deja utilise pour un autre produit :
                        # on le rend unique.
                        batch_number = "%s-%d-%d" % (batch_number, d.id, item.id)
                    db.add(Batch(
                        product_id=item.product_id,
                        batch_number=batch_number,
                        expiry_date=expiry,
                        quantity=conforming,
                        reserved_quantity=0,
                        initial_quantity=conforming,
                        location=location,
                        received_date=date.today(),
                        supplier_id=d.supplier_id,
                        cost_price=Decimal(str(item.unit_price or 0)),
                        selling_price=Decimal(
                            str(
                                item.selling_price
                                if getattr(item, "selling_price", None) and float(item.selling_price) > 0
                                else (product.price if product else 0)
                            )
                        ),
                        status="active",
                    ))
            d.stock_applied = True
            if d.order_id:
                order = await db.get(Order, d.order_id)
                if order is not None:
                    order.status = "delivered"
        await db.commit()
        await db.refresh(d)
        return await DeliveryService.get_delivery(db, d.id)

    @staticmethod
    async def reject_delivery(db, delivery_id, user_id=None, reason=None):
        d = await DeliveryService._get_orm(db, delivery_id)
        if not d:
            return None
        if d.status not in ("pending",):
            raise ValueError("Livraison %d ne peut pas etre rejetee (statut: %s)" % (delivery_id, d.status))
        d.status = "rejected"
        if reason:
            d.reception_notes = (d.reception_notes or "") + "\n[Rejet] " + str(reason)
        await db.commit()
        await db.refresh(d)
        return await DeliveryService.get_delivery(db, delivery_id)

    @staticmethod
    async def delete_delivery(db, delivery_id):
        d = await DeliveryService._get_orm(db, delivery_id)
        if not d:
            return False
        await db.delete(d)
        await db.commit()
        return True

    @staticmethod
    async def _get_orm(db, delivery_id):
        result = await db.execute(
            select(Delivery).options(selectinload(Delivery.items)).where(Delivery.id == delivery_id)
        )
        return result.scalar_one_or_none()


class DeliveryItemCreateProxy:
    def __init__(self, product_id=None, quantity=1, unit_price=0.0):
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
        self.selling_price = None
        self.received_quantity = 0
        self.non_conforming_quantity = 0
        self.expiry_date = None
        self.location = None
        self.notes = None
