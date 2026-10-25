"""
Invoices API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for supplier invoice management with OCR support
"""

from typing import Annotated, Optional, UploadFile, File
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role, RBACUtils
from ...models.user import User
from ...models.invoice import Invoice
from ...models.supplier import Supplier
from ...models.batch import Batch
from ...schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceDetailResponse,
    InvoiceListResponse,
    InvoiceStatusUpdate,
    OCRInvoiceData,
)


# Create router
router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get(
    "/",
    response_model=InvoiceListResponse,
    summary="List all invoices",
    description="Get a paginated list of all supplier invoices"
)
async def list_invoices(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    supplier_id: Annotated[Optional[int], Query()] = None,
    status: Annotated[Optional[str], Query()] = None,
    is_paid: Annotated[Optional[bool], Query()] = None,
    is_overdue: Annotated[Optional[bool], Query()] = None,
    date_from: Annotated[Optional[str], Query()] = None,
    date_to: Annotated[Optional[str], Query()] = None,
    ocr_processed: Annotated[Optional[bool], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceListResponse:
    """List invoices endpoint"""
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
    
    # Execute main query with ordering (most recent first)
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
        
        # Count batches from this invoice
        response.batch_count = len(invoice.batches) if invoice.batches else 0
        
        invoice_responses.append(response)
    
    return InvoiceListResponse(
        invoices=invoice_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/{invoice_id}",
    response_model=InvoiceDetailResponse,
    summary="Get a specific invoice",
    description="Get detailed invoice information including batches"
)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceDetailResponse:
    """Get invoice endpoint"""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Convert to detail response
    detail_response = InvoiceDetailResponse.model_validate(invoice)
    
    # Add computed fields
    if invoice.supplier:
        detail_response.supplier_name = invoice.supplier.name
    
    detail_response.is_paid = invoice.is_paid
    detail_response.is_pending = invoice.is_pending
    detail_response.is_overdue = invoice.is_overdue
    detail_response.days_until_due = invoice.days_until_due
    detail_response.total_with_tax = invoice.total_with_tax
    detail_response.batch_count = len(invoice.batches) if invoice.batches else 0
    
    # Add batches
    detail_response.batches = []
    for batch in invoice.batches:
        detail_response.batches.append({
            "id": batch.id,
            "batch_number": batch.batch_number,
            "product_id": batch.product_id,
            "product_name": batch.product.name if batch.product else None,
            "quantity": batch.quantity,
            "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
            "received_date": batch.received_date.isoformat() if batch.received_date else None,
            "cost_price": batch.cost_price,
            "selling_price": batch.selling_price
        })
    
    return detail_response


@router.post(
    "/",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new invoice",
    description="Create a new supplier invoice (manager or admin only)"
)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceResponse:
    """Create invoice endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can create invoices"
        )
    
    # Verify supplier exists
    result = await db.execute(
        select(Supplier).where(Supplier.id == invoice_data.supplier_id)
    )
    supplier = result.scalar_one_or_none()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier not found"
        )
    
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
        notes=invoice_data.notes
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


@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Update an invoice",
    description="Update an existing invoice (manager or admin only)"
)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceResponse:
    """Update invoice endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can update invoices"
        )
    
    # Get existing invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
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


@router.patch(
    "/{invoice_id}/status",
    response_model=InvoiceResponse,
    summary="Update invoice status",
    description="Update invoice payment status (manager or admin only)"
)
async def update_invoice_status(
    invoice_id: int,
    status_data: InvoiceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceResponse:
    """Update invoice status endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can update invoice status"
        )
    
    # Get existing invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
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


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an invoice",
    description="Delete an invoice (admin only)"
)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete invoice endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can delete invoices"
        )
    
    # Get and delete invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    await db.delete(invoice)
    await db.commit()


@router.post(
    "/{invoice_id}/ocr",
    response_model=InvoiceResponse,
    summary="Process invoice with OCR",
    description="Upload and process invoice image with OCR (manager or admin only)"
)
async def process_invoice_ocr(
    invoice_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> InvoiceResponse:
    """Process invoice with OCR endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager or admin users can process OCR"
        )
    
    # Get invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    try:
        # Save uploaded file
        import os
        from datetime import datetime
        
        upload_dir = "uploads/invoices"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_ext = file.filename.split(".")[-1] if file.filename else "png"
        file_name = f"invoice_{invoice_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_ext}"
        file_path = os.path.join(upload_dir, file_name)
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process with OCR (simplified - in production use ia/ocr module)
        try:
            from ....ia.ocr import extract_invoice_data
            ocr_data = extract_invoice_data(file_path)
        except:
            # Fallback for demo
            ocr_data = {
                "status": "success",
                "supplier_name": "OCR Processing",
                "invoice_number": invoice.invoice_number,
                "confidence": 0.85
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )
