"""
Pydantic Schemas for API Request/Response Validation
Type-safe data validation and serialization
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

from app.models import (
    PropertyType, UnitStatus, LeadStatus, LeadSource,
    ApplicationStatus, LeaseStatus, WorkOrderStatus,
    WorkOrderPriority, WorkOrderCategory, PaymentStatus,
    PaymentMethod, UserRole, SubscriptionTier,
    MaintenancePriority, MaintenanceStatus
)


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        arbitrary_types_allowed=True,
    )


class TimestampSchema(BaseSchema):
    """Schema with timestamps"""
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class UserLogin(BaseSchema):
    """User login request"""
    email: EmailStr
    password: str


class UserRegister(BaseSchema):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None
    org_name: str = Field(..., min_length=1, max_length=255)  # For new org creation


class TokenResponse(BaseSchema):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseSchema):
    """Refresh token request"""
    refresh_token: str


class PasswordReset(BaseSchema):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseSchema):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseSchema):
    """Base user schema"""
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    """Create user"""
    password: str = Field(..., min_length=8)
    org_id: UUID


class UserUpdate(BaseSchema):
    """Update user"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase, TimestampSchema):
    """User response"""
    id: UUID
    org_id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    email_verified: bool
    last_login_at: Optional[datetime] = None


class UserInvite(BaseSchema):
    """Invite user to organization"""
    email: EmailStr
    role: UserRole
    first_name: str
    last_name: str


# ============================================================================
# ORGANIZATION SCHEMAS
# ============================================================================

class OrganizationBase(BaseSchema):
    """Base organization schema"""
    name: str = Field(..., min_length=1, max_length=255)


class OrganizationCreate(OrganizationBase):
    """Create organization"""
    slug: str = Field(..., min_length=1, max_length=100)


class OrganizationUpdate(BaseSchema):
    """Update organization"""
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None


class OrganizationResponse(OrganizationBase, TimestampSchema):
    """Organization response"""
    id: UUID
    slug: str
    subscription_tier: SubscriptionTier
    is_active: bool


# ============================================================================
# PROPERTY SCHEMAS
# ============================================================================

class PropertyBase(BaseSchema):
    """Base property schema"""
    name: str = Field(..., min_length=1, max_length=255)
    property_type: PropertyType
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "US"


class PropertyCreate(PropertyBase):
    """Create property"""
    owner_id: Optional[UUID] = None
    year_built: Optional[int] = None
    total_units: Optional[int] = None
    total_sqft: Optional[int] = None
    square_footage: Optional[int] = None
    lot_size: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    market_value: Optional[float] = None
    parking_spaces: Optional[int] = None
    amenities: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    description: Optional[str] = None


class PropertyUpdate(BaseSchema):
    """Update property"""
    name: Optional[str] = None
    description: Optional[str] = None
    total_units: Optional[int] = None
    amenities: Optional[List[str]] = None
    current_value: Optional[Decimal] = None


class PropertyResponse(PropertyBase, TimestampSchema):
    """Property response"""
    id: UUID
    org_id: UUID
    owner_id: UUID
    year_built: Optional[int] = None
    total_units: int
    square_footage: Optional[float] = None
    lot_size: Optional[float] = None
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None
    market_value: Optional[Decimal] = None
    photos: List[str] = []
    # Address fields for frontend compatibility
    address: Optional[str] = None  # Combined address from address_line1 + address_line2
    
    @classmethod
    def from_property_model(cls, property_model):
        """Create PropertyResponse from Property model"""
        # Split combined address back into address_line1 and address_line2
        address_line1 = ""
        address_line2 = None
        
        if property_model.address:
            address_parts = property_model.address.split(", ", 1)
            address_line1 = address_parts[0]
            if len(address_parts) > 1:
                address_line2 = address_parts[1]
        
        return cls(
            id=property_model.id,
            org_id=property_model.org_id,
            owner_id=property_model.owner_id,
            name=property_model.name,
            property_type=property_model.property_type,
            address_line1=address_line1,
            address_line2=address_line2,
            city=property_model.city,
            state=property_model.state,
            zip_code=property_model.zip_code,
            country=property_model.country,
            year_built=property_model.year_built,
            total_units=property_model.total_units,
            square_footage=property_model.square_footage,
            lot_size=property_model.lot_size,
            purchase_price=property_model.purchase_price,
            purchase_date=property_model.purchase_date,
            market_value=property_model.market_value,
            photos=property_model.photos or [],
            address=property_model.address,
            created_at=property_model.created_at,
            updated_at=property_model.updated_at
        )


class PropertyDetailResponse(PropertyResponse):
    """Detailed property response with related data"""
    units_count: int = 0
    occupied_units: int = 0
    available_units: int = 0
    occupancy_rate: float = 0.0
    total_monthly_rent: Decimal = Decimal("0")
    
    @classmethod
    def from_property_model(cls, property_model, units_count=0, occupied_units=0, available_units=0, occupancy_rate=0.0, total_monthly_rent=Decimal("0")):
        """Create PropertyDetailResponse from Property model with additional data"""
        # Use parent class method for basic conversion
        base_response = PropertyResponse.from_property_model(property_model)
        
        # Create PropertyDetailResponse with additional fields
        return cls(
            **base_response.model_dump(),
            units_count=units_count,
            occupied_units=occupied_units,
            available_units=available_units,
            occupancy_rate=occupancy_rate,
            total_monthly_rent=total_monthly_rent
        )


