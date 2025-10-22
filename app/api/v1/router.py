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
from app.api.v1.properties import properties_router
from app.api.v1.units import units_router
from app.api.v1.leases import leases_router
from app.api.v1.leads import leads_router
from app.api.v1.maintenance import maintenance_router
from app.api.v1.payments import payments_router
from app.api.v1.billing import billing_router
from app.api.v1.analytics import analytics_router
from app.api.v1.users import users_router

# Include routers
api_router.include_router(auth_router)
api_router.include_router(ai_router)
api_router.include_router(properties_router, prefix="/properties", tags=["properties"])
api_router.include_router(units_router, prefix="/units", tags=["units"])
api_router.include_router(leases_router, prefix="/leases", tags=["leases"])
api_router.include_router(leads_router, prefix="/leads", tags=["leads"])
api_router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
api_router.include_router(billing_router, prefix="/billing", tags=["billing"])
api_router.include_router(analytics_router)
api_router.include_router(users_router)

# For now, let's add a simple health check endpoint
@api_router.get("/health")
async def api_health():
    """API health check endpoint"""
    return {"status": "healthy", "message": "RentalAi API is running"}
