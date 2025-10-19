"""
Authentication Routes
User registration, login, and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user, get_current_active_user
)
from app.models import User, UserRole, Organization, SubscriptionTier
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    ErrorResponse, ValidationErrorResponse
)

# Initialize router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user
    
    Creates a new user account and organization.
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create organization slug from org_name
    org_slug = user_data.org_name.lower().replace(" ", "-").replace("_", "-")
    
    # Check if organization with this slug already exists
    result = await db.execute(
        select(Organization).where(Organization.slug == org_slug)
    )
    existing_org = result.scalar_one_or_none()
    
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with this name already exists"
        )
    
    # Create new organization
    org = Organization(
        name=user_data.org_name,
        slug=org_slug,
        subscription_tier=SubscriptionTier.FREE,
        is_active=True,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    
    # Create user
    user = User(
        org_id=org.id,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=UserRole.OWNER,  # First user in org is always owner
        is_active=True,
        email_verified=False,  # Will need email verification
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
        id=user.id,
        org_id=user.org_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@auth_router.post("/login", response_model=TokenResponse)
async def login_user(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user and return access/refresh tokens
    
    Authenticates user credentials and returns JWT tokens.
    """
    # Find user by email
    result = await db.execute(
        select(User).where(
            User.email == login_data.email,
            User.is_active == True,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=1800,  # 30 minutes
        user=UserResponse(
            id=user.id,
            org_id=user.org_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            email_verified=user.email_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    )


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    
    Returns the profile of the currently authenticated user.
    """
    return UserResponse(
        id=current_user.id,
        org_id=current_user.org_id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    Exchanges a valid refresh token for a new access token.
    """
    try:
        # Decode refresh token
        payload = decode_token(refresh_token)
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.is_active == True,
                User.deleted_at.is_(None)
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token = create_access_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,  # Keep same refresh token
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserResponse(
                id=user.id,
                org_id=user.org_id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                is_active=user.is_active,
                email_verified=user.email_verified,
                created_at=user.created_at,
                updated_at=user.updated_at,
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@auth_router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    current_user: User = Depends(get_current_user)
):
    """
    Logout user (client-side token invalidation)
    
    Note: JWT tokens are stateless, so actual invalidation
    happens client-side by removing tokens from storage.
    """
    return {"message": "Successfully logged out"}


@auth_router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user email with verification token
    
    Marks user email as verified using email verification token.
    """
    try:
        # Decode verification token
        payload = decode_token(token)
        
        if payload.get("type") != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Find and update user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.email_verified:
            return {"message": "Email already verified"}
        
        user.email_verified = True
        await db.commit()
        
        return {"message": "Email successfully verified"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
