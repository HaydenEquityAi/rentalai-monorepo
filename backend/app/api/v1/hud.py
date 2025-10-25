"""
HUD Compliance API Routes
Comprehensive endpoints for HUD PRAC compliance management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.services.hud_service import HUDService
from app.models.hud import (
    TenantIncomeCertification, HouseholdMember, IncomeSource,
    UtilityAllowance, REACInspection,
    CertificationType, CertificationStatus, RelationshipType,
    IncomeType, VerificationType, InspectionType, InspectionStatus
)
from app.models import User

logger = logging.getLogger(__name__)
hud_router = APIRouter()

# TENANT INCOME CERTIFICATIONS
@hud_router.get("/certifications")
async def get_certifications(
    property_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    cert_type: Optional[str] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tenant income certifications with optional filters for HUD compliance tracking"""
    certifications = await HUDService.get_certifications(
        db,
        UUID(org_id),
        UUID(property_id) if property_id else None,
        UUID(tenant_id) if tenant_id else None,
        status,
        cert_type
    )
    return {
        "data": [
            {
                "id": str(c.id),
                "tenant_id": str(c.tenant_id),
                "property_id": str(c.property_id),
                "unit_id": str(c.unit_id) if c.unit_id else None,
                "certification_date": c.certification_date.isoformat(),
                "effective_date": c.effective_date.isoformat(),
                "cert_type": c.cert_type,
                "household_size": c.household_size,
                "annual_income": str(c.annual_income),
                "adjusted_income": str(c.adjusted_income),
                "tenant_rent_portion": str(c.tenant_rent_portion),
                "utility_allowance": str(c.utility_allowance),
                "subsidy_amount": str(c.subsidy_amount),
                "certification_status": c.certification_status,
                "hud_50059_submitted": c.hud_50059_submitted,
                "hud_50059_submission_date": c.hud_50059_submission_date.isoformat() if c.hud_50059_submission_date else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in certifications
        ]
    }

@hud_router.post("/certifications", status_code=201)
async def create_certification(
    certification_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new tenant income certification for HUD compliance"""
    try:
        # Add created_by from current user
        certification_data["created_by"] = current_user.id
        
        certification = await HUDService.create_income_certification(db, UUID(org_id), certification_data)
        return {
            "data": {
                "id": str(certification.id),
                "tenant_id": str(certification.tenant_id),
                "property_id": str(certification.property_id),
                "certification_date": certification.certification_date.isoformat(),
                "effective_date": certification.effective_date.isoformat(),
                "cert_type": certification.cert_type,
                "household_size": certification.household_size,
                "annual_income": str(certification.annual_income),
                "certification_status": certification.certification_status,
            }
        }
    except Exception as e:
        logger.error(f"Error creating certification: {e}")
        raise HTTPException(status_code=400, detail="Failed to create certification")

@hud_router.get("/certifications/{cert_id}")
async def get_certification(
    cert_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single income certification with household members for HUD compliance review"""
    certification = await HUDService.get_certification(db, UUID(cert_id), UUID(org_id))
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    return {
        "data": {
            "id": str(certification.id),
            "tenant_id": str(certification.tenant_id),
            "property_id": str(certification.property_id),
            "unit_id": str(certification.unit_id) if certification.unit_id else None,
            "certification_date": certification.certification_date.isoformat(),
            "effective_date": certification.effective_date.isoformat(),
            "cert_type": certification.cert_type,
            "household_size": certification.household_size,
            "annual_income": str(certification.annual_income),
            "adjusted_income": str(certification.adjusted_income),
            "tenant_rent_portion": str(certification.tenant_rent_portion),
            "utility_allowance": str(certification.utility_allowance),
            "subsidy_amount": str(certification.subsidy_amount),
            "certification_status": certification.certification_status,
            "hud_50059_submitted": certification.hud_50059_submitted,
            "hud_50059_submission_date": certification.hud_50059_submission_date.isoformat() if certification.hud_50059_submission_date else None,
            "household_members": [
                {
                    "id": str(member.id),
                    "full_name": member.full_name,
                    "ssn_last_4": member.ssn_last_4,
                    "date_of_birth": member.date_of_birth.isoformat(),
                    "relationship_type_type": member.relationship_type_type,
                    "is_student": member.is_student,
                    "is_disabled": member.is_disabled,
                    "annual_income": str(member.annual_income),
                }
                for member in certification.household_members
            ],
        }
    }

@hud_router.put("/certifications/{cert_id}")
async def update_certification(
    cert_id: str,
    certification_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update existing income certification for HUD compliance"""
    certification = await HUDService.update_certification(db, UUID(cert_id), UUID(org_id), certification_data)
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    return {
        "data": {
            "id": str(certification.id),
            "certification_status": certification.certification_status,
            "annual_income": str(certification.annual_income),
            "adjusted_income": str(certification.adjusted_income),
            "tenant_rent_portion": str(certification.tenant_rent_portion),
            "subsidy_amount": str(certification.subsidy_amount),
        }
    }

@hud_router.post("/certifications/{cert_id}/submit")
async def submit_hud_50059(
    cert_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit HUD 50059 form for income certification approval"""
    certification = await HUDService.submit_hud_50059(db, UUID(cert_id), UUID(org_id))
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    return {
        "data": {
            "id": str(certification.id),
            "certification_status": certification.certification_status,
            "hud_50059_submitted": certification.hud_50059_submitted,
            "hud_50059_submission_date": certification.hud_50059_submission_date.isoformat(),
        }
    }

@hud_router.get("/certifications/expiring")
async def get_expiring_certifications(
    days: int = Query(30, description="Number of days to look ahead for expiring certifications"),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get certifications expiring within specified days for HUD compliance monitoring"""
    certifications = await HUDService.get_expiring_certifications(db, UUID(org_id), days)
    return {
        "data": [
            {
                "id": str(c.id),
                "tenant_id": str(c.tenant_id),
                "property_id": str(c.property_id),
                "effective_date": c.effective_date.isoformat(),
                "cert_type": c.cert_type,
                "household_size": c.household_size,
                "annual_income": str(c.annual_income),
                "days_until_expiry": (c.effective_date - date.today()).days,
            }
            for c in certifications
        ]
    }

# HOUSEHOLD MEMBERS
@hud_router.post("/certifications/{cert_id}/members", status_code=201)
async def add_household_member(
    cert_id: str,
    member_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add household member to income certification for HUD compliance"""
    try:
        member = await HUDService.add_household_member(db, UUID(cert_id), UUID(org_id), member_data)
        return {
            "data": {
                "id": str(member.id),
                "tic_id": str(member.tic_id),
                "full_name": member.full_name,
                "ssn_last_4": member.ssn_last_4,
                "date_of_birth": member.date_of_birth.isoformat(),
                "relationship_type": member.relationship_type,
                "is_student": member.is_student,
                "is_disabled": member.is_disabled,
                "annual_income": str(member.annual_income),
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding household member: {e}")
        raise HTTPException(status_code=400, detail="Failed to add household member")

@hud_router.put("/members/{member_id}")
async def update_household_member(
    member_id: str,
    member_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update household member information for HUD compliance"""
    member = await HUDService.update_household_member(db, UUID(member_id), UUID(org_id), member_data)
    if not member:
        raise HTTPException(status_code=404, detail="Household member not found")
    
    return {
        "data": {
            "id": str(member.id),
            "full_name": member.full_name,
            "ssn_last_4": member.ssn_last_4,
            "date_of_birth": member.date_of_birth.isoformat(),
            "relationship_type": member.relationship_type,
            "is_student": member.is_student,
            "is_disabled": member.is_disabled,
            "annual_income": str(member.annual_income),
        }
    }

@hud_router.delete("/members/{member_id}", status_code=204)
async def remove_household_member(
    member_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove household member from income certification"""
    success = await HUDService.remove_household_member(db, UUID(member_id), UUID(org_id))
    if not success:
        raise HTTPException(status_code=404, detail="Household member not found")

# INCOME SOURCES
@hud_router.post("/members/{member_id}/income", status_code=201)
async def add_income_source(
    member_id: str,
    income_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add income source to household member for HUD income verification"""
    try:
        income_source = await HUDService.add_income_source(db, UUID(member_id), UUID(org_id), income_data)
        return {
            "data": {
                "id": str(income_source.id),
                "household_member_id": str(income_source.household_member_id),
                "income_type": income_source.income_type,
                "employer_name": income_source.employer_name,
                "monthly_amount": str(income_source.monthly_amount),
                "annual_amount": str(income_source.annual_amount),
                "verification_type": income_source.verification_type,
                "verification_date": income_source.verification_date.isoformat(),
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding income source: {e}")
        raise HTTPException(status_code=400, detail="Failed to add income source")

@hud_router.put("/income/{source_id}")
async def update_income_source(
    source_id: str,
    income_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update income source information for HUD verification"""
    income_source = await HUDService.update_income_source(db, UUID(source_id), UUID(org_id), income_data)
    if not income_source:
        raise HTTPException(status_code=404, detail="Income source not found")
    
    return {
        "data": {
            "id": str(income_source.id),
            "income_type": income_source.income_type,
            "employer_name": income_source.employer_name,
            "monthly_amount": str(income_source.monthly_amount),
            "annual_amount": str(income_source.annual_amount),
            "verification_type": income_source.verification_type,
            "verification_date": income_source.verification_date.isoformat(),
        }
    }

@hud_router.delete("/income/{source_id}", status_code=204)
async def remove_income_source(
    source_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove income source from household member"""
    success = await HUDService.remove_income_source(db, UUID(source_id), UUID(org_id))
    if not success:
        raise HTTPException(status_code=404, detail="Income source not found")

# UTILITY ALLOWANCES
@hud_router.get("/utility-allowances")
async def get_utility_allowances(
    property_id: Optional[str] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get utility allowances for HUD compliance calculations"""
    allowances = await HUDService.get_utility_allowances(
        db, UUID(org_id), UUID(property_id) if property_id else None
    )
    return {
        "data": [
            {
                "id": str(a.id),
                "property_id": str(a.property_id),
                "bedroom_count": a.bedroom_count,
                "heating": str(a.heating),
                "cooking": str(a.cooking),
                "lighting": str(a.lighting),
                "water_sewer": str(a.water_sewer),
                "trash": str(a.trash),
                "total_allowance": str(a.total_allowance),
                "effective_date": a.effective_date.isoformat(),
            }
            for a in allowances
        ]
    }

@hud_router.post("/utility-allowances", status_code=201)
async def create_utility_allowance(
    allowance_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new utility allowance schedule for HUD compliance"""
    try:
        allowance = await HUDService.create_utility_allowance(db, UUID(org_id), allowance_data)
        return {
            "data": {
                "id": str(allowance.id),
                "property_id": str(allowance.property_id),
                "bedroom_count": allowance.bedroom_count,
                "total_allowance": str(allowance.total_allowance),
                "effective_date": allowance.effective_date.isoformat(),
            }
        }
    except Exception as e:
        logger.error(f"Error creating utility allowance: {e}")
        raise HTTPException(status_code=400, detail="Failed to create utility allowance")

@hud_router.get("/utility-allowances/current")
async def get_current_allowance(
    property_id: str = Query(...),
    bedroom_count: int = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current utility allowance for rent calculation"""
    allowance = await HUDService.get_current_allowance(
        db, UUID(org_id), UUID(property_id), bedroom_count
    )
    if not allowance:
        raise HTTPException(status_code=404, detail="Utility allowance not found")
    
    return {
        "data": {
            "id": str(allowance.id),
            "property_id": str(allowance.property_id),
            "bedroom_count": allowance.bedroom_count,
            "heating": str(allowance.heating),
            "cooking": str(allowance.cooking),
            "lighting": str(allowance.lighting),
            "water_sewer": str(allowance.water_sewer),
            "trash": str(allowance.trash),
            "total_allowance": str(allowance.total_allowance),
            "effective_date": allowance.effective_date.isoformat(),
        }
    }

# REAC INSPECTIONS
@hud_router.get("/inspections")
async def get_inspections(
    property_id: Optional[str] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get REAC inspection history for HUD compliance monitoring"""
    inspections = await HUDService.get_inspections(
        db, UUID(org_id), UUID(property_id) if property_id else None
    )
    return {
        "data": [
            {
                "id": str(i.id),
                "property_id": str(i.property_id),
                "inspection_date": i.inspection_date.isoformat(),
                "inspection_type": i.inspection_type,
                "overall_score": i.overall_score,
                "inspection_status": i.inspection_status,
                "deficiencies_count": i.deficiencies_count,
                "critical_deficiencies": i.critical_deficiencies,
                "report_url": i.report_url,
                "next_inspection_date": i.next_inspection_date.isoformat() if i.next_inspection_date else None,
            }
            for i in inspections
        ]
    }

@hud_router.post("/inspections", status_code=201)
async def create_inspection(
    inspection_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new REAC inspection record for HUD compliance tracking"""
    try:
        inspection = await HUDService.create_inspection(db, UUID(org_id), inspection_data)
        return {
            "data": {
                "id": str(inspection.id),
                "property_id": str(inspection.property_id),
                "inspection_date": inspection.inspection_date.isoformat(),
                "inspection_type": inspection.inspection_type,
                "overall_score": inspection.overall_score,
                "inspection_status": inspection.inspection_status,
                "deficiencies_count": inspection.deficiencies_count,
                "critical_deficiencies": inspection.critical_deficiencies,
            }
        }
    except Exception as e:
        logger.error(f"Error creating inspection: {e}")
        raise HTTPException(status_code=400, detail="Failed to create inspection")

@hud_router.put("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str,
    inspection_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update REAC inspection details for HUD compliance"""
    inspection = await HUDService.update_inspection(db, UUID(inspection_id), UUID(org_id), inspection_data)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    return {
        "data": {
            "id": str(inspection.id),
            "overall_score": inspection.overall_score,
            "inspection_status": inspection.inspection_status,
            "deficiencies_count": inspection.deficiencies_count,
            "critical_deficiencies": inspection.critical_deficiencies,
            "report_url": inspection.report_url,
            "next_inspection_date": inspection.next_inspection_date.isoformat() if inspection.next_inspection_date else None,
        }
    }

@hud_router.get("/inspections/upcoming")
async def get_upcoming_inspections(
    days: int = Query(60, description="Number of days to look ahead for upcoming inspections"),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming REAC inspections for HUD compliance planning"""
    inspections = await HUDService.get_upcoming_inspections(db, UUID(org_id), days)
    return {
        "data": [
            {
                "id": str(i.id),
                "property_id": str(i.property_id),
                "inspection_date": i.inspection_date.isoformat(),
                "inspection_type": i.inspection_type,
                "overall_score": i.overall_score,
                "inspection_status": i.inspection_status,
                "next_inspection_date": i.next_inspection_date.isoformat(),
                "days_until_inspection": (i.next_inspection_date - date.today()).days if i.next_inspection_date else None,
            }
            for i in inspections
        ]
    }

# RENT CALCULATIONS
@hud_router.post("/calculate-rent")
async def calculate_tenant_rent(
    calculation_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate tenant rent portion and subsidy amount using HUD guidelines"""
    try:
        household_income = Decimal(str(calculation_data["household_income"]))
        household_size = calculation_data["household_size"]
        utility_allowance = Decimal(str(calculation_data["utility_allowance"]))
        contract_rent = Decimal(str(calculation_data["contract_rent"]))
        
        calculation = await HUDService.calculate_tenant_rent(
            household_income, household_size, utility_allowance, contract_rent
        )
        
        return {"data": calculation}
        
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required field: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {e}")
    except Exception as e:
        logger.error(f"Error calculating rent: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate rent")
