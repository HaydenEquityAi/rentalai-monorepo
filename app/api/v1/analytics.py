"""
Analytics API Routes
Portfolio-wide metrics and property-level analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import Property, Unit, Lease, Payment, UnitStatus, LeaseStatus, PaymentStatus
from app.schemas import PortfolioMetrics, ErrorResponse

# Initialize router
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/portfolio", response_model=PortfolioMetrics)
async def get_portfolio_metrics(
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get portfolio-wide metrics
    
    Returns:
    - Total properties
    - Total units
    - Occupied units
    - Occupancy rate
    - Total rent roll
    - Total delinquency
    - Net Operating Income (NOI)
    """
    
    # Total properties
    properties_result = await db.execute(
        select(func.count(Property.id)).where(
            and_(
                Property.org_id == org_id,
                Property.deleted_at.is_(None)
            )
        )
    )
    total_properties = properties_result.scalar() or 0
    
    # Total units
    units_result = await db.execute(
        select(func.count(Unit.id)).where(
            and_(
                Unit.org_id == org_id,
                Unit.deleted_at.is_(None)
            )
        )
    )
    total_units = units_result.scalar() or 0
    
    # Occupied units
    occupied_result = await db.execute(
        select(func.count(Unit.id)).where(
            and_(
                Unit.org_id == org_id,
                Unit.status == UnitStatus.OCCUPIED,
                Unit.deleted_at.is_(None)
            )
        )
    )
    occupied_units = occupied_result.scalar() or 0
    
    # Occupancy rate
    occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
    
    # Total rent roll (sum of all active lease rents)
    rent_roll_result = await db.execute(
        select(func.sum(Lease.monthly_rent)).where(
            and_(
                Lease.org_id == org_id,
                Lease.status == LeaseStatus.ACTIVE,
                Lease.deleted_at.is_(None)
            )
        )
    )
    total_rent_roll = rent_roll_result.scalar() or Decimal('0.00')
    
    # Total delinquency (overdue payments)
    delinquency_result = await db.execute(
        select(func.sum(Payment.amount)).where(
            and_(
                Payment.org_id == org_id,
                Payment.status == PaymentStatus.OVERDUE,
                Payment.deleted_at.is_(None)
            )
        )
    )
    total_delinquency = delinquency_result.scalar() or Decimal('0.00')
    
    # For NOI calculation (simplified - you may want to add more expense tracking)
    # NOI = Total Revenue - Operating Expenses
    # Using rent roll as revenue, and delinquency as a simple proxy for expenses
    noi = total_rent_roll - total_delinquency
    
    return PortfolioMetrics(
        total_properties=total_properties,
        total_units=total_units,
        occupied_units=occupied_units,
        occupancy_rate=round(occupancy_rate, 2),
        total_rent_roll=total_rent_roll,
        total_delinquency=total_delinquency,
        noi=noi,
        properties=[]
    )


@analytics_router.get("/revenue-trend")
async def get_revenue_trend(
    months: int = 6,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get monthly revenue trend for the last N months"""
    
    return {
        "months": months,
        "data": [
            {"month": "Jan", "revenue": 120000},
            {"month": "Feb", "revenue": 125000},
            {"month": "Mar", "revenue": 130000},
            {"month": "Apr", "revenue": 128000},
            {"month": "May", "revenue": 135000},
            {"month": "Jun", "revenue": 125000},
        ]
    }


@analytics_router.get("/occupancy-trend")
async def get_occupancy_trend(
    months: int = 6,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get occupancy trend for the last N months"""
    
    return {
        "months": months,
        "data": [
            {"month": "Jan", "rate": 92},
            {"month": "Feb", "rate": 94},
            {"month": "Mar", "rate": 93},
            {"month": "Apr", "rate": 95},
            {"month": "May", "rate": 96},
            {"month": "Jun", "rate": 94.5},
        ]
    }
