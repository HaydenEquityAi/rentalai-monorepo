"""
Database Models for RentalAi
Complete SQLAlchemy 2.0 models with all relationships
"""
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, String, Integer, Float, DateTime, Date, Text, 
    ForeignKey, Index, DECIMAL, ARRAY, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID, ENUM as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


# Enums
class SubscriptionTier(str, PyEnum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class UserRole(str, PyEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"

class PropertyType(str, PyEnum):
    SINGLE_FAMILY = "single_family"
    MULTI_FAMILY = "multi_family"
    APARTMENT = "apartment"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    COMMERCIAL = "commercial"

class UnitStatus(str, PyEnum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"

class LeaseStatus(str, PyEnum):
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    TERMINATED = "terminated"

class PaymentStatus(str, PyEnum):
    PENDING = "pending"
    PAID = "paid"
    LATE = "late"
    FAILED = "failed"

class PaymentMethod(str, PyEnum):
    ACH = "ach"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    CHECK = "check"
    CASH = "cash"

class LeadStatus(str, PyEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    TOURED = "toured"
    APPLICATION = "application"
    APPROVED = "approved"
    REJECTED = "rejected"
    CLOSED = "closed"

class LeadSource(str, PyEnum):
    WEBSITE = "website"
    REFERRAL = "referral"
    WALK_IN = "walk_in"
    PHONE = "phone"
    EMAIL = "email"
    SOCIAL_MEDIA = "social_media"
    OTHER = "other"

class ApplicationStatus(str, PyEnum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class WorkOrderStatus(str, PyEnum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class WorkOrderPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class WorkOrderCategory(str, PyEnum):
    PLUMBING = "plumbing"
    HVAC = "hvac"
    ELECTRICAL = "electrical"
    APPLIANCE = "appliance"
    GENERAL = "general"
    EMERGENCY = "emergency"
    PREVENTIVE = "preventive"

class MaintenanceStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MaintenancePriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class AIJobStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# HUD Compliance Enums
class CertificationType(str, PyEnum):
    """Types of income certifications"""
    INITIAL = "initial"
    ANNUAL = "annual"
    INTERIM = "interim"
    OTHER = "other"


class CertificationStatus(str, PyEnum):
    """Status of income certification"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class RelationshipType(str, PyEnum):
    """Household member relationship types"""
    HEAD = "head"
    SPOUSE = "spouse"
    CHILD = "child"
    OTHER = "other"


class IncomeType(str, PyEnum):
    """Types of income sources"""
    WAGES = "wages"
    SALARY = "salary"
    SOCIAL_SECURITY = "social_security"
    SSI = "ssi"
    SSDI = "ssdi"
    UNEMPLOYMENT = "unemployment"
    WORKERS_COMP = "workers_comp"
    CHILD_SUPPORT = "child_support"
    ALIMONY = "alimony"
    PENSION = "pension"
    ANNUITY = "annuity"
    INTEREST = "interest"
    DIVIDENDS = "dividends"
    CAPITAL_GAINS = "capital_gains"
    BUSINESS_INCOME = "business_income"
    RENTAL_INCOME = "rental_income"
    OTHER = "other"


class VerificationType(str, PyEnum):
    """Types of income verification"""
    PAY_STUB = "pay_stub"
    TAX_RETURN = "tax_return"
    AWARD_LETTER = "award_letter"
    BANK_STATEMENT = "bank_statement"
    EMPLOYER_VERIFICATION = "employer_verification"
    AGENCY_VERIFICATION = "agency_verification"
    OTHER = "other"


class InspectionType(str, PyEnum):
    """Types of REAC inspections"""
    INITIAL = "initial"
    ANNUAL = "annual"
    COMPLAINT = "complaint"
    FOLLOW_UP = "follow_up"


class InspectionStatus(str, PyEnum):
    """Status of REAC inspection"""
    PASSED = "passed"
    FAILED = "failed"
    CONDITIONAL = "conditional"
    PENDING = "pending"


# Models
class Organization(Base):
    """Organization/Company - top level entity"""
    __tablename__ = "organizations"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    
    # Subscription
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Limits
    max_properties: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_units: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_users: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Features
    features_enabled: Mapped[list] = mapped_column(ARRAY(String), default=list)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="organization")
    properties: Mapped[List["Property"]] = relationship("Property", back_populates="organization")
    owners: Mapped[List["Owner"]] = relationship("Owner", back_populates="organization")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="organization")
    subscription: Mapped[Optional["Subscription"]] = relationship("Subscription", back_populates="organization", uselist=False)
    accounts: Mapped[List["Account"]] = relationship("Account", back_populates="organization")
    
    __table_args__ = (
        Index("idx_org_slug", "slug"),
        Index("idx_org_active", "is_active"),
    )


class User(Base):
    """Users - belong to organization"""
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Basic Info
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Auth
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Role
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.VIEWER)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    
    __table_args__ = (
        Index("idx_user_org", "org_id"),
        Index("idx_user_email", "email"),
        Index("idx_user_active", "is_active"),
    )


class Owner(Base):
    """Property Owners"""
    __tablename__ = "owners"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Basic Info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Address
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Payment Info
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_account_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="owners")
    properties: Mapped[List["Property"]] = relationship("Property", back_populates="owner")
    
    __table_args__ = (
        Index("idx_owner_org", "org_id"),
        Index("idx_owner_email", "email"),
    )


class Property(Base):
    """Properties"""
    __tablename__ = "properties"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("owners.id"), nullable=False)
    
    # Basic Info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    property_type: Mapped[PropertyType] = mapped_column(SQLEnum(PropertyType), nullable=False)
    
    # Address
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="USA")
    
    # Details
    year_built: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_units: Mapped[int] = mapped_column(Integer, default=1)
    square_footage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lot_size: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Financial
    purchase_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    market_value: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    
    # Media
    photos: Mapped[list] = mapped_column(ARRAY(String), default=list)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="properties")
    owner: Mapped["Owner"] = relationship("Owner", back_populates="properties")
    units: Mapped[List["Unit"]] = relationship("Unit", back_populates="property")
    
    __table_args__ = (
        Index("idx_property_org", "org_id"),
        Index("idx_property_owner", "owner_id"),
        Index("idx_property_location", "city", "state"),
    )


class Unit(Base):
    """Individual units within properties"""
    __tablename__ = "units"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    
    # Basic Info
    unit_number: Mapped[str] = mapped_column(String(50), nullable=False)
    bedrooms: Mapped[int] = mapped_column(Integer, nullable=False)
    bathrooms: Mapped[float] = mapped_column(Float, nullable=False)
    square_feet: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Financial
    rent_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Status
    status: Mapped[UnitStatus] = mapped_column(SQLEnum(UnitStatus), default=UnitStatus.AVAILABLE)
    
    # Features
    amenities: Mapped[list] = mapped_column(ARRAY(String), default=list)
    photos: Mapped[list] = mapped_column(ARRAY(String), default=list)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    property: Mapped["Property"] = relationship("Property", back_populates="units")
    leases: Mapped[List["Lease"]] = relationship("Lease", back_populates="unit")
    maintenance_requests: Mapped[List["MaintenanceRequest"]] = relationship("MaintenanceRequest", back_populates="unit")
    
    __table_args__ = (
        Index("idx_unit_org", "org_id"),
        Index("idx_unit_property", "property_id"),
        Index("idx_unit_status", "status"),
    )


class Tenant(Base):
    """Tenants - people who rent units"""
    __tablename__ = "tenants"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Basic Info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Address
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Emergency Contact
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emergency_contact_relationship: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    leases: Mapped[List["Lease"]] = relationship("Lease", back_populates="tenant")
    
    __table_args__ = (
        Index("idx_tenant_org", "org_id"),
        Index("idx_tenant_email", "email"),
        Index("idx_tenant_active", "is_active"),
    )


class Lease(Base):
    """Lease agreements"""
    __tablename__ = "leases"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    
    # Lease Terms
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_rent: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Status
    status: Mapped[LeaseStatus] = mapped_column(SQLEnum(LeaseStatus), default=LeaseStatus.PENDING)
    
    # Payment
    rent_due_day: Mapped[int] = mapped_column(Integer, default=1)
    late_fee_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    late_fee_grace_days: Mapped[int] = mapped_column(Integer, default=5)
    
    # Stripe
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auto_pay_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Documents
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    docusign_envelope_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Renewal
    renewal_offered: Mapped[bool] = mapped_column(Boolean, default=False)
    renewal_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="leases")
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="leases")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="lease")
    
    __table_args__ = (
        Index("idx_lease_org", "org_id"),
        Index("idx_lease_unit", "unit_id"),
        Index("idx_lease_tenant", "tenant_id"),
        Index("idx_lease_status", "status"),
        Index("idx_lease_dates", "start_date", "end_date"),
    )


class Payment(Base):
    """Rent payments"""
    __tablename__ = "payments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id"), nullable=False)
    
    # Payment Details
    amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    payment_type: Mapped[str] = mapped_column(String(50), default="rent")
    payment_method: Mapped[PaymentMethod] = mapped_column(SQLEnum(PaymentMethod), nullable=False)
    
    # Dates
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Status
    status: Mapped[PaymentStatus] = mapped_column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Stripe
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    lease: Mapped["Lease"] = relationship("Lease", back_populates="payments")
    
    __table_args__ = (
        Index("idx_payment_org", "org_id"),
        Index("idx_payment_lease", "lease_id"),
        Index("idx_payment_status", "status"),
        Index("idx_payment_due_date", "due_date"),
    )


class Lead(Base):
    """Prospective tenants"""
    __tablename__ = "leads"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Contact Info
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Preferences
    desired_move_in_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    max_rent: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    min_bedrooms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Status & AI
    status: Mapped[LeadStatus] = mapped_column(SQLEnum(LeadStatus), default=LeadStatus.NEW)
    qualification_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Source
    source: Mapped[Optional[LeadSource]] = mapped_column(SQLEnum(LeadSource), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="leads")
    
    __table_args__ = (
        Index("idx_lead_org", "org_id"),
        Index("idx_lead_status", "status"),
        Index("idx_lead_email", "email"),
    )


class MaintenanceRequest(Base):
    """Maintenance requests"""
    __tablename__ = "maintenance_requests"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=False)
    
    # Request Details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[MaintenancePriority] = mapped_column(SQLEnum(MaintenancePriority), default=MaintenancePriority.MEDIUM)
    status: Mapped[MaintenanceStatus] = mapped_column(SQLEnum(MaintenanceStatus), default=MaintenanceStatus.OPEN)
    
    # Category (AI-detected)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimated_cost: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    
    # Resolution
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="maintenance_requests")
    
    __table_args__ = (
        Index("idx_maintenance_org", "org_id"),
        Index("idx_maintenance_unit", "unit_id"),
        Index("idx_maintenance_status", "status"),
        Index("idx_maintenance_priority", "priority"),
    )


class Document(Base):
    """Uploaded documents (PDFs, images, etc.)"""
    __tablename__ = "documents"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # File info
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Metadata
    document_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Related entities
    property_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    lease_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("leases.id"), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index("idx_document_org", "org_id"),
        Index("idx_document_type", "document_type"),
    )


class AIJob(Base):
    """AI processing jobs"""
    __tablename__ = "ai_jobs"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Job details
    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[AIJobStatus] = mapped_column(SQLEnum(AIJobStatus), default=AIJobStatus.PENDING)
    
    # Data
    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Related
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index("idx_aijob_org", "org_id"),
        Index("idx_aijob_status", "status"),
        Index("idx_aijob_type", "job_type"),
    )


# HUD Compliance Models
class TenantIncomeCertification(Base):
    """HUD Tenant Income Certification (TIC) records"""
    __tablename__ = "tenant_income_certifications"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=True, index=True)
    
    # Certification details
    certification_date: Mapped[date] = mapped_column(Date, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    cert_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CertificationType enum
    household_size: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Income calculations
    annual_income: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    adjusted_income: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    tenant_rent_portion: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    utility_allowance: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    subsidy_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    
    # Status and compliance
    certification_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # CertificationStatus enum
    hud_50059_submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    hud_50059_submission_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    tenant: Mapped["Tenant"] = relationship("Tenant")
    property: Mapped["Property"] = relationship("Property")
    unit: Mapped["Unit"] = relationship("Unit")
    creator: Mapped["User"] = relationship("User")
    household_members: Mapped[List["HouseholdMember"]] = relationship("HouseholdMember", back_populates="certification", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_tic_org_tenant", "org_id", "tenant_id"),
        Index("idx_tic_org_property", "org_id", "property_id"),
        Index("idx_tic_effective_date", "effective_date"),
        Index("idx_tic_status", "certification_status"),
        Index("idx_tic_type", "cert_type"),
    )


class HouseholdMember(Base):
    """Household members for income certification"""
    __tablename__ = "household_members"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tic_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_income_certifications.id"), nullable=False, index=True)
    
    # Personal information
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ssn_last_4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(20), nullable=False)  # RelationshipType enum
    
    # Status flags
    is_student: Mapped[bool] = mapped_column(Boolean, default=False)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Income
    annual_income: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    certification: Mapped["TenantIncomeCertification"] = relationship("TenantIncomeCertification", back_populates="household_members")
    income_sources: Mapped[List["IncomeSource"]] = relationship("IncomeSource", back_populates="household_member", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_hm_tic", "tic_id"),
        Index("idx_hm_relationship_type", "relationship_type"),
    )


class IncomeSource(Base):
    """Income sources for household members"""
    __tablename__ = "income_sources"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    household_member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("household_members.id"), nullable=False, index=True)
    
    # Income details
    income_type: Mapped[str] = mapped_column(String(30), nullable=False)  # IncomeType enum
    employer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    monthly_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    annual_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    
    # Verification
    verification_type: Mapped[str] = mapped_column(String(30), nullable=False)  # VerificationType enum
    verification_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    household_member: Mapped["HouseholdMember"] = relationship("HouseholdMember", back_populates="income_sources")
    
    # Indexes
    __table_args__ = (
        Index("idx_is_hm", "household_member_id"),
        Index("idx_is_type", "income_type"),
        Index("idx_is_verification", "verification_type"),
    )


class UtilityAllowance(Base):
    """Utility allowances by bedroom count and property"""
    __tablename__ = "utility_allowances"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    
    # Allowance details
    bedroom_count: Mapped[int] = mapped_column(Integer, nullable=False)
    heating: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False, default=0)
    cooking: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False, default=0)
    lighting: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False, default=0)
    water_sewer: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False, default=0)
    trash: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False, default=0)
    total_allowance: Mapped[Decimal] = mapped_column(DECIMAL(8, 2), nullable=False)
    
    # Effective date
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    property: Mapped["Property"] = relationship("Property")
    
    # Indexes
    __table_args__ = (
        Index("idx_ua_org_property", "org_id", "property_id"),
        Index("idx_ua_bedrooms", "bedroom_count"),
        Index("idx_ua_effective_date", "effective_date"),
    )


class REACInspection(Base):
    """REAC (Real Estate Assessment Center) inspection records"""
    __tablename__ = "reac_inspections"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    
    # Inspection details
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    inspection_type: Mapped[str] = mapped_column(String(20), nullable=False)  # InspectionType enum
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0-100 scale
    inspection_status: Mapped[str] = mapped_column(String(20), nullable=False)  # InspectionStatus enum
    
    # Deficiency tracking
    deficiencies_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical_deficiencies: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Documentation
    report_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    next_inspection_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    property: Mapped["Property"] = relationship("Property")
    
    # Indexes
    __table_args__ = (
        Index("idx_reac_property", "property_id"),
        Index("idx_reac_date", "inspection_date"),
        Index("idx_reac_type", "inspection_type"),
        Index("idx_reac_status", "inspection_status"),
        Index("idx_reac_score", "overall_score"),
    )


# Import Subscription model
from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus

# Accounting models
from app.models.accounting import (
    Account,
    Transaction,
    Budget,
    Vendor,
    Invoice,
    InvoiceLineItem,
    BankAccount,
    AccountType,
    TransactionType,
)