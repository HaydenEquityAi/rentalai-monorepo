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
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


@users_router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    
    allowed_fields = {'first_name', 'last_name', 'phone', 'avatar_url'}
    
    for field, value in updates.items():
        if field in allowed_fields and value is not None:
            setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_valid
