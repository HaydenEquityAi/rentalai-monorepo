"""
Leads API Routes
CRUD operations for lead management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    Lead, LeadStatus, LeadSource, Unit, UnitStatus
)
from app.schemas import (
    LeadResponse, LeadCreate, LeadUpdate,
    PaginatedResponse, ErrorResponse
)

# Initialize router
leads_router = APIRouter()


@leads_router.get("/", response_model=PaginatedResponse)
async def list_leads(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    status: Optional[LeadStatus] = Query(None, description="Filter by status"),
    source: Optional[LeadSource] = Query(None, description="Filter by source"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    search: Optional[str] = Query(None, description="Search in name or email"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List leads with pagination and filters"""
    
    # Build query
    query = select(Lead).where(
        and_(
            Lead.org_id == org_id,
            Lead.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if status:
        query = query.where(Lead.status == status)
    
    if source:
        query = query.where(Lead.source == source)
    
    if start_date:
        query = query.where(Lead.created_at >= start_date)
    
    if end_date:
        query = query.where(Lead.created_at <= end_date)
    
    if search:
        query = query.where(
            or_(
                Lead.first_name.ilike(f"%{search}%"),
                Lead.last_name.ilike(f"%{search}%"),
                Lead.email.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(Lead.created_at)).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return PaginatedResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@leads_router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new lead"""
    
    # Check if lead with same email already exists
    existing_lead_result = await db.execute(
        select(Lead).where(
            and_(
                Lead.org_id == org_id,
                Lead.email == lead_data.email,
                Lead.deleted_at.is_(None)
            )
        )
    )
    existing_lead = existing_lead_result.scalar_one_or_none()
    
    if existing_lead:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead with this email already exists"
        )
    
    # Create lead
    lead = Lead(
        org_id=org_id,
        first_name=lead_data.first_name,
        last_name=lead_data.last_name,
        email=lead_data.email,
        phone=lead_data.phone,
        source=lead_data.source,
        status=lead_data.status,
        desired_move_in_date=lead_data.desired_move_in_date,
        min_bedrooms=lead_data.min_bedrooms,
        max_rent=lead_data.max_rent,
        qualification_score=lead_data.qualification_score,
        ai_notes=lead_data.ai_notes
    )
    
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    
    return LeadResponse.model_validate(lead)


@leads_router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get lead details"""
    
    # Get lead
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    return LeadResponse.model_validate(lead)


@leads_router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    lead_data: LeadUpdate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a lead"""
    
    # Get lead
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Update fields
    update_data = lead_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    await db.commit()
    await db.refresh(lead)
    
    return LeadResponse.model_validate(lead)


@leads_router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a lead"""
    
    # Get lead
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Soft delete
    lead.deleted_at = datetime.utcnow()
    await db.commit()


@leads_router.patch("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: UUID,
    status: LeadStatus,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update lead status"""
    
    # Get lead
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Update status
    lead.status = status
    await db.commit()
    await db.refresh(lead)
    
    return LeadResponse.model_validate(lead)


@leads_router.post("/{lead_id}/convert")
async def convert_lead_to_tenant(
    lead_id: UUID,
    unit_id: UUID,
    start_date: date,
    monthly_rent: float,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Convert lead to tenant (create lease)"""
    
    # Get lead
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Verify unit exists and is available
    unit_result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == unit_id,
                Unit.org_id == org_id,
                Unit.status == UnitStatus.AVAILABLE,
                Unit.deleted_at.is_(None)
            )
        )
    )
    unit = unit_result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found or not available"
        )
    
    # Create lease
    from app.models import Lease, LeaseStatus
    lease = Lease(
        org_id=org_id,
        unit_id=unit_id,
        tenant_first_name=lead.first_name,
        tenant_last_name=lead.last_name,
        tenant_email=lead.email,
        tenant_phone=lead.phone,
        start_date=start_date,
        end_date=start_date + timedelta(days=365),  # 1 year lease
        monthly_rent=monthly_rent,
        deposit_amount=monthly_rent,  # 1 month deposit
        status=LeaseStatus.ACTIVE,
        rent_due_day=1,
        late_fee_amount=50.0,
        late_fee_grace_days=5
    )
    
    db.add(lease)
    
    # Update unit status
    unit.status = UnitStatus.OCCUPIED
    
    # Update lead status
    lead.status = LeadStatus.APPROVED
    
    await db.commit()
    await db.refresh(lease)
    
    return {
        "message": "Lead successfully converted to tenant",
        "lease_id": str(lease.id),
        "tenant_name": f"{lead.first_name} {lead.last_name}",
        "unit_number": unit.unit_number,
        "monthly_rent": monthly_rent
    }


@leads_router.get("/analytics")
async def get_lead_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analytics"),
    end_date: Optional[date] = Query(None, description="End date for analytics"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get lead source & conversion analytics"""
    
    # Build base query
    base_query = select(Lead).where(
        and_(
            Lead.org_id == org_id,
            Lead.deleted_at.is_(None)
        )
    )
    
    # Apply date filters
    if start_date:
        base_query = base_query.where(Lead.created_at >= start_date)
    
    if end_date:
        base_query = base_query.where(Lead.created_at <= end_date)
    
    # Get total leads
    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total_leads = total_result.scalar()
    
    # Get leads by source
    source_result = await db.execute(
        select(Lead.source, func.count(Lead.id))
        .where(
            and_(
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
        .group_by(Lead.source)
    )
    leads_by_source = {source: count for source, count in source_result.fetchall()}
    
    # Get leads by status
    status_result = await db.execute(
        select(Lead.status, func.count(Lead.id))
        .where(
            and_(
                Lead.org_id == org_id,
                Lead.deleted_at.is_(None)
            )
        )
        .group_by(Lead.status)
    )
    leads_by_status = {status: count for status, count in status_result.fetchall()}
    
    # Calculate conversion rate
    converted_leads = leads_by_status.get(LeadStatus.APPROVED, 0)
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    return {
        "total_leads": total_leads,
        "leads_by_source": leads_by_source,
        "leads_by_status": leads_by_status,
        "conversion_rate": round(conversion_rate, 2),
        "converted_leads": converted_leads,
        "period": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None
        }
    }
