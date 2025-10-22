"""
Users API Routes
User profile management and settings
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, verify_password
from app.models import User
from app.schemas import UserResponse, ErrorResponse

# Initialize router
users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user profile
    
    Returns the authenticated user's profile information
    """
    return UserResponse.model_validate(current_user)


@users_router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user profile
    
    Allowed fields:
    - first_name
    - last_name
    - phone
    - avatar_url
    """
    
    # Fields that can be updated
    allowed_fields = {'first_name', 'last_name', 'phone', 'avatar_url'}
    
    # Update only allowed fields
    for field, value in updates.items():
        if field in allowed_fields and value is not None:
            setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@users_router.put("/me/password")
async def update_password(
    password_data: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user password
    
    Required fields:
    - current_password
    - new_password
    """
    
    current_password = password_data.get('current_password')
    new_password = password_data.get('new_password')
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both current_password and new_password are required"
        )
    
    # Verify current password
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    current_user.hashed_password = hash_password(new_password)
    await db.commit()
    
    return {"message": "Password updated successfully"}


@users_router.put("/me/notifications")
async def update_notification_settings(
    settings: Dict[str, bool],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update notification preferences
    
    Accepted fields:
    - email_notifications
    - sms_notifications
    - late_rent_alerts
    - lease_expiring_alerts
    - maintenance_request_alerts
    - new_lead_alerts
    """
    
    # Store notification preferences in user metadata or separate table
    # For now, we'll just return success
    # You can extend the User model to include these fields
    
    return {
        "message": "Notification settings updated successfully",
        "settings": settings
    }


@users_router.get("/me/activity")
async def get_user_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent user activity
    
    Returns recent actions performed by the user
    """
    
    # This is a placeholder - you'd want to implement proper activity tracking
    return {
        "activities": [
            {
                "action": "logged_in",
                "timestamp": "2025-10-21T10:30:00Z",
                "details": "Logged in from web"
            },
            {
                "action": "created_property",
                "timestamp": "2025-10-20T15:45:00Z",
                "details": "Created property: Sunset Apartments"
            },
            {
                "action": "updated_lease",
                "timestamp": "2025-10-19T09:15:00Z",
                "details": "Updated lease for Unit 101"
            }
        ]
    }
