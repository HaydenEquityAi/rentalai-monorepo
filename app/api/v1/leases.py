"""
Leases API Routes
CRUD operations for lease management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    Lease, Unit, Property, LeaseStatus, UnitStatus
)
from app.schemas import (
    LeaseResponse, LeaseCreate, LeaseUpdate,
    PaginatedResponse, ErrorResponse
)

# Initialize router
leases_router = APIRouter()

def _enrich_lease_dict(lease) -> dict:
    """
    Enrich lease response with computed fields for frontend compatibility
    Adds: tenant_name, property_name, unit_number
    """
    from app.schemas import LeaseResponse
    
    # Convert to dict
    lease_dict = {
        "id": str(lease.id),
        "org_id": str(lease.org_id),
        "unit_id": str(lease.unit_id),
        "tenant_first_name": lease.tenant_first_name,
        "tenant_last_name": lease.tenant_last_name,
        "tenant_email": lease.tenant_email,
        "tenant_phone": lease.tenant_phone,
        "start_date": lease.start_date.isoformat(),
        "end_date": lease.end_date.isoformat(),
        "monthly_rent": float(lease.monthly_rent),
        "deposit_amount": float(lease.deposit_amount),
        "status": lease.status.value if hasattr(lease.status, 'value') else str(lease.status),
        "rent_due_day": lease.rent_due_day,
        "late_fee_amount": float(lease.late_fee_amount) if lease.late_fee_amount else None,
        "late_fee_grace_days": lease.late_fee_grace_days,
        "auto_pay_enabled": lease.auto_pay_enabled,
        "created_at": lease.created_at.isoformat(),
        "updated_at": lease.updated_at.isoformat() if lease.updated_at else None,
    }
    
    # Add computed fields for frontend
    lease_dict['tenant_name'] = f"{lease.tenant_first_name} {lease.tenant_last_name}"
    
    # Add related data if loaded
    if hasattr(lease, 'unit') and lease.unit:
        lease_dict['unit_number'] = lease.unit.unit_number
        if hasattr(lease.unit, 'property') and lease.unit.property:
            lease_dict['property_name'] = lease.unit.property.name
            lease_dict['property_id'] = str(lease.unit.property.id)
    
    return lease_dict

@leases_router.get("/", response_model=PaginatedResponse)
async def list_leases(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    status: Optional[LeaseStatus] = Query(None, description="Filter by status"),
    property_id: Optional[UUID] = Query(None, description="Filter by property"),
    unit_id: Optional[UUID] = Query(None, description="Filter by unit"),
    tenant_email: Optional[str] = Query(None, description="Filter by tenant email"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List leases with pagination and filters"""
    
    # Build query
    query = select(Lease).where(
        and_(
            Lease.org_id == org_id,
            Lease.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if status:
        query = query.where(Lease.status == status)
    
    if property_id:
        query = query.join(Unit).where(Unit.property_id == property_id)
    
    if unit_id:
        query = query.where(Lease.unit_id == unit_id)
    
    if tenant_email:
        query = query.where(Lease.tenant_email.ilike(f"%{tenant_email}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(Lease.created_at)).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    leases = result.scalars().all()
    
    return PaginatedResponse(
        items=[LeaseResponse.model_validate(lease) for lease in leases],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@leases_router.post("/", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    lease_data: LeaseCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new lease"""
    
    # Verify unit exists and belongs to org
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == lease_data.unit_id,
                Unit.org_id == org_id,
                Unit.deleted_at.is_(None)
            )
        )
    )
    unit = result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    
    # Check if unit is available
    if unit.status != UnitStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit is not available for lease"
        )
    
    # Check if unit already has active lease
    active_lease_result = await db.execute(
        select(Lease).where(
            and_(
                Lease.unit_id == lease_data.unit_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.deleted_at.is_(None)
            )
        )
    )
    active_lease = active_lease_result.scalar_one_or_none()
    
    if active_lease:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit already has an active lease"
        )
    
    # Create lease
    lease = Lease(
        org_id=org_id,
        unit_id=lease_data.unit_id,
        tenant_first_name=lease_data.tenant_first_name,
        tenant_last_name=lease_data.tenant_last_name,
        tenant_email=lease_data.tenant_email,
        tenant_phone=lease_data.tenant_phone,
        start_date=lease_data.start_date,
        end_date=lease_data.end_date,
        monthly_rent=lease_data.monthly_rent,
        deposit_amount=lease_data.deposit_amount,
        status=lease_data.status,
        rent_due_day=lease_data.rent_due_day,
        late_fee_amount=lease_data.late_fee_amount,
        late_fee_grace_days=lease_data.late_fee_grace_days,
        auto_pay_enabled=lease_data.auto_pay_enabled
    )
    
    db.add(lease)
    
    # Update unit status to occupied
    unit.status = UnitStatus.OCCUPIED
    
    await db.commit()
    await db.refresh(lease)
    
    return LeaseResponse.model_validate(lease)


@leases_router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single lease with tenant & unit details"""
    
    # Get lease with unit
    result = await db.execute(
        select(Lease)
        .options(selectinload(Lease.unit))
        .where(
            and_(
                Lease.id == lease_id,
                Lease.org_id == org_id,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )
    
    return _enrich_lease_dict(lease)


@leases_router.put("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: UUID,
    lease_data: LeaseUpdate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a lease"""
    
    # Get lease
    result = await db.execute(
        select(Lease).where(
            and_(
                Lease.id == lease_id,
                Lease.org_id == org_id,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )
    
    # Update fields
    update_data = lease_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lease, field, value)
    
    await db.commit()
    await db.refresh(lease)
    
    return LeaseResponse.model_validate(lease)


@leases_router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    lease_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a lease"""
    
    # Get lease
    result = await db.execute(
        select(Lease).where(
            and_(
                Lease.id == lease_id,
                Lease.org_id == org_id,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )
    
    # Soft delete
    lease.deleted_at = datetime.utcnow()
    
    # Update unit status back to available
    unit_result = await db.execute(
        select(Unit).where(Unit.id == lease.unit_id)
    )
    unit = unit_result.scalar_one_or_none()
    if unit:
        unit.status = UnitStatus.AVAILABLE
    
    await db.commit()


@leases_router.get("/expiring", response_model=List[LeaseResponse])
async def get_expiring_leases(
    days: int = Query(30, ge=1, le=365, description="Days ahead to check for expiring leases"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get expiring leases within specified days"""
    
    # Calculate target date
    target_date = date.today() + timedelta(days=days)
    
    # Get expiring leases
    result = await db.execute(
        select(Lease).where(
            and_(
                Lease.org_id == org_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.end_date <= target_date,
                Lease.end_date >= date.today(),
                Lease.deleted_at.is_(None)
            )
        ).order_by(Lease.end_date)
    )
    leases = result.scalars().all()
    
    return [LeaseResponse.model_validate(lease) for lease in leases]


@leases_router.post("/{lease_id}/renew", response_model=LeaseResponse)
async def renew_lease(
    lease_id: UUID,
    new_end_date: date,
    new_monthly_rent: Optional[float] = None,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Renew a lease"""
    
    # Get lease
    result = await db.execute(
        select(Lease).options(
            selectinload(Lease.unit).selectinload(Unit.property)
        ).where(
            and_(
                Lease.id == lease_id,
                Lease.org_id == org_id,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active lease not found"
        )
    
    # Update lease end date
    lease.end_date = new_end_date
    
    # Update rent if provided
    if new_monthly_rent:
        lease.monthly_rent = new_monthly_rent
    
    # Mark as renewed
    lease.renewal_offered = True
    
    await db.commit()
    await db.refresh(lease)
    
    return LeaseResponse.model_validate(lease)


@leases_router.post("/{lease_id}/terminate", response_model=LeaseResponse)
async def terminate_lease(
    lease_id: UUID,
    termination_date: date,
    reason: Optional[str] = None,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Terminate a lease"""
    
    # Get lease
    result = await db.execute(
        select(Lease).where(
            and_(
                Lease.id == lease_id,
                Lease.org_id == org_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active lease not found"
        )
    
    # Update lease
    lease.status = LeaseStatus.TERMINATED
    lease.end_date = termination_date
    
    # Update unit status to available
    unit_result = await db.execute(
        select(Unit).where(Unit.id == lease.unit_id)
    )
    unit = unit_result.scalar_one_or_none()
    if unit:
        unit.status = UnitStatus.AVAILABLE
    
    await db.commit()
    await db.refresh(lease)
    
    return LeaseResponse.model_validate(lease)
