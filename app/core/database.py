"""
Database Configuration & Session Management
Async SQLAlchemy with connection pooling and dependency injection
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# DATABASE ENGINE
# ============================================================================

# Create async engine with connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    # Use NullPool for serverless (Railway, etc.)
    poolclass=NullPool if settings.ENVIRONMENT == "production" else None,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Database session dependency
    
    Usage in FastAPI routes:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()


# ============================================================================
# DATABASE UTILITIES
# ============================================================================

async def init_db() -> None:
    """Initialize database (create tables)"""
    from app.models import Base
    
    async with engine.begin() as conn:
        # Drop all tables (only in development!)
        if settings.is_development:
            await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database initialized successfully")


async def check_db_connection() -> bool:
    """Check if database connection is working"""
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


async def close_db() -> None:
    """Close database connections"""
    await engine.dispose()
    logger.info("Database connections closed")


# ============================================================================
# MULTI-TENANT UTILITIES
# ============================================================================

class OrgFilter:
    """Utility class for org-scoped queries"""
    
    @staticmethod
    def apply_org_filter(query, model, org_id: str):
        """Apply org_id filter to query"""
        return query.where(model.org_id == org_id)
    
    @staticmethod
    def apply_soft_delete_filter(query, model):
        """Apply soft delete filter (exclude deleted records)"""
        return query.where(model.deleted_at.is_(None))
    
    @staticmethod
    def apply_org_and_active_filter(query, model, org_id: str):
        """Apply both org and soft delete filters"""
        return query.where(
            model.org_id == org_id,
            model.deleted_at.is_(None)
        )


# ============================================================================
# PAGINATION UTILITIES
# ============================================================================

class Paginator:
    """Pagination helper"""
    
    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = min(100, max(1, page_size))  # Max 100 items per page
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size
    
    def paginate_response(self, items: list, total: int) -> dict:
        """Create paginated response"""
        total_pages = (total + self.page_size - 1) // self.page_size
        
        return {
            "items": items,
            "pagination": {
                "page": self.page,
                "page_size": self.page_size,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": self.page < total_pages,
                "has_prev": self.page > 1,
            }
        }


# ============================================================================
# TRANSACTION DECORATOR
# ============================================================================

from functools import wraps
from typing import Callable, Any

def transactional(func: Callable) -> Callable:
    """
    Decorator for transactional operations
    
    Usage:
        @transactional
        async def create_property(db: AsyncSession, data: dict):
            property = Property(**data)
            db.add(property)
            return property
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        db = kwargs.get('db') or args[0]
        
        try:
            result = await func(*args, **kwargs)
            await db.commit()
            return result
        except Exception as e:
            await db.rollback()
            logger.error(f"Transaction failed: {e}")
            raise
    
    return wrapper

# Export key components
__all__ = ["engine", "get_db", "AsyncSessionLocal", "init_db", "check_db_connection", "close_db"]
