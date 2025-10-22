"""
Authentication & Security
JWT tokens, password hashing, RBAC, and security utilities
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import secrets

from app.core.config import settings
from app.core.database import get_db
from app.models import User, UserRole

# ============================================================================
# PASSWORD HASHING
# ============================================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


# ============================================================================
# JWT TOKEN MANAGEMENT
# ============================================================================

security = HTTPBearer()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# DEPENDENCIES
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user
    
    Usage:
        @app.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Verify token type
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active == True,
            User.deleted_at.is_(None)
        )
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user (must be verified)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )
    
    return current_user


async def get_current_org(
    current_user: User = Depends(get_current_user)
) -> str:
    """
    Get current user's organization ID
    
    Usage:
        @app.get("/properties")
        async def get_properties(org_id: str = Depends(get_current_org)):
            # All queries will be scoped to this org_id
            pass
    """
    return str(current_user.org_id)


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC)
# ============================================================================

class RoleChecker:
    """Check if user has required role"""
    
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role}' not authorized for this action"
            )
        return current_user


# Convenience role checkers
require_owner = RoleChecker([UserRole.OWNER])
require_property_manager = RoleChecker([UserRole.OWNER, UserRole.MANAGER])
require_leasing_agent = RoleChecker([
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.MANAGER
])
require_maintenance = RoleChecker([
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.MANAGER
])


class PermissionChecker:
    """Check if user has specific permission"""
    
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
    
    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        # Check if user is owner (has all permissions)
        if current_user.role == UserRole.OWNER:
            return current_user
        
        # Check permissions dict
        if not current_user.permissions.get(self.required_permission, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{self.required_permission}' required"
            )
        
        return current_user


# ============================================================================
# API KEY AUTHENTICATION
# ============================================================================

def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"rai_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage"""
    return hash_password(api_key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verify an API key"""
    return verify_password(plain_key, hashed_key)


# ============================================================================
# EMAIL VERIFICATION
# ============================================================================

def generate_verification_token(email: str) -> str:
    """Generate email verification token"""
    data = {
        "sub": email,
        "type": "email_verification"
    }
    expires = timedelta(hours=24)
    return create_access_token(data, expires)


def verify_email_token(token: str) -> Optional[str]:
    """Verify email verification token and return email"""
    try:
        payload = decode_token(token)
        if payload.get("type") != "email_verification":
            return None
        return payload.get("sub")
    except:
        return None


# ============================================================================
# PASSWORD RESET
# ============================================================================

def generate_password_reset_token(email: str) -> str:
    """Generate password reset token"""
    data = {
        "sub": email,
        "type": "password_reset"
    }
    expires = timedelta(hours=1)
    return create_access_token(data, expires)


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token and return email"""
    try:
        payload = decode_token(token)
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except:
        return None


# ============================================================================
# SECURITY UTILITIES
# ============================================================================

def generate_random_password(length: int = 16) -> str:
    """Generate a random secure password"""
    return secrets.token_urlsafe(length)


def is_strong_password(password: str) -> tuple[bool, str]:
    """
    Check if password meets strength requirements
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    return True, ""


# ============================================================================
# RATE LIMITING
# ============================================================================

from collections import defaultdict
from datetime import datetime
import asyncio

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> bool:
        """Check if request is allowed under rate limit"""
        async with self.lock:
            now = datetime.utcnow()
            
            # Clean old requests
            cutoff = now - timedelta(seconds=window_seconds)
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > cutoff
            ]
            
            # Check limit
            if len(self.requests[key]) >= max_requests:
                return False
            
            # Add current request
            self.requests[key].append(now)
            return True


# Global rate limiter instance
rate_limiter = RateLimiter()


async def check_rate_limit(
    key: str,
    max_requests: int = 60,
    window_seconds: int = 60
):
    """Rate limit dependency"""
    if not settings.RATE_LIMIT_ENABLED:
        return
    
    allowed = await rate_limiter.is_allowed(key, max_requests, window_seconds)
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
