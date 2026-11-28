"""Schemas du module Assurance."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InsuranceStructureBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    code: Optional[str] = Field(None, max_length=50)
    contact: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=120)
    address: Optional[str] = None
    default_rate: Decimal = Field(default=0, ge=0, le=100)
    is_active: bool = True


class InsuranceStructureCreate(InsuranceStructureBase):
    pass


class InsuranceStructureUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, max_length=50)
    contact: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=120)
    address: Optional[str] = None
    default_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class InsuranceStructureResponse(InsuranceStructureBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class InsuranceClientBase(BaseModel):
    structure_id: int
    customer_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    policy_number: Optional[str] = Field(None, max_length=80)
    coverage_rate: Decimal = Field(default=0, ge=0, le=100)
    is_active: bool = True


class InsuranceClientCreate(InsuranceClientBase):
    pass


class InsuranceClientUpdate(BaseModel):
    structure_id: Optional[int] = None
    customer_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    policy_number: Optional[str] = Field(None, max_length=80)
    coverage_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class InsuranceClientResponse(InsuranceClientBase):
    id: int
    structure_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class InsuranceListResponse(BaseModel):
    structures: list[InsuranceStructureResponse] = Field(default_factory=list)
    total: int = 0
