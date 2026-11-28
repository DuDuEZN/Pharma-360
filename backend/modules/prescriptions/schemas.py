"""Schemas du module Ordonnancier."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class PrescriptionBase(BaseModel):
    prescription_type: Literal["SIMPLE", "ASSURANCE"] = "SIMPLE"
    patient_name: str = Field(..., min_length=1, max_length=150)
    prescriber_name: str = Field(..., min_length=1, max_length=150)
    prescriber_registration: str = Field(..., min_length=1, max_length=100)
    health_structure: str = Field(..., min_length=1, max_length=150)
    notes: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    sale_id: Optional[int] = None
    customer_id: Optional[int] = None
    insurance_structure_id: Optional[int] = None
    insurance_client_id: Optional[int] = None


class PrescriptionUpdate(BaseModel):
    prescription_type: Optional[Literal["SIMPLE", "ASSURANCE"]] = None
    patient_name: Optional[str] = Field(None, min_length=1, max_length=150)
    prescriber_name: Optional[str] = Field(None, min_length=1, max_length=150)
    prescriber_registration: Optional[str] = Field(None, min_length=1, max_length=100)
    health_structure: Optional[str] = Field(None, min_length=1, max_length=150)
    notes: Optional[str] = None


class PrescriptionResponse(PrescriptionBase):
    id: int
    prescription_number: str
    sale_id: Optional[int] = None
    sale_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    insurance_structure_id: Optional[int] = None
    insurance_structure_name: Optional[str] = None
    insurance_client_id: Optional[int] = None
    insurance_client_name: Optional[str] = None
    created_by: Optional[int] = None
    author_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrescriptionListResponse(BaseModel):
    items: list[PrescriptionResponse] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


class AutocompleteResponse(BaseModel):
    items: list[str] = Field(default_factory=list)
