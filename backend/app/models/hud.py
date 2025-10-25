"""
HUD PRAC Compliance Models
SQLAlchemy models for HUD compliance tracking and reporting
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, Numeric, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from uuid import uuid4
from enum import Enum as PyEnum

Base = declarative_base()


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


class TenantIncomeCertification(Base):
    """HUD Tenant Income Certification (TIC) records"""
    __tablename__ = "tenant_income_certifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=True, index=True)
    
    # Certification details
    certification_date = Column(Date, nullable=False)
    effective_date = Column(Date, nullable=False)
    cert_type = Column(String(20), nullable=False)  # CertificationType enum
    household_size = Column(Integer, nullable=False)
    
    # Income calculations
    annual_income = Column(Numeric(12, 2), nullable=False)
    adjusted_income = Column(Numeric(12, 2), nullable=False)
    tenant_rent_portion = Column(Numeric(12, 2), nullable=False)
    utility_allowance = Column(Numeric(12, 2), nullable=False)
    subsidy_amount = Column(Numeric(12, 2), nullable=False)
    
    # Status and compliance
    certification_status = Column(String(20), nullable=False, default="pending")  # CertificationStatus enum
    hud_50059_submitted = Column(Boolean, default=False)
    hud_50059_submission_date = Column(DateTime, nullable=True)
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    tenant = relationship("Tenant")
    property = relationship("Property")
    unit = relationship("Unit")
    creator = relationship("User")
    household_members = relationship("HouseholdMember", back_populates="certification", cascade="all, delete-orphan")
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tic_id = Column(UUID(as_uuid=True), ForeignKey("tenant_income_certifications.id"), nullable=False, index=True)
    
    # Personal information
    full_name = Column(String(255), nullable=False)
    ssn_last_4 = Column(String(4), nullable=True)
    date_of_birth = Column(Date, nullable=False)
    relationship_type = Column(String(20), nullable=False)  # RelationshipType enum
    
    # Status flags
    is_student = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)
    
    # Income
    annual_income = Column(Numeric(12, 2), nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    certification = relationship("TenantIncomeCertification", back_populates="household_members")
    income_sources = relationship("IncomeSource", back_populates="household_member", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_hm_tic", "tic_id"),
        Index("idx_hm_relationship_type", "relationship_type"),
    )


class IncomeSource(Base):
    """Income sources for household members"""
    __tablename__ = "income_sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    household_member_id = Column(UUID(as_uuid=True), ForeignKey("household_members.id"), nullable=False, index=True)
    
    # Income details
    income_type = Column(String(30), nullable=False)  # IncomeType enum
    employer_name = Column(String(255), nullable=True)
    monthly_amount = Column(Numeric(12, 2), nullable=False)
    annual_amount = Column(Numeric(12, 2), nullable=False)
    
    # Verification
    verification_type = Column(String(30), nullable=False)  # VerificationType enum
    verification_date = Column(Date, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    household_member = relationship("HouseholdMember", back_populates="income_sources")
    
    # Indexes
    __table_args__ = (
        Index("idx_is_hm", "household_member_id"),
        Index("idx_is_type", "income_type"),
        Index("idx_is_verification", "verification_type"),
    )


class UtilityAllowance(Base):
    """Utility allowances by bedroom count and property"""
    __tablename__ = "utility_allowances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    
    # Allowance details
    bedroom_count = Column(Integer, nullable=False)
    heating = Column(Numeric(8, 2), nullable=False, default=0)
    cooking = Column(Numeric(8, 2), nullable=False, default=0)
    lighting = Column(Numeric(8, 2), nullable=False, default=0)
    water_sewer = Column(Numeric(8, 2), nullable=False, default=0)
    trash = Column(Numeric(8, 2), nullable=False, default=0)
    total_allowance = Column(Numeric(8, 2), nullable=False)
    
    # Effective date
    effective_date = Column(Date, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    property = relationship("Property")
    
    # Indexes
    __table_args__ = (
        Index("idx_ua_org_property", "org_id", "property_id"),
        Index("idx_ua_bedrooms", "bedroom_count"),
        Index("idx_ua_effective_date", "effective_date"),
    )


class REACInspection(Base):
    """REAC (Real Estate Assessment Center) inspection records"""
    __tablename__ = "reac_inspections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    
    # Inspection details
    inspection_date = Column(Date, nullable=False)
    inspection_type = Column(String(20), nullable=False)  # InspectionType enum
    overall_score = Column(Integer, nullable=True)  # 0-100 scale
    inspection_status = Column(String(20), nullable=False)  # InspectionStatus enum
    
    # Deficiency tracking
    deficiencies_count = Column(Integer, nullable=False, default=0)
    critical_deficiencies = Column(Integer, nullable=False, default=0)
    
    # Documentation
    report_url = Column(String(500), nullable=True)
    next_inspection_date = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    property = relationship("Property")
    
    # Indexes
    __table_args__ = (
        Index("idx_reac_property", "property_id"),
        Index("idx_reac_date", "inspection_date"),
        Index("idx_reac_type", "inspection_type"),
        Index("idx_reac_status", "inspection_status"),
        Index("idx_reac_score", "overall_score"),
    )
