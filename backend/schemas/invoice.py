"""
Invoice Schemas for Pharmacie 360 Backend
Pydantic models for invoice data validation
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class InvoiceBase(BaseModel):
    """Base invoice schema"""

    invoice_number: str = Field(
        ..., min_length=1, max_length=50, description="Invoice number"
    )
    supplier_id: int = Field(..., ge=1, description="Supplier ID")
    invoice_date: date = Field(default_factory=date.today, description="Invoice date")
    due_date: Optional[date] = Field(None, description="Payment due date")
    subtotal: float = Field(default=0.0, ge=0, description="Subtotal amount")
    tax_amount: float = Field(default=0.0, ge=0, description="Tax amount")
    discount: float = Field(default=0.0, ge=0, description="Discount amount")
    total_final: float = Field(default=0.0, ge=0, description="Final total amount")
    status: str = Field(default="draft", description="Invoice status")
    payment_method: Optional[str] = Field(
        None, max_length=50, description="Payment method"
    )
    payment_date: Optional[date] = Field(None, description="Payment date")
    file_path: Optional[str] = Field(
        None, max_length=255, description="Invoice file path"
    )
    ocr_processed: bool = Field(
        default=False, description="Whether OCR processing is done"
    )
    notes: Optional[str] = Field(None, description="Additional notes")


class InvoiceCreate(InvoiceBase):
    """Schema for creating a new invoice"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "invoice_number": "INV-2025-001",
                "supplier_id": 1,
                "date": "2025-01-15",
                "due_date": "2025-02-14",
                "subtotal": 100000.00,
                "tax_amount": 18000.00,
                "discount": 0.00,
                "total_final": 118000.00,
                "status": "pending",
                "payment_method": "cash",
            }
        }
    )


class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice"""

    invoice_number: Optional[str] = Field(None, min_length=1, max_length=50)
    supplier_id: Optional[int] = Field(None, ge=1)
    invoice_date: Optional[date] = Field(None)
    due_date: Optional[date] = Field(None)
    subtotal: Optional[float] = Field(None, ge=0)
    tax_amount: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    total_final: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None)
    payment_method: Optional[str] = Field(None, max_length=50)
    payment_date: Optional[date] = Field(None)
    file_path: Optional[str] = Field(None, max_length=255)
    ocr_processed: Optional[bool] = Field(None)
    ocr_data: Optional[dict] = Field(None, description="OCR extracted data")
    notes: Optional[str] = Field(None)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "paid",
                "payment_date": "2025-01-15",
                "payment_method": "bank_transfer",
                "ocr_processed": True,
            }
        }
    )


class InvoiceResponse(InvoiceBase):
    """Schema for invoice response"""

    id: int = Field(..., description="Invoice ID")
    supplier_name: Optional[str] = Field(None, description="Supplier name")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_paid: bool = Field(..., description="Whether invoice is paid")
    is_pending: bool = Field(..., description="Whether invoice is pending")
    is_overdue: bool = Field(..., description="Whether invoice is overdue")
    days_until_due: Optional[int] = Field(None, description="Days until due date")
    total_with_tax: float = Field(..., description="Total including tax")
    batch_count: int = Field(
        default=0, description="Number of batches from this invoice"
    )

    model_config = ConfigDict(from_attributes=True)


class InvoiceDetailResponse(InvoiceResponse):
    """Schema for detailed invoice response with batches"""

    batches: List[dict] = Field(
        default_factory=list, description="Batches from this invoice"
    )


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list"""

    invoices: List[InvoiceResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of invoices")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class InvoiceStatusUpdate(BaseModel):
    """Schema for updating invoice status"""

    status: str = Field(..., description="New status")
    payment_date: Optional[date] = Field(
        None, description="Payment date (if status is paid)"
    )
    payment_method: Optional[str] = Field(None, description="Payment method")
    notes: Optional[str] = Field(None, description="Additional notes")


class OCRInvoiceData(BaseModel):
    """Schema for OCR extracted invoice data"""

    supplier_name: Optional[str] = Field(None, description="Supplier name from OCR")
    invoice_number: Optional[str] = Field(None, description="Invoice number from OCR")
    date: Optional[str] = Field(None, description="Date from OCR")
    due_date: Optional[str] = Field(None, description="Due date from OCR")
    items: List[dict] = Field(default_factory=list, description="Line items from OCR")
    subtotal: Optional[float] = Field(None, description="Subtotal from OCR")
    tax_amount: Optional[float] = Field(None, description="Tax amount from OCR")
    total: Optional[float] = Field(None, description="Total from OCR")
    confidence: Optional[float] = Field(None, description="OCR confidence score")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "supplier_name": "Pharma Distributeur SA",
                "invoice_number": "INV-2025-001",
                "date": "2025-01-15",
                "items": [
                    {
                        "name": "Paracetamol 500mg",
                        "quantity": 100,
                        "unit_price": 500.00,
                        "total": 50000.00,
                    },
                    {
                        "name": "Amoxicillin 250mg",
                        "quantity": 50,
                        "unit_price": 1000.00,
                        "total": 50000.00,
                    },
                ],
                "subtotal": 100000.00,
                "tax_amount": 18000.00,
                "total": 118000.00,
                "confidence": 0.95,
            }
        }
    )
