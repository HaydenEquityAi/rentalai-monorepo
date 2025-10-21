"""
Properties API Routes
CRUD operations for property management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    Property, Unit, Owner, PropertyType, UnitStatus, Lease, LeaseStatus
)
from app.schemas import (
    PropertyResponse, PropertyCreate, PropertyUpdate, PropertyDetailResponse,
    UnitResponse, PaginatedResponse, ErrorResponse
)

logger = logging.getLogger(__name__)

# Initialize router
properties_router = APIRouter()


@properties_router.get("/", response_model=PaginatedResponse)
async def list_properties(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    property_type: Optional[PropertyType] = Query(None, description="Filter by property type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search in property name"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List properties with pagination and filters"""
    
    # Build query
    query = select(Property).where(
        and_(
            Property.org_id == org_id,
            Property.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if property_type:
        query = query.where(Property.property_type == property_type)
    
    if city:
        query = query.where(Property.city.ilike(f"%{city}%"))
    
    if search:
        query = query.where(Property.name.ilike(f"%{search}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(Property.created_at)).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    properties = result.scalars().all()
    
    return PaginatedResponse(
        items=[PropertyResponse.model_validate(prop) for prop in properties],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@properties_router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new property"""
    
    logger.info(f"Creating property for org {org_id}, user {current_user.id}")
    logger.info(f"Property data: {property_data.model_dump()}")
    
    # Determine owner_id - use provided one or create from current user
    owner_id = property_data.owner_id
    
    if not owner_id:
        logger.info("No owner_id provided, creating Owner from current user")
        try:
            # Create an Owner record from the current user
            owner = Owner(
                org_id=org_id,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
                email=current_user.email,
                phone=current_user.phone
            )
            logger.info(f"Created Owner object: {owner}")
            
            db.add(owner)
            await db.commit()
            await db.refresh(owner)
            
            logger.info(f"Owner created successfully with ID: {owner.id}")
            owner_id = owner.id
            
        except Exception as e:
            logger.error(f"Error creating Owner: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create owner: {str(e)}"
            )
    else:
        logger.info(f"Using provided owner_id: {owner_id}")
        # Verify provided owner exists and belongs to org
        try:
            result = await db.execute(
                select(Owner).where(
                    and_(
                        Owner.id == owner_id,
                        Owner.org_id == org_id,
                        Owner.deleted_at.is_(None)
                    )
                )
            )
            owner = result.scalar_one_or_none()
            
            if not owner:
                logger.error(f"Owner {owner_id} not found for org {org_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Owner not found"
                )
            
            logger.info(f"Found existing owner: {owner.id}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error finding owner: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to find owner: {str(e)}"
            )
    
    # Create property
    try:
        logger.info(f"Creating property with owner_id: {owner_id}")
        property = Property(
            org_id=org_id,
            owner_id=owner_id,
            name=property_data.name,
            property_type=property_data.property_type,
            address=property_data.address,
            city=property_data.city,
            state=property_data.state,
            zip_code=property_data.zip_code,
            country=property_data.country,
            year_built=property_data.year_built,
            total_units=property_data.total_units,
            square_footage=property_data.square_footage,
            lot_size=property_data.lot_size,
            purchase_price=property_data.purchase_price,
            purchase_date=property_data.purchase_date,
            market_value=property_data.market_value,
            photos=property_data.photos or []
        )
        
        db.add(property)
        await db.commit()
        await db.refresh(property)
        
        logger.info(f"Property created successfully with ID: {property.id}")
        return PropertyResponse.model_validate(property)
        
    except Exception as e:
        logger.error(f"Error creating property: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create property: {str(e)}"
        )


@properties_router.get("/{property_id}", response_model=PropertyDetailResponse)
async def get_property(
    property_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single property with units"""
    
    # Get property with units
    result = await db.execute(
        select(Property)
        .options(selectinload(Property.units), selectinload(Property.owner))
        .where(
            and_(
                Property.id == property_id,
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
    
    return PropertyDetailResponse.model_validate(property)


@properties_router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    property_data: PropertyUpdate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a property"""
    
    # Get property
    result = await db.execute(
        select(Property).where(
            and_(
                Property.id == property_id,
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
    
    # Update fields
    update_data = property_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property, field, value)
    
    await db.commit()
    await db.refresh(property)
    
    return PropertyResponse.model_validate(property)


@properties_router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a property"""
    
    # Get property
    result = await db.execute(
        select(Property).where(
            and_(
                Property.id == property_id,
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
    
    # Soft delete
    property.deleted_at = datetime.utcnow()
    await db.commit()


@properties_router.get("/{property_id}/analytics")
async def get_property_analytics(
    property_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get property performance metrics"""
    
    # Verify property exists
    result = await db.execute(
        select(Property).where(
            and_(
                Property.id == property_id,
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
    
    # Get analytics data
    # Total units
    total_units_result = await db.execute(
        select(func.count(Unit.id)).where(
            and_(
                Unit.property_id == property_id,
                Unit.deleted_at.is_(None)
            )
        )
    )
    total_units = total_units_result.scalar()
    
    # Occupied units
    occupied_units_result = await db.execute(
        select(func.count(Unit.id)).where(
            and_(
                Unit.property_id == property_id,
                Unit.status == UnitStatus.OCCUPIED,
                Unit.deleted_at.is_(None)
            )
        )
    )
    occupied_units = occupied_units_result.scalar()
    
    # Available units
    available_units_result = await db.execute(
        select(func.count(Unit.id)).where(
            and_(
                Unit.property_id == property_id,
                Unit.status == UnitStatus.AVAILABLE,
                Unit.deleted_at.is_(None)
            )
        )
    )
    available_units = available_units_result.scalar()
    
    # Active leases
    active_leases_result = await db.execute(
        select(func.count(Lease.id)).join(Unit).where(
            and_(
                Unit.property_id == property_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.deleted_at.is_(None)
            )
        )
    )
    active_leases = active_leases_result.scalar()
    
    # Calculate occupancy rate
    occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
    
    return {
        "property_id": str(property_id),
        "total_units": total_units,
        "occupied_units": occupied_units,
        "available_units": available_units,
        "active_leases": active_leases,
        "occupancy_rate": round(occupancy_rate, 2),
        "property_name": property.name,
        "property_type": property.property_type.value
    }


@properties_router.get("/{property_id}/units", response_model=List[UnitResponse])
async def get_property_units(
    property_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all units for a property"""
    
    # Verify property exists
    result = await db.execute(
        select(Property).where(
            and_(
                Property.id == property_id,
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
    
    # Get units
    result = await db.execute(
        select(Unit).where(
            and_(
                Unit.property_id == property_id,
                Unit.deleted_at.is_(None)
            )
        ).order_by(Unit.unit_number)
    )
    units = result.scalars().all()
    
    return [UnitResponse.model_validate(unit) for unit in units]
