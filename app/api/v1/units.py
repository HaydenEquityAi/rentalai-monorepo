"""
Units API Routes
CRUD operations for unit management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    Unit, Property, Lease, UnitStatus, LeaseStatus
)
from app.schemas import (
    UnitResponse, UnitCreate, UnitUpdate, LeaseResponse,
    PaginatedResponse, ErrorResponse
)

# Initialize router
units_router = APIRouter()


@units_router.get("/", response_model=PaginatedResponse)
async def list_units(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    property_id: Optional[UUID] = Query(None, description="Filter by property"),
    status: Optional[UnitStatus] = Query(None, description="Filter by status"),
    bedrooms: Optional[int] = Query(None, description="Filter by bedrooms"),
    min_rent: Optional[float] = Query(None, description="Minimum rent amount"),
    max_rent: Optional[float] = Query(None, description="Maximum rent amount"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List units with pagination and filters"""
    
    # Build query
    query = select(Unit).where(
        and_(
            Unit.org_id == org_id,
            Unit.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if property_id:
        query = query.where(Unit.property_id == property_id)
    
    if status:
        query = query.where(Unit.status == status)
    
    if bedrooms:
        query = query.where(Unit.bedrooms == bedrooms)
    
    if min_rent:
        query = query.where(Unit.rent_amount >= min_rent)
    
    if max_rent:
        query = query.where(Unit.rent_amount <= max_rent)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(Unit.unit_number).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    units = result.scalars().all()
    
    return PaginatedResponse(
        items=[UnitResponse.model_validate(unit) for unit in units],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@units_router.post("/", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    unit_data: UnitCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new unit"""
    
    # Verify property exists and belongs to org
    result = await db.execute(
        select(Property).where(
            and_(
                Property.id == unit_data.property_id,
                Property.org_id == org_id,
                Property.deleted_at.is_(None)
            )
        )
    )
    property = result.scalar_one_or_none()
    
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check if unit number already exists in this property
    existing_unit_result = await db.execute(
        select(Unit).where(
            and_(
                Unit.property_id == unit_data.property_id,
                Unit.unit_number == unit_data.unit_number,
                Unit.deleted_at.is_(None)
            )
        )
    )
    existing_unit = existing_unit_result.scalar_one_or_none()
    
    if existing_unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit number already exists in this property"
        )
    
    # Create unit
    unit = Unit(
        org_id=org_id,
        property_id=unit_data.property_id,
        unit_number=unit_data.unit_number,
        bedrooms=unit_data.bedrooms,
        bathrooms=unit_data.bathrooms,
        square_feet=unit_data.square_feet,
        rent_amount=unit_data.rent_amount,
        deposit_amount=unit_data.deposit_amount,
        status=unit_data.status,
        amenities=unit_data.amenities or [],
        photos=unit_data.photos or []
    )
    
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    
    return UnitResponse.model_validate(unit)


@units_router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(
    unit_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single unit with current lease"""
    
    # Get unit
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == unit_id,
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
    
    return UnitResponse.model_validate(unit)


@units_router.put("/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: UUID,
    unit_data: UnitUpdate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a unit"""
    
    # Get unit
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == unit_id,
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
    
    # Update fields
    update_data = unit_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(unit, field, value)
    
    await db.commit()
    await db.refresh(unit)
    
    return UnitResponse.model_validate(unit)


@units_router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a unit"""
    
    # Get unit
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == unit_id,
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
    
    # Check if unit has active lease
    active_lease_result = await db.execute(
        select(Lease).where(
            and_(
                Lease.unit_id == unit_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.deleted_at.is_(None)
            )
        )
    )
    active_lease = active_lease_result.scalar_one_or_none()
    
    if active_lease:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete unit with active lease"
        )
    
    # Soft delete
    unit.deleted_at = datetime.utcnow()
    await db.commit()


@units_router.get("/available", response_model=List[UnitResponse])
async def get_available_units(
    property_id: Optional[UUID] = Query(None, description="Filter by property"),
    bedrooms: Optional[int] = Query(None, description="Filter by bedrooms"),
    max_rent: Optional[float] = Query(None, description="Maximum rent amount"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get available units"""
    
    # Build query for available units
    query = select(Unit).where(
        and_(
            Unit.org_id == org_id,
            Unit.status == UnitStatus.AVAILABLE,
            Unit.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if property_id:
        query = query.where(Unit.property_id == property_id)
    
    if bedrooms:
        query = query.where(Unit.bedrooms == bedrooms)
    
    if max_rent:
        query = query.where(Unit.rent_amount <= max_rent)
    
    # Execute query
    result = await db.execute(query.order_by(Unit.rent_amount))
    units = result.scalars().all()
    
    return [UnitResponse.model_validate(unit) for unit in units]


@units_router.patch("/{unit_id}/status", response_model=UnitResponse)
async def update_unit_status(
    unit_id: UUID,
    status: UnitStatus,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update unit status"""
    
    # Get unit
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.id == unit_id,
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
    
    # Update status
    unit.status = status
    await db.commit()
    await db.refresh(unit)
    
    return UnitResponse.model_validate(unit)
