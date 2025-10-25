"""
HUD Compliance Pydantic Schemas
Request and response schemas for HUD compliance API endpoints
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.models.hud import (
    CertificationType, CertificationStatus, RelationshipType,
    IncomeType, VerificationType, InspectionType, InspectionStatus
)


# Base schemas
class BaseHUDModel(BaseModel):
    """Base model for HUD compliance entities"""
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            UUID: str,
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }


# Tenant Income Certification Schemas
class TenantIncomeCertificationBase(BaseHUDModel):
    """Base schema for tenant income certification"""
    tenant_id: str
    property_id: str
    unit_id: Optional[str] = None
    certification_date: date
    effective_date: date
    cert_type: CertificationType
    household_size: int = Field(..., ge=1, le=20)
    annual_income: str  # Decimal as string
    adjusted_income: str  # Decimal as string
    tenant_rent_portion: str  # Decimal as string
    utility_allowance: str  # Decimal as string
    subsidy_amount: str  # Decimal as string
    certification_status: CertificationStatus = CertificationStatus.PENDING
    hud_50059_submitted: bool = False
    hud_50059_submission_date: Optional[datetime] = None


class TenantIncomeCertificationCreate(TenantIncomeCertificationBase):
    """Schema for creating a tenant income certification"""
    pass


class TenantIncomeCertificationUpdate(BaseHUDModel):
    """Schema for updating a tenant income certification"""
    certification_date: Optional[date] = None
    effective_date: Optional[date] = None
    cert_type: Optional[CertificationType] = None
    household_size: Optional[int] = Field(None, ge=1, le=20)
    annual_income: Optional[str] = None
    adjusted_income: Optional[str] = None
    tenant_rent_portion: Optional[str] = None
    utility_allowance: Optional[str] = None
    subsidy_amount: Optional[str] = None
    certification_status: Optional[CertificationStatus] = None
    hud_50059_submitted: Optional[bool] = None
    hud_50059_submission_date: Optional[datetime] = None


class TenantIncomeCertificationResponse(TenantIncomeCertificationBase):
    """Schema for tenant income certification response"""
    id: str
    org_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# Household Member Schemas
class HouseholdMemberBase(BaseHUDModel):
    """Base schema for household member"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: date
    relationship_type: RelationshipType
    ssn_last_four: Optional[str] = Field(None, pattern=r'^\d{4}$')
    is_head_of_household: bool = False


class HouseholdMemberCreate(HouseholdMemberBase):
    """Schema for creating a household member"""
    pass


