"""
Supplier Service for Pharmacie 360 Backend
Business logic for supplier management
"""

from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models.supplier import Supplier
from ..models.product import Product
from ..models.invoice import Invoice
from ..models.batch import Batch
from ..schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierDetailResponse,
    SupplierListResponse,
)


class SupplierService:
    """Service class for supplier operations"""

    @staticmethod
    async def create_supplier(
        supplier_data: SupplierCreate,
        db: AsyncSession
    ) -> SupplierResponse:
        """Create a new supplier"""
        new_supplier = Supplier(
            name=supplier_data.name,
            contact=supplier_data.contact,
            email=supplier_data.email,
            phone=supplier_data.phone,
            address=supplier_data.address,
            city=supplier_data.city,
            country=supplier_data.country,
            tax_id=supplier_data.tax_id,
            payment_terms=supplier_data.payment_terms,
            is_active=supplier_data.is_active,
        )
        
        db.add(new_supplier)
        await db.flush()
        await db.refresh(new_supplier)
        
        # Convert to response
        response = SupplierResponse.model_validate(new_supplier)
        response.product_count = 0
        response.invoice_count = 0
        response.total_purchases = 0.0
        
        return response

    @staticmethod
    async def get_supplier_by_id(
        supplier_id: int,
        db: AsyncSession
    ) -> Optional[Supplier]:
        """Get a supplier by ID"""
        result = await db.execute(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_supplier_by_name(
        name: str,
        db: AsyncSession
    ) -> Optional[Supplier]:
        """Get a supplier by name"""
        result = await db.execute(
            select(Supplier).where(Supplier.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_suppliers(
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        db: AsyncSession = None
    ) -> SupplierListResponse:
        """List all suppliers with pagination"""
        query = select(Supplier)
        
        # Apply filters
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Supplier.name.ilike(search_pattern),
                    Supplier.contact.ilike(search_pattern),
                    Supplier.email.ilike(search_pattern),
                    Supplier.phone.ilike(search_pattern),
                )
            )
        
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
        
        # Count total
        count_result = await db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()
        
        # Apply pagination
        query = query.order_by(Supplier.name.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await db.execute(query)
        suppliers = result.scalars().all()
        
        # Convert to response
        supplier_responses = []
        for supplier in suppliers:
            response = SupplierResponse.model_validate(supplier)
            
            # Get counts
            product_count = await SupplierService._get_product_count(supplier.id, db)
            invoice_count = await SupplierService._get_invoice_count(supplier.id, db)
            total_purchases = await SupplierService._get_total_purchases(supplier.id, db)
            
            response.product_count = product_count
            response.invoice_count = invoice_count
            response.total_purchases = total_purchases
            
            supplier_responses.append(response)
        
        total_pages = (total + page_size - 1) // page_size
        
        return SupplierListResponse(
            suppliers=supplier_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    @staticmethod
    async def update_supplier(
        supplier_id: int,
        supplier_data: SupplierUpdate,
        db: AsyncSession
    ) -> Optional[SupplierResponse]:
        """Update a supplier"""
        supplier = await SupplierService.get_supplier_by_id(supplier_id, db)
        
        if not supplier:
            return None
        
        # Update fields
        if supplier_data.name:
            supplier.name = supplier_data.name
        if supplier_data.contact:
            supplier.contact = supplier_data.contact
        if supplier_data.email:
            supplier.email = supplier_data.email
        if supplier_data.phone:
            supplier.phone = supplier_data.phone
        if supplier_data.address:
            supplier.address = supplier_data.address
        if supplier_data.city:
            supplier.city = supplier_data.city
        if supplier_data.country:
            supplier.country = supplier_data.country
        if supplier_data.tax_id:
            supplier.tax_id = supplier_data.tax_id
        if supplier_data.payment_terms:
            supplier.payment_terms = supplier_data.payment_terms
        if supplier_data.is_active is not None:
            supplier.is_active = supplier_data.is_active
        
        await db.flush()
        await db.refresh(supplier)
        
        # Convert to response
        response = SupplierResponse.model_validate(supplier)
        response.product_count = await SupplierService._get_product_count(supplier.id, db)
        response.invoice_count = await SupplierService._get_invoice_count(supplier.id, db)
        response.total_purchases = await SupplierService._get_total_purchases(supplier.id, db)
        
        return response

    @staticmethod
    async def delete_supplier(
        supplier_id: int,
        db: AsyncSession
    ) -> bool:
        """Delete a supplier"""
        supplier = await SupplierService.get_supplier_by_id(supplier_id, db)
        
        if not supplier:
            return False
        
        await db.delete(supplier)
        await db.commit()
        return True

    @staticmethod
    async def get_supplier_detail(
        supplier_id: int,
        db: AsyncSession
    ) -> Optional[SupplierDetailResponse]:
        """Get detailed supplier information with products and invoices"""
        supplier = await SupplierService.get_supplier_by_id(supplier_id, db)
        
        if not supplier:
            return None
        
        # Get products from this supplier
        products_result = await db.execute(
            select(Product)
            .where(Product.supplier_id == supplier_id)
            .order_by(Product.name.asc())
            .limit(10)
        )
        products = products_result.scalars().all()
        
        # Get recent invoices
        invoices_result = await db.execute(
            select(Invoice)
            .where(Invoice.supplier_id == supplier_id)
            .order_by(Invoice.date.desc())
            .limit(5)
        )
        invoices = invoices_result.scalars().all()
        
        # Convert to response
        response = SupplierDetailResponse.model_validate(supplier)
        response.product_count = await SupplierService._get_product_count(supplier.id, db)
        response.invoice_count = await SupplierService._get_invoice_count(supplier.id, db)
        response.total_purchases = await SupplierService._get_total_purchases(supplier.id, db)
        
        # Add products
        response.products = [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "current_stock": p.current_stock
            }
            for p in products
        ]
        
        # Add recent invoices
        response.recent_invoices = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "date": inv.date.isoformat(),
                "total_final": float(inv.total_final),
                "status": inv.status
            }
            for inv in invoices
        ]
        
        return response

    @staticmethod
    async def _get_product_count(supplier_id: int, db: AsyncSession) -> int:
        """Get product count for a supplier"""
        result = await db.execute(
            select(func.count())
            .select_from(Product)
            .where(Product.supplier_id == supplier_id)
        )
        return result.scalar_one()

    @staticmethod
    async def _get_invoice_count(supplier_id: int, db: AsyncSession) -> int:
        """Get invoice count for a supplier"""
        result = await db.execute(
            select(func.count())
            .select_from(Invoice)
            .where(Invoice.supplier_id == supplier_id)
        )
        return result.scalar_one()

    @staticmethod
    async def _get_total_purchases(supplier_id: int, db: AsyncSession) -> float:
        """Get total purchases from a supplier"""
        result = await db.execute(
            select(func.coalesce(func.sum(Invoice.total_final), 0))
            .select_from(Invoice)
            .where(Invoice.supplier_id == supplier_id)
        )
        return float(result.scalar_one())

    @staticmethod
    async def get_supplier_stats(db: AsyncSession) -> dict:
        """Get supplier statistics"""
        # Total suppliers
        total_result = await db.execute(select(func.count()).select_from(Supplier))
        total_suppliers = total_result.scalar_one()
        
        # Active suppliers
        active_result = await db.execute(
            select(func.count()).select_from(Supplier).where(Supplier.is_active == True)
        )
        active_suppliers = active_result.scalar_one()
        
        # Total purchases
        purchases_result = await db.execute(
            select(func.coalesce(func.sum(Invoice.total_final), 0)).select_from(Invoice)
        )
        total_purchases = float(purchases_result.scalar_one())
        
        # Top suppliers by purchases
        top_suppliers_result = await db.execute(
            select(
                Supplier.id,
                Supplier.name,
                func.coalesce(func.sum(Invoice.total_final), 0).label("total")
            )
            .select_from(Supplier)
            .outerjoin(Invoice, Supplier.id == Invoice.supplier_id)
            .group_by(Supplier.id, Supplier.name)
            .order_by(desc("total"))
            .limit(5)
        )
        top_suppliers = [
            {"id": row.id, "name": row.name, "total": float(row.total)}
            for row in top_suppliers_result.all()
        ]
        
        return {
            "total_suppliers": total_suppliers,
            "active_suppliers": active_suppliers,
            "inactive_suppliers": total_suppliers - active_suppliers,
            "total_purchases": total_purchases,
            "top_suppliers": top_suppliers
        }
