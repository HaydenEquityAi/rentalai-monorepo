"""
Maintenance API Routes
CRUD operations for maintenance request management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    MaintenanceRequest, Unit, Property, User, MaintenanceStatus, MaintenancePriority
)
from app.schemas import (
    MaintenanceRequestResponse, MaintenanceRequestCreate, MaintenanceRequestUpdate,
    PaginatedResponse, ErrorResponse
)

# Initialize router
maintenance_router = APIRouter()


@maintenance_router.get("/", response_model=PaginatedResponse)
async def list_maintenance_requests(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    priority: Optional[MaintenancePriority] = Query(None, description="Filter by priority"),
    status: Optional[MaintenanceStatus] = Query(None, description="Filter by status"),
    property_id: Optional[UUID] = Query(None, description="Filter by property"),
    unit_id: Optional[UUID] = Query(None, description="Filter by unit"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List maintenance requests with pagination and filters"""
    
    # Build query
    query = select(MaintenanceRequest).where(
        and_(
            MaintenanceRequest.org_id == org_id,
            MaintenanceRequest.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if priority:
        query = query.where(MaintenanceRequest.priority == priority)
    
    if status:
        query = query.where(MaintenanceRequest.status == status)
    
    if property_id:
        query = query.join(Unit).where(Unit.property_id == property_id)
    
    if unit_id:
        query = query.where(MaintenanceRequest.unit_id == unit_id)
    
    if search:
        query = query.where(
            or_(
                MaintenanceRequest.title.ilike(f"%{search}%"),
                MaintenanceRequest.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(MaintenanceRequest.created_at)).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    requests = result.scalars().all()
    
    return PaginatedResponse(
        items=[MaintenanceRequestResponse.model_validate(req) for req in requests],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@maintenance_router.post("/", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_request(
    request_data: MaintenanceRequestCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new maintenance request"""
    
    # Verify unit exists and belongs to org
    if request_data.unit_id:
        result = await db.execute(
            select(Unit).where(
                and_(
                    Unit.id == request_data.unit_id,
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
    
    # Create maintenance request
    request = MaintenanceRequest(
        org_id=org_id,
        unit_id=request_data.unit_id,
        title=request_data.title,
        description=request_data.description,
        priority=request_data.priority,
        status=request_data.status,
        category=request_data.category,
        estimated_cost=request_data.estimated_cost
    )
    
    db.add(request)
    await db.commit()
    await db.refresh(request)
    
    return MaintenanceRequestResponse.model_validate(request)


@maintenance_router.get("/{request_id}", response_model=MaintenanceRequestResponse)
async def get_maintenance_request(
    request_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get maintenance request details"""
    
    # Get request
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.id == request_id,
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.deleted_at.is_(None)
            )
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    
    return MaintenanceRequestResponse.model_validate(request)


@maintenance_router.put("/{request_id}", response_model=MaintenanceRequestResponse)
async def update_maintenance_request(
    request_id: UUID,
    request_data: MaintenanceRequestUpdate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a maintenance request"""
    
    # Get request
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.id == request_id,
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.deleted_at.is_(None)
            )
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    
    # Update fields
    update_data = request_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(request, field, value)
    
    await db.commit()
    await db.refresh(request)
    
    return MaintenanceRequestResponse.model_validate(request)


@maintenance_router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_request(
    request_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a maintenance request"""
    
    # Get request
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.id == request_id,
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.deleted_at.is_(None)
            )
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    
    # Soft delete
    request.deleted_at = datetime.utcnow()
    await db.commit()


@maintenance_router.patch("/{request_id}/status", response_model=MaintenanceRequestResponse)
async def update_maintenance_status(
    request_id: UUID,
    status: MaintenanceStatus,
    resolution_notes: Optional[str] = None,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update maintenance request status"""
    
    # Get request
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.id == request_id,
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.deleted_at.is_(None)
            )
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    
    # Update status
    request.status = status
    
    # Add resolution notes if provided
    if resolution_notes:
        request.resolution_notes = resolution_notes
    
    # Set completion date if status is completed
    if status == MaintenanceStatus.COMPLETED:
        request.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(request)
    
    return MaintenanceRequestResponse.model_validate(request)


@maintenance_router.patch("/{request_id}/assign")
async def assign_maintenance_request(
    request_id: UUID,
    assigned_to: Optional[UUID] = None,
    vendor_name: Optional[str] = None,
    vendor_contact: Optional[str] = None,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign maintenance request to vendor or staff"""
    
    # Get request
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.id == request_id,
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.deleted_at.is_(None)
            )
        )
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found"
        )
    
    # Update assignment
    if assigned_to:
        # Verify user exists and belongs to org
        user_result = await db.execute(
            select(User).where(
                and_(
                    User.id == assigned_to,
                    User.org_id == org_id,
                    User.deleted_at.is_(None)
                )
            )
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        request.assigned_to = assigned_to
    
    # Update vendor info if provided
    if vendor_name:
        request.vendor_name = vendor_name
    
    if vendor_contact:
        request.vendor_contact = vendor_contact
    
    # Update status to in progress
    request.status = MaintenanceStatus.IN_PROGRESS
    
    await db.commit()
    await db.refresh(request)
    
    return {
        "message": "Maintenance request assigned successfully",
        "request_id": str(request_id),
        "assigned_to": str(assigned_to) if assigned_to else None,
        "vendor_name": vendor_name,
        "status": request.status.value
    }


@maintenance_router.get("/urgent", response_model=List[MaintenanceRequestResponse])
async def get_urgent_requests(
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get urgent maintenance requests"""
    
    # Get urgent requests (HIGH or URGENT priority, not completed)
    result = await db.execute(
        select(MaintenanceRequest).where(
            and_(
                MaintenanceRequest.org_id == org_id,
                MaintenanceRequest.priority.in_([MaintenancePriority.HIGH, MaintenancePriority.URGENT]),
                MaintenanceRequest.status != MaintenanceStatus.COMPLETED,
                MaintenanceRequest.deleted_at.is_(None)
            )
        ).order_by(MaintenanceRequest.priority.desc(), MaintenanceRequest.created_at)
    )
    requests = result.scalars().all()
    
    return [MaintenanceRequestResponse.model_validate(req) for req in requests]