class HouseholdMemberUpdate(BaseHUDModel):
    """Schema for updating a household member"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    relationship_type: Optional[RelationshipType] = None
    ssn_last_four: Optional[str] = Field(None, pattern=r'^\d{4}$')
    is_head_of_household: Optional[bool] = None


class HouseholdMemberResponse(HouseholdMemberBase):
    """Schema for household member response"""
    id: str
    certification_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# Income Source Schemas
class IncomeSourceBase(BaseHUDModel):
    """Base schema for income source"""
    income_type: IncomeType
    source_name: str = Field(..., min_length=1, max_length=200)
    monthly_amount: str  # Decimal as string
    verification_type: VerificationType
    verification_date: Optional[date] = None
    verification_notes: Optional[str] = Field(None, max_length=500)


class IncomeSourceCreate(IncomeSourceBase):
    """Schema for creating an income source"""
    pass


class IncomeSourceUpdate(BaseHUDModel):
    """Schema for updating an income source"""
    income_type: Optional[IncomeType] = None
    source_name: Optional[str] = Field(None, min_length=1, max_length=200)
    monthly_amount: Optional[str] = None
    verification_type: Optional[VerificationType] = None
    verification_date: Optional[date] = None
    verification_notes: Optional[str] = Field(None, max_length=500)


class IncomeSourceResponse(IncomeSourceBase):
    """Schema for income source response"""
    id: str
    household_member_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# Utility Allowance Schemas
class UtilityAllowanceBase(BaseHUDModel):
    """Base schema for utility allowance"""
    property_id: str
    bedroom_count: int = Field(..., ge=0, le=10)
    allowance_amount: str  # Decimal as string
    effective_date: date
    end_date: Optional[date] = None
    utility_type: str = Field(..., min_length=1, max_length=50)


class UtilityAllowanceCreate(UtilityAllowanceBase):
    """Schema for creating a utility allowance"""
    pass


class UtilityAllowanceUpdate(BaseHUDModel):
    """Schema for updating a utility allowance"""
    bedroom_count: Optional[int] = Field(None, ge=0, le=10)
    allowance_amount: Optional[str] = None
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    utility_type: Optional[str] = Field(None, min_length=1, max_length=50)


class UtilityAllowanceResponse(UtilityAllowanceBase):
    """Schema for utility allowance response"""
    id: str
    org_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# REAC Inspection Schemas
class REACInspectionBase(BaseHUDModel):
    """Base schema for REAC inspection"""
    property_id: str
    inspection_date: date
    inspection_type: InspectionType
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    inspection_status: InspectionStatus
    deficiencies_count: int = Field(0, ge=0)
    critical_deficiencies: int = Field(0, ge=0)
    report_url: Optional[str] = Field(None, max_length=500)
    next_inspection_date: Optional[date] = None


class REACInspectionCreate(REACInspectionBase):
    """Schema for creating a REAC inspection"""
    pass


class REACInspectionUpdate(BaseHUDModel):
    """Schema for updating a REAC inspection"""
    inspection_date: Optional[date] = None
    inspection_type: Optional[InspectionType] = None
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    inspection_status: Optional[InspectionStatus] = None
    deficiencies_count: Optional[int] = Field(None, ge=0)
    critical_deficiencies: Optional[int] = Field(None, ge=0)
    report_url: Optional[str] = Field(None, max_length=500)
    next_inspection_date: Optional[date] = None


class REACInspectionResponse(REACInspectionBase):
    """Schema for REAC inspection response"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# Rent Calculation Schemas
class RentCalculationRequest(BaseHUDModel):
    """Schema for rent calculation request"""
    tenant_id: str
    property_id: str
    unit_id: Optional[str] = None
    household_size: int = Field(..., ge=1, le=20)
    annual_income: str  # Decimal as string
    adjusted_income: str  # Decimal as string


class RentCalculationResponse(BaseHUDModel):
    """Schema for rent calculation response"""
    tenant_rent_portion: str  # Decimal as string
    utility_allowance: str  # Decimal as string
    subsidy_amount: str  # Decimal as string
    total_tenant_payment: str  # Decimal as string
    calculation_date: date
    effective_date: date


# HUD 50059 Submission Schemas
class HUD50059SubmissionRequest(BaseHUDModel):
    """Schema for HUD 50059 form submission"""
    certification_id: str
    submission_date: Optional[datetime] = None
    submission_notes: Optional[str] = Field(None, max_length=1000)


class HUD50059SubmissionResponse(BaseHUDModel):
    """Schema for HUD 50059 submission response"""
    certification_id: str
    hud_50059_submitted: bool
    hud_50059_submission_date: datetime
    submission_notes: Optional[str] = None


# List Response Schemas
class TenantIncomeCertificationListResponse(BaseHUDModel):
    """Schema for list of tenant income certifications"""
    data: List[TenantIncomeCertificationResponse]
    total: int
    page: int
    per_page: int


class REACInspectionListResponse(BaseHUDModel):
    """Schema for list of REAC inspections"""
    data: List[REACInspectionResponse]
    total: int
    page: int
    per_page: int


class UtilityAllowanceListResponse(BaseHUDModel):
    """Schema for list of utility allowances"""
    data: List[UtilityAllowanceResponse]
    total: int
    page: int
    per_page: int
