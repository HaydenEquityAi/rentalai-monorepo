"""
HUD Compliance Service
Business logic for HUD PRAC compliance operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
import logging

from app.models.hud import (
    TenantIncomeCertification, HouseholdMember, IncomeSource,
    UtilityAllowance, REACInspection,
    CertificationType, CertificationStatus, RelationshipType,
    IncomeType, VerificationType, InspectionType, InspectionStatus
)

logger = logging.getLogger(__name__)


class HUDService:
    """Service class for HUD compliance operations"""

    # TENANT INCOME CERTIFICATIONS
    @staticmethod
    async def create_income_certification(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> TenantIncomeCertification:
        """Create a new tenant income certification"""
        certification = TenantIncomeCertification(
            org_id=org_id,
            tenant_id=data["tenant_id"],
            property_id=data["property_id"],
            unit_id=data.get("unit_id"),
            certification_date=data["certification_date"],
            effective_date=data["effective_date"],
            cert_type=data["cert_type"],
            household_size=data["household_size"],
            annual_income=Decimal(str(data["annual_income"])),
            adjusted_income=Decimal(str(data["adjusted_income"])),
            tenant_rent_portion=Decimal(str(data["tenant_rent_portion"])),
            utility_allowance=Decimal(str(data["utility_allowance"])),
            subsidy_amount=Decimal(str(data["subsidy_amount"])),
            certification_status=data.get("certification_status", "pending"),
            created_by=data["created_by"],
        )
        db.add(certification)
        await db.commit()
        await db.refresh(certification)
        return certification

    @staticmethod
    async def get_certifications(
        db: AsyncSession,
        org_id: UUID,
        property_id: Optional[UUID] = None,
        tenant_id: Optional[UUID] = None,
        status: Optional[str] = None,
        cert_type: Optional[str] = None,
    ) -> List[TenantIncomeCertification]:
        """Get tenant income certifications with optional filters"""
        query = select(TenantIncomeCertification).where(
            and_(
                TenantIncomeCertification.org_id == org_id,
                TenantIncomeCertification.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(TenantIncomeCertification.property_id == property_id)
        if tenant_id:
            query = query.where(TenantIncomeCertification.tenant_id == tenant_id)
        if status:
            query = query.where(TenantIncomeCertification.certification_status == status)
        if cert_type:
            query = query.where(TenantIncomeCertification.cert_type == cert_type)
        query = query.order_by(TenantIncomeCertification.effective_date.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_certification(db: AsyncSession, cert_id: UUID, org_id: UUID) -> Optional[TenantIncomeCertification]:
        """Get a single income certification by ID"""
        query = select(TenantIncomeCertification).where(
            and_(
                TenantIncomeCertification.id == cert_id,
                TenantIncomeCertification.org_id == org_id,
                TenantIncomeCertification.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_certification(db: AsyncSession, cert_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[TenantIncomeCertification]:
        """Update an existing income certification"""
        certification = await db.execute(
            select(TenantIncomeCertification).where(
                and_(
                    TenantIncomeCertification.id == cert_id,
                    TenantIncomeCertification.org_id == org_id,
                    TenantIncomeCertification.deleted_at.is_(None),
                )
            )
        )
        certification = certification.scalar_one_or_none()
        if not certification:
            return None
        
        for key, value in data.items():
            if hasattr(certification, key):
                if key in ["annual_income", "adjusted_income", "tenant_rent_portion", "utility_allowance", "subsidy_amount"]:
                    setattr(certification, key, Decimal(str(value)))
                else:
                    setattr(certification, key, value)
        
        await db.commit()
        await db.refresh(certification)
        return certification

    @staticmethod
    async def submit_hud_50059(db: AsyncSession, cert_id: UUID, org_id: UUID) -> Optional[TenantIncomeCertification]:
        """Submit HUD 50059 form for certification"""
        certification = await HUDService.get_certification(db, cert_id, org_id)
        if not certification:
            return None
        
        certification.hud_50059_submitted = True
        certification.hud_50059_submission_date = datetime.utcnow()
        certification.certification_status = "approved"
        
        await db.commit()
        await db.refresh(certification)
        return certification

    @staticmethod
    async def get_expiring_certifications(db: AsyncSession, org_id: UUID, days: int = 30) -> List[TenantIncomeCertification]:
        """Get certifications expiring within specified days"""
        cutoff_date = date.today() + timedelta(days=days)
        
        query = select(TenantIncomeCertification).where(
            and_(
                TenantIncomeCertification.org_id == org_id,
                TenantIncomeCertification.effective_date <= cutoff_date,
                TenantIncomeCertification.certification_status == "approved",
                TenantIncomeCertification.deleted_at.is_(None),
            )
        )
        query = query.order_by(TenantIncomeCertification.effective_date.asc())
        result = await db.execute(query)
        return result.scalars().all()

    # HOUSEHOLD MEMBERS
    @staticmethod
    async def add_household_member(db: AsyncSession, tic_id: UUID, org_id: UUID, data: Dict[str, Any]) -> HouseholdMember:
        """Add a household member to a certification"""
        # Verify the certification belongs to the org
        certification = await HUDService.get_certification(db, tic_id, org_id)
        if not certification:
            raise ValueError("Certification not found")
        
        member = HouseholdMember(
            tic_id=tic_id,
            full_name=data["full_name"],
            ssn_last_4=data.get("ssn_last_4"),
            date_of_birth=data["date_of_birth"],
            relationship_type=data["relationship_type"],
            is_student=data.get("is_student", False),
            is_disabled=data.get("is_disabled", False),
            annual_income=Decimal(str(data.get("annual_income", 0))),
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)
        return member

    @staticmethod
    async def update_household_member(db: AsyncSession, member_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[HouseholdMember]:
        """Update a household member"""
        # Get member with certification verification
        query = select(HouseholdMember).join(TenantIncomeCertification).where(
            and_(
                HouseholdMember.id == member_id,
                TenantIncomeCertification.org_id == org_id,
                HouseholdMember.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        member = result.scalar_one_or_none()
        if not member:
            return None
        
        for key, value in data.items():
            if hasattr(member, key):
                if key == "annual_income":
                    setattr(member, key, Decimal(str(value)))
                else:
                    setattr(member, key, value)
        
        await db.commit()
        await db.refresh(member)
        return member

    @staticmethod
    async def remove_household_member(db: AsyncSession, member_id: UUID, org_id: UUID) -> bool:
        """Soft delete a household member"""
        query = select(HouseholdMember).join(TenantIncomeCertification).where(
            and_(
                HouseholdMember.id == member_id,
                TenantIncomeCertification.org_id == org_id,
                HouseholdMember.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        member = result.scalar_one_or_none()
        if not member:
            return False
        
        member.deleted_at = datetime.utcnow()
        await db.commit()
        return True

    # INCOME SOURCES
    @staticmethod
    async def add_income_source(db: AsyncSession, member_id: UUID, org_id: UUID, data: Dict[str, Any]) -> IncomeSource:
        """Add an income source to a household member"""
        # Verify the member belongs to a certification in the org
        query = select(HouseholdMember).join(TenantIncomeCertification).where(
            and_(
                HouseholdMember.id == member_id,
                TenantIncomeCertification.org_id == org_id,
                HouseholdMember.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        member = result.scalar_one_or_none()
        if not member:
            raise ValueError("Household member not found")
        
        income_source = IncomeSource(
            household_member_id=member_id,
            income_type=data["income_type"],
            employer_name=data.get("employer_name"),
            monthly_amount=Decimal(str(data["monthly_amount"])),
            annual_amount=Decimal(str(data["annual_amount"])),
            verification_type=data["verification_type"],
            verification_date=data["verification_date"],
        )
        db.add(income_source)
        await db.commit()
        await db.refresh(income_source)
        return income_source

    @staticmethod
    async def update_income_source(db: AsyncSession, source_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[IncomeSource]:
        """Update an income source"""
        query = select(IncomeSource).join(HouseholdMember).join(TenantIncomeCertification).where(
            and_(
                IncomeSource.id == source_id,
                TenantIncomeCertification.org_id == org_id,
                IncomeSource.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        income_source = result.scalar_one_or_none()
        if not income_source:
            return None
        
        for key, value in data.items():
            if hasattr(income_source, key):
                if key in ["monthly_amount", "annual_amount"]:
                    setattr(income_source, key, Decimal(str(value)))
                else:
                    setattr(income_source, key, value)
        
        await db.commit()
        await db.refresh(income_source)
        return income_source

    @staticmethod
    async def remove_income_source(db: AsyncSession, source_id: UUID, org_id: UUID) -> bool:
        """Soft delete an income source"""
        query = select(IncomeSource).join(HouseholdMember).join(TenantIncomeCertification).where(
            and_(
                IncomeSource.id == source_id,
                TenantIncomeCertification.org_id == org_id,
                IncomeSource.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        income_source = result.scalar_one_or_none()
        if not income_source:
            return False
        
        income_source.deleted_at = datetime.utcnow()
        await db.commit()
        return True

    # UTILITY ALLOWANCES
    @staticmethod
    async def get_utility_allowances(db: AsyncSession, org_id: UUID, property_id: Optional[UUID] = None) -> List[UtilityAllowance]:
        """Get utility allowances for a property"""
        query = select(UtilityAllowance).where(
            and_(
                UtilityAllowance.org_id == org_id,
                UtilityAllowance.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(UtilityAllowance.property_id == property_id)
        query = query.order_by(UtilityAllowance.effective_date.desc(), UtilityAllowance.bedroom_count.asc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_utility_allowance(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> UtilityAllowance:
        """Create a new utility allowance"""
        allowance = UtilityAllowance(
            org_id=org_id,
            property_id=data["property_id"],
            bedroom_count=data["bedroom_count"],
            heating=Decimal(str(data.get("heating", 0))),
            cooking=Decimal(str(data.get("cooking", 0))),
            lighting=Decimal(str(data.get("lighting", 0))),
            water_sewer=Decimal(str(data.get("water_sewer", 0))),
            trash=Decimal(str(data.get("trash", 0))),
            total_allowance=Decimal(str(data["total_allowance"])),
            effective_date=data["effective_date"],
        )
        db.add(allowance)
        await db.commit()
        await db.refresh(allowance)
        return allowance

    @staticmethod
    async def get_current_allowance(db: AsyncSession, org_id: UUID, property_id: UUID, bedroom_count: int) -> Optional[UtilityAllowance]:
        """Get current utility allowance for a property and bedroom count"""
        today = date.today()
        query = select(UtilityAllowance).where(
            and_(
                UtilityAllowance.org_id == org_id,
                UtilityAllowance.property_id == property_id,
                UtilityAllowance.bedroom_count == bedroom_count,
                UtilityAllowance.effective_date <= today,
                UtilityAllowance.deleted_at.is_(None),
            )
        )
        query = query.order_by(UtilityAllowance.effective_date.desc()).limit(1)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    # REAC INSPECTIONS
    @staticmethod
    async def get_inspections(db: AsyncSession, org_id: UUID, property_id: Optional[UUID] = None) -> List[REACInspection]:
        """Get REAC inspections for properties"""
        query = select(REACInspection).join(TenantIncomeCertification.property).where(
            and_(
                TenantIncomeCertification.org_id == org_id,
                REACInspection.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(REACInspection.property_id == property_id)
        query = query.order_by(REACInspection.inspection_date.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_inspection(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> REACInspection:
        """Create a new REAC inspection record"""
        inspection = REACInspection(
            property_id=data["property_id"],
            inspection_date=data["inspection_date"],
            inspection_type=data["inspection_type"],
            overall_score=data.get("overall_score"),
            inspection_status=data["inspection_status"],
            deficiencies_count=data.get("deficiencies_count", 0),
            critical_deficiencies=data.get("critical_deficiencies", 0),
            report_url=data.get("report_url"),
            next_inspection_date=data.get("next_inspection_date"),
        )
        db.add(inspection)
        await db.commit()
        await db.refresh(inspection)
        return inspection

    @staticmethod
    async def update_inspection(db: AsyncSession, inspection_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[REACInspection]:
        """Update a REAC inspection"""
        # Verify inspection belongs to org through property relationship
        query = select(REACInspection).join(TenantIncomeCertification.property).where(
            and_(
                REACInspection.id == inspection_id,
                TenantIncomeCertification.org_id == org_id,
                REACInspection.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        inspection = result.scalar_one_or_none()
        if not inspection:
            return None
        
        for key, value in data.items():
            if hasattr(inspection, key):
                setattr(inspection, key, value)
        
        await db.commit()
        await db.refresh(inspection)
        return inspection

    @staticmethod
    async def get_upcoming_inspections(db: AsyncSession, org_id: UUID, days: int = 60) -> List[REACInspection]:
        """Get upcoming REAC inspections within specified days"""
        cutoff_date = date.today() + timedelta(days=days)
        
        query = select(REACInspection).join(TenantIncomeCertification.property).where(
            and_(
                TenantIncomeCertification.org_id == org_id,
                REACInspection.next_inspection_date <= cutoff_date,
                REACInspection.next_inspection_date >= date.today(),
                REACInspection.deleted_at.is_(None),
            )
        )
        query = query.order_by(REACInspection.next_inspection_date.asc())
        result = await db.execute(query)
        return result.scalars().all()

    # RENT CALCULATIONS
    @staticmethod
    async def calculate_tenant_rent(
        household_income: Decimal,
        household_size: int,
        utility_allowance: Decimal,
        contract_rent: Decimal
    ) -> Dict[str, Any]:
        """Calculate tenant rent portion and subsidy amount"""
        # HUD rent calculation: 30% of adjusted monthly income
        monthly_income = household_income / Decimal("12")
        tenant_rent_portion = monthly_income * Decimal("0.30")
        
        # Subtract utility allowance from tenant portion
        tenant_rent_after_utilities = max(Decimal("0"), tenant_rent_portion - utility_allowance)
        
        # Calculate subsidy amount
        subsidy_amount = max(Decimal("0"), contract_rent - tenant_rent_after_utilities)
        
        return {
            "tenant_rent": str(tenant_rent_after_utilities),
            "subsidy_amount": str(subsidy_amount),
            "total_contract_rent": str(contract_rent),
            "utility_allowance": str(utility_allowance),
            "monthly_income": str(monthly_income),
            "rent_to_income_ratio": str((tenant_rent_after_utilities / monthly_income * 100) if monthly_income > 0 else 0),
        }
