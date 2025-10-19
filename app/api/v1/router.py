"""
Main API Router - RentalAi Backend
Combines all API endpoints into a single router
"""

from fastapi import APIRouter

# Create main API router
api_router = APIRouter()

# Import and include all sub-routers here
from app.api.v1.ai_routes import ai_router
from app.api.v1.auth import auth_router

# Include routers
api_router.include_router(auth_router)
api_router.include_router(ai_router)

# Placeholder for other routers
# from app.api.v1.endpoints import properties, tenants, payments, etc.
# api_router.include_router(properties_router)
# api_router.include_router(tenants_router)
# api_router.include_router(payments_router)

# For now, let's add a simple health check endpoint
@api_router.get("/health")
async def api_health():
    """API health check endpoint"""
    return {"status": "healthy", "message": "RentalAi API is running"}