# ===========================================================================
# UNIT SCHEMAS
# ============================================================================

class UnitBase(BaseSchema):
    """Base unit schema"""
    unit_number: str
    bedrooms: float = Field(ge=0, le=10)
    bathrooms: float = Field(ge=0, le=10)
    square_feet: Optional[float] = Field(None, ge=0)  # ✅ FIXED: Changed from sqft
    rent_amount: Decimal = Field(..., ge=0)            # ✅ FIXED: Changed from market_rent
    deposit_amount: Decimal = Field(..., ge=0)         # ✅ ADDED


class UnitCreate(UnitBase):
    """Create unit"""
    property_id: UUID
    status: UnitStatus = UnitStatus.AVAILABLE
    floor: Optional[int] = None
    floor_plan: Optional[str] = None
    amenities: Optional[List[str]] = []               # ✅ ADDED


class UnitUpdate(BaseSchema):
    """Update unit"""
    rent_amount: Optional[Decimal] = None             # ✅ FIXED: Changed from market_rent
    deposit_amount: Optional[Decimal] = None          # ✅ ADDED
    square_feet: Optional[float] = None               # ✅ ADDED
    status: Optional[UnitStatus] = None
    amenities: Optional[List[str]] = None


class UnitResponse(UnitBase, TimestampSchema):
    """Unit response"""
    id: UUID
    org_id: UUID
    property_id: UUID
    status: UnitStatus
    amenities: List[str] = []                         # ✅ ADDED
    photos: List[str] = []                            # ✅ ADDED

# ============================================================================
# LEAD/CRM SCHEMAS
# ============================================================================

class LeadBase(BaseSchema):
    """Base lead schema"""
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: LeadSource


class LeadCreate(LeadBase):
    """Create lead"""
    desired_move_in: Optional[date] = None
    bedrooms_wanted: Optional[int] = None
    max_rent: Optional[Decimal] = None


class LeadUpdate(BaseSchema):
    """Update lead"""
    status: Optional[LeadStatus] = None
    assigned_to: Optional[UUID] = None
    desired_move_in: Optional[date] = None


class LeadResponse(LeadBase, TimestampSchema):
    """Lead response"""
    id: UUID
    org_id: UUID
    status: LeadStatus
    score: int
    assigned_to: Optional[UUID] = None


# ============================================================================
# APPLICATION SCHEMAS
# ============================================================================

class ApplicationBase(BaseSchema):
    """Base application schema"""
    desired_move_in: date
    lease_term_months: int = Field(default=12, ge=1, le=24)


class ApplicationCreate(ApplicationBase):
    """Create application"""
    lead_id: UUID
    unit_id: UUID
    monthly_income: Optional[Decimal] = None
    employment_status: Optional[str] = None


class ApplicationUpdate(BaseSchema):
    """Update application"""
    status: Optional[ApplicationStatus] = None
    screening_result: Optional[Dict[str, Any]] = None


class ApplicationResponse(ApplicationBase, TimestampSchema):
    """Application response"""
    id: UUID
    org_id: UUID
    lead_id: UUID
    unit_id: UUID
    status: ApplicationStatus
    submitted_at: Optional[datetime] = None


# ============================================================================
# LEASE SCHEMAS
# ============================================================================

class LeaseBase(BaseSchema):
    """Base lease schema"""
    start_date: date
    end_date: date
    monthly_rent: Decimal = Field(..., ge=0)
    security_deposit: Decimal = Field(default=Decimal("0"), ge=0)


class LeaseCreate(LeaseBase):
    """Create lease"""
    unit_id: UUID
    application_id: Optional[UUID] = None
    tenant_first_name: str
    tenant_last_name: str
    tenant_email: str
    tenant_phone: str
    deposit_amount: Decimal = Field(..., ge=0)
    status: LeaseStatus = LeaseStatus.PENDING
    rent_due_day: int = 1
    late_fee_amount: Optional[Decimal] = Field(default=None, ge=0)
    late_fee_grace_days: int = 5
    auto_pay_enabled: bool = False


class LeaseUpdate(BaseSchema):
    """Update lease"""
    status: Optional[LeaseStatus] = None
    monthly_rent: Optional[Decimal] = None


class LeaseResponse(LeaseBase, TimestampSchema):
    """Lease response"""
    id: UUID
    org_id: UUID
    unit_id: UUID
    status: LeaseStatus
    signed_at: Optional[datetime] = None


# ============================================================================
# PAYMENT SCHEMAS
# ============================================================================

class PaymentBase(BaseSchema):
    """Base payment schema"""
    amount: Decimal = Field(..., ge=0)
    payment_type: str = "rent"
    due_date: date


class PaymentCreate(PaymentBase):
    """Create payment"""
    lease_id: UUID
    payment_method: PaymentMethod


