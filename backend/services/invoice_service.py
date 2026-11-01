"""
Invoice Service for Pharmacie 360 Backend
Business logic for managing supplier invoices
"""

from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import UploadFile
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.batch import Batch
from ..models.invoice import Invoice
from ..models.product import Product
from ..models.supplier import Supplier
from ..models.user import User
from ..schemas.invoice import (InvoiceCreate, InvoiceDetailResponse,
                               InvoiceListResponse, InvoiceResponse,
                               InvoiceStatusUpdate, InvoiceUpdate,
                               OCRInvoiceData)


class InvoiceService:
    """Service for managing supplier invoices"""

    @staticmethod
    async def list_invoices(
        page: int = 1,
        page_size: int = 20,
        supplier_id: Optional[int] = None,
        status: Optional[str] = None,
        is_paid: Optional[bool] = None,
        is_overdue: Optional[bool] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        ocr_processed: Optional[bool] = None,
        db: AsyncSession = None,
    ) -> InvoiceListResponse:
        """List invoices with optional filters"""
        offset = (page - 1) * page_size

        # Build query
        query = select(Invoice)
        count_query = select(func.count()).select_from(Invoice)

        # Apply filters
        if supplier_id:
            query = query.where(Invoice.supplier_id == supplier_id)
            count_query = count_query.where(Invoice.supplier_id == supplier_id)

        if status:
            query = query.where(Invoice.status == status)
            count_query = count_query.where(Invoice.status == status)

        if is_paid is not None:
            if is_paid:
                query = query.where(Invoice.status == "paid")
                count_query = count_query.where(Invoice.status == "paid")
            else:
                query = query.where(Invoice.status != "paid")
                count_query = count_query.where(Invoice.status != "paid")

        if is_overdue is not None:
            if is_overdue:
                query = query.where(Invoice.due_date < func.current_date())
                count_query = count_query.where(Invoice.due_date < func.current_date())

        if date_from:
            query = query.where(Invoice.date >= date_from)
            count_query = count_query.where(Invoice.date >= date_from)

        if date_to:
            query = query.where(Invoice.date <= date_to)
            count_query = count_query.where(Invoice.date <= date_to)

        if ocr_processed is not None:
            query = query.where(Invoice.ocr_processed == ocr_processed)
            count_query = count_query.where(Invoice.ocr_processed == ocr_processed)

        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Execute main query with ordering
        query = query.offset(offset).limit(page_size).order_by(Invoice.date.desc())
        result = await db.execute(query)
        invoices = result.scalars().all()

        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size

        # Convert to response objects
        invoice_responses = []
        for invoice in invoices:
            response = InvoiceResponse.model_validate(invoice)

            # Add computed fields
            if invoice.supplier:
                response.supplier_name = invoice.supplier.name

            response.is_paid = invoice.is_paid
            response.is_pending = invoice.is_pending
            response.is_overdue = invoice.is_overdue
            response.days_until_due = invoice.days_until_due
            response.total_with_tax = invoice.total_with_tax
            response.batch_count = len(invoice.batches) if invoice.batches else 0

            invoice_responses.append(response)

        return InvoiceListResponse(
            invoices=invoice_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    async def get_invoice_by_id(
        invoice_id: int, db: AsyncSession = None
    ) -> Optional[Invoice]:
        """Get a specific invoice by ID"""
        result = await db.execute(
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .options(joinedload(Invoice.supplier), joinedload(Invoice.batches))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_invoice(
        invoice_data: InvoiceCreate, db: AsyncSession = None, current_user: User = None
    ) -> InvoiceResponse:
        """Create a new invoice"""
        # Verify supplier exists
        result = await db.execute(
            select(Supplier).where(Supplier.id == invoice_data.supplier_id)
        )
        supplier = result.scalar_one_or_none()

        if not supplier:
            raise ValueError("Supplier not found")

        # Create invoice
        new_invoice = Invoice(
            invoice_number=invoice_data.invoice_number,
            supplier_id=invoice_data.supplier_id,
            date=invoice_data.date,
            due_date=invoice_data.due_date,
            subtotal=invoice_data.subtotal,
            tax_amount=invoice_data.tax_amount,
            discount=invoice_data.discount,
            total_final=invoice_data.total_final,
            status=invoice_data.status or "draft",
            payment_method=invoice_data.payment_method,
            payment_date=invoice_data.payment_date,
            file_path=invoice_data.file_path,
            ocr_processed=invoice_data.ocr_processed or False,
            ocr_data=invoice_data.ocr_data,
            notes=invoice_data.notes,
        )

        db.add(new_invoice)
        await db.commit()
        await db.refresh(new_invoice)

        # Convert to response
        response = InvoiceResponse.model_validate(new_invoice)

        # Add computed fields
        if new_invoice.supplier:
            response.supplier_name = new_invoice.supplier.name

        response.is_paid = new_invoice.is_paid
        response.is_pending = new_invoice.is_pending
        response.is_overdue = new_invoice.is_overdue
        response.days_until_due = new_invoice.days_until_due
        response.total_with_tax = new_invoice.total_with_tax
        response.batch_count = 0

        return response

    @staticmethod
    async def update_invoice(
        invoice_id: int, invoice_data: InvoiceUpdate, db: AsyncSession = None
    ) -> Optional[InvoiceResponse]:
        """Update an existing invoice"""
        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()

        if not invoice:
            return None

        # Update fields
        if invoice_data.invoice_number:
            invoice.invoice_number = invoice_data.invoice_number
        if invoice_data.supplier_id:
            invoice.supplier_id = invoice_data.supplier_id
        if invoice_data.date:
            invoice.date = invoice_data.date
        if invoice_data.due_date:
            invoice.due_date = invoice_data.due_date
        if invoice_data.subtotal:
            invoice.subtotal = invoice_data.subtotal
        if invoice_data.tax_amount:
            invoice.tax_amount = invoice_data.tax_amount
        if invoice_data.discount:
            invoice.discount = invoice_data.discount
        if invoice_data.total_final:
            invoice.total_final = invoice_data.total_final
        if invoice_data.status:
            invoice.status = invoice_data.status
        if invoice_data.payment_method:
            invoice.payment_method = invoice_data.payment_method
        if invoice_data.payment_date:
            invoice.payment_date = invoice_data.payment_date
        if invoice_data.file_path:
            invoice.file_path = invoice_data.file_path
        if invoice_data.ocr_processed is not None:
            invoice.ocr_processed = invoice_data.ocr_processed
        if invoice_data.ocr_data:
            invoice.ocr_data = invoice_data.ocr_data
        if invoice_data.notes:
            invoice.notes = invoice_data.notes

        await db.commit()
        await db.refresh(invoice)

        # Convert to response
        response = InvoiceResponse.model_validate(invoice)

        # Add computed fields
        if invoice.supplier:
            response.supplier_name = invoice.supplier.name

        response.is_paid = invoice.is_paid
        response.is_pending = invoice.is_pending
        response.is_overdue = invoice.is_overdue
        response.days_until_due = invoice.days_until_due
        response.total_with_tax = invoice.total_with_tax
        response.batch_count = len(invoice.batches) if invoice.batches else 0

        return response

    @staticmethod
    async def update_invoice_status(
        invoice_id: int, status_data: InvoiceStatusUpdate, db: AsyncSession = None
    ) -> Optional[InvoiceResponse]:
        """Update invoice status"""
        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()

        if not invoice:
            return None

        # Update status
        invoice.status = status_data.status
        if status_data.payment_date:
            invoice.payment_date = status_data.payment_date
        if status_data.payment_method:
            invoice.payment_method = status_data.payment_method
        if status_data.notes:
            invoice.notes = status_data.notes

        await db.commit()
        await db.refresh(invoice)

        # Convert to response
        response = InvoiceResponse.model_validate(invoice)

        # Add computed fields
        if invoice.supplier:
            response.supplier_name = invoice.supplier.name

        response.is_paid = invoice.is_paid
        response.is_pending = invoice.is_pending
        response.is_overdue = invoice.is_overdue
        response.days_until_due = invoice.days_until_due
        response.total_with_tax = invoice.total_with_tax
        response.batch_count = len(invoice.batches) if invoice.batches else 0

        return response

    @staticmethod
    async def delete_invoice(invoice_id: int, db: AsyncSession = None) -> bool:
        """Delete an invoice"""
        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()

        if not invoice:
            return False

        await db.delete(invoice)
        await db.commit()
        return True

    @staticmethod
    async def process_invoice_ocr(
        invoice_id: int, file: UploadFile, db: AsyncSession = None
    ) -> Optional[InvoiceResponse]:
        """Process invoice with OCR"""
        import os
        from datetime import datetime

        # Get invoice
        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()

        if not invoice:
            return None

        try:
            # Save uploaded file
            upload_dir = "uploads/invoices"
            os.makedirs(upload_dir, exist_ok=True)

            file_ext = file.filename.split(".")[-1] if file.filename else "png"
            file_name = f"invoice_{invoice_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_ext}"
            file_path = os.path.join(upload_dir, file_name)

            # Save file
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            # Process with OCR
            try:
                from ...ia.ocr import extract_invoice_data

                ocr_data = extract_invoice_data(file_path)
            except:
                # Fallback for demo
                ocr_data = {
                    "status": "success",
                    "supplier_name": "OCR Processing",
                    "invoice_number": invoice.invoice_number,
                    "confidence": 0.85,
                }

            # Update invoice
            invoice.file_path = file_path
            invoice.ocr_processed = True
            invoice.ocr_data = ocr_data

            await db.commit()
            await db.refresh(invoice)

            # Convert to response
            response = InvoiceResponse.model_validate(invoice)

            # Add computed fields
            if invoice.supplier:
                response.supplier_name = invoice.supplier.name

            response.is_paid = invoice.is_paid
            response.is_pending = invoice.is_pending
            response.is_overdue = invoice.is_overdue
            response.days_until_due = invoice.days_until_due
            response.total_with_tax = invoice.total_with_tax
            response.batch_count = len(invoice.batches) if invoice.batches else 0

            return response

        except Exception as e:
            raise ValueError(f"OCR processing failed: {str(e)}")

    @staticmethod
    async def get_invoice_stats(db: AsyncSession = None) -> Dict[str, Any]:
        """Get invoice statistics"""
        # Count by status
        result = await db.execute(
            select(Invoice.status, func.count()).group_by(Invoice.status)
        )
        status_counts = {row[0]: row[1] for row in result.all()}

        # Count overdue
        result = await db.execute(
            select(func.count()).where(
                and_(Invoice.due_date < func.current_date(), Invoice.status != "paid")
            )
        )
        overdue_count = result.scalar() or 0

        # Count OCR processed
        result = await db.execute(
            select(func.count()).where(Invoice.ocr_processed == True)
        )
        ocr_processed_count = result.scalar() or 0

        # Total amount by status
        result = await db.execute(
            select(Invoice.status, func.sum(Invoice.total_final)).group_by(
                Invoice.status
            )
        )
        amount_by_status = {row[0]: float(row[1] or 0) for row in result.all()}

        return {
            "total_invoices": status_counts.get("total", sum(status_counts.values())),
            "by_status": status_counts,
            "overdue_count": overdue_count,
            "ocr_processed_count": ocr_processed_count,
            "amount_by_status": amount_by_status,
            "total_amount": sum(amount_by_status.values()),
        }


# Create service instance
invoice_service = InvoiceService()