class PaymentUpdate(BaseSchema):
    """Update payment"""
    status: Optional[PaymentStatus] = None
    paid_date: Optional[date] = None


class PaymentResponse(PaymentBase, TimestampSchema):
    """Payment response"""
    id: UUID
    org_id: UUID
    lease_id: UUID
    status: PaymentStatus
    payment_method: PaymentMethod
    paid_date: Optional[date] = None


# ============================================================================
# WORK ORDER SCHEMAS
# ============================================================================

class WorkOrderBase(BaseSchema):
    """Base work order schema"""
    title: str
    description: str
    category: WorkOrderCategory
    priority: WorkOrderPriority = WorkOrderPriority.MEDIUM


class WorkOrderCreate(WorkOrderBase):
    """Create work order"""
    property_id: UUID
    unit_id: Optional[UUID] = None


class WorkOrderUpdate(BaseSchema):
    """Update work order"""
    status: Optional[WorkOrderStatus] = None
    assigned_to: Optional[UUID] = None
    scheduled_date: Optional[datetime] = None
    priority: Optional[WorkOrderPriority] = None


class WorkOrderResponse(WorkOrderBase, TimestampSchema):
    """Work order response"""
    id: UUID
    org_id: UUID
    property_id: UUID
    unit_id: Optional[UUID] = None
    status: WorkOrderStatus
    reported_by: UUID
    assigned_to: Optional[UUID] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None


# ============================================================================
# MAINTENANCE REQUEST SCHEMAS
# ============================================================================

class MaintenanceRequestBase(BaseSchema):
    """Base maintenance request schema"""
    title: str
    description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    category: str
    estimated_cost: Optional[Decimal] = None


class MaintenanceRequestCreate(MaintenanceRequestBase):
    """Create maintenance request"""
    unit_id: Optional[UUID] = None


class MaintenanceRequestUpdate(BaseSchema):
    """Update maintenance request"""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[MaintenancePriority] = None
    status: Optional[MaintenanceStatus] = None
    category: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    resolution_notes: Optional[str] = None


class MaintenanceRequestResponse(MaintenanceRequestBase, TimestampSchema):
    """Maintenance request response"""
    id: UUID
    org_id: UUID
    unit_id: Optional[UUID] = None
    reported_by: UUID
    assigned_to: Optional[UUID] = None
    vendor_name: Optional[str] = None
    vendor_contact: Optional[str] = None
    actual_cost: Optional[Decimal] = None
    resolution_notes: Optional[str] = None
    completed_at: Optional[datetime] = None


# ============================================================================
# VENDOR SCHEMAS
# ============================================================================

class VendorBase(BaseSchema):
    """Base vendor schema"""
    company_name: str
    phone: str
    email: Optional[EmailStr] = None


class VendorCreate(VendorBase):
    """Create vendor"""
    specialties: List[str] = []
    license_number: Optional[str] = None


class VendorUpdate(BaseSchema):
    """Update vendor"""
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_preferred: Optional[bool] = None


class VendorResponse(VendorBase, TimestampSchema):
    """Vendor response"""
    id: UUID
    org_id: UUID
    specialties: List[str]
    quality_score: Optional[float] = None
    is_active: bool
    is_preferred: bool


# ============================================================================
# DOCUMENT SCHEMAS
# ============================================================================

class DocumentUpload(BaseSchema):
    """Document upload request"""
    name: str
    category: str
    related_to_type: Optional[str] = None
    related_to_id: Optional[UUID] = None


class DocumentResponse(TimestampSchema):
    """Document response"""
    id: UUID
    org_id: UUID
    name: str
    file_type: str
    file_size: int
    file_url: str
    category: str
    ai_processed: bool
    uploaded_by: UUID


# ============================================================================
# AI JOB SCHEMAS
# ============================================================================

class AIJobCreate(BaseSchema):
    """Create AI job"""
    job_type: str
    input_data: Dict[str, Any]


class AIJobResponse(TimestampSchema):
    """AI job response"""
    id: UUID
    org_id: UUID
    job_type: str
    status: str
    output_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    requires_human_review: bool


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class PropertyMetrics(BaseSchema):
    """Property metrics"""
    property_id: UUID
    property_name: str
    total_units: int
    occupied_units: int
    occupancy_rate: float
    total_rent_roll: Decimal
    delinquency_amount: Decimal
    maintenance_tickets_open: int


class PortfolioMetrics(BaseSchema):
    """Portfolio-wide metrics"""
    total_properties: int
    total_units: int
    occupied_units: int
    occupancy_rate: float
    total_rent_roll: Decimal
    total_delinquency: Decimal
    noi: Decimal  # Net Operating Income
    properties: List[PropertyMetrics] = []


# ============================================================================
# PAGINATION SCHEMAS
# ============================================================================

class PaginationParams(BaseSchema):
    """Pagination query parameters"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseSchema):
    """Paginated response wrapper"""
    items: List[Any]
    pagination: Dict[str, Any]


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseSchema):
    """Error response"""
    error: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ValidationErrorResponse(BaseSchema):
    """Validation error response"""
    error: str = "Validation error"
    details: List[Dict[str, Any]]
