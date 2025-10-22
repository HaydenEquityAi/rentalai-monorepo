"""
Payments API Routes
CRUD operations for payment management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models import (
    Payment, Lease, PaymentStatus, PaymentMethod
)
from app.schemas import (
    PaymentResponse, PaymentCreate, PaymentUpdate,
    PaginatedResponse, ErrorResponse
)

# Initialize router
payments_router = APIRouter()


@payments_router.get("/", response_model=PaginatedResponse)
async def list_payments(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    status: Optional[PaymentStatus] = Query(None, description="Filter by status"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    tenant_email: Optional[str] = Query(None, description="Filter by tenant email"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List payments with pagination and filters"""
    
    # Build query
    query = select(Payment).where(
        and_(
            Payment.org_id == org_id,
            Payment.deleted_at.is_(None)
        )
    )
    
    # Apply filters
    if status:
        query = query.where(Payment.status == status)
    
    if payment_method:
        query = query.where(Payment.payment_method == payment_method)
    
    if start_date:
        query = query.where(Payment.due_date >= start_date)
    
    if end_date:
        query = query.where(Payment.due_date <= end_date)
    
    if tenant_email:
        query = query.join(Lease).where(Lease.tenant_email.ilike(f"%{tenant_email}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(desc(Payment.created_at)).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    payments = result.scalars().all()
    
    return PaginatedResponse(
        items=[PaymentResponse.model_validate(payment) for payment in payments],
        pagination={
            "page": (skip // limit) + 1,
            "page_size": limit,
            "total_items": total,
            "total_pages": (total + limit - 1) // limit,
            "has_next": skip + limit < total,
            "has_prev": skip > 0
        }
    )


@payments_router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment_data: PaymentCreate,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a new payment"""
    
    # Verify lease exists and belongs to org
    result = await db.execute(
        select(Lease).where(
            and_(
                Lease.id == payment_data.lease_id,
                Lease.org_id == org_id,
                Lease.deleted_at.is_(None)
            )
        )
    )
    lease = result.scalar_one_or_none()
    
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found"
        )
    
    # Create payment
    payment = Payment(
        org_id=org_id,
        lease_id=payment_data.lease_id,
        amount=payment_data.amount,
        payment_type=payment_data.payment_type,
        payment_method=payment_data.payment_method,
        due_date=payment_data.due_date,
        paid_date=payment_data.paid_date,
        status=payment_data.status,
        transaction_id=payment_data.transaction_id,
        notes=payment_data.notes
    )
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    return PaymentResponse.model_validate(payment)


@payments_router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment details"""
    
    # Get payment
    result = await db.execute(
        select(Payment).where(
            and_(
                Payment.id == payment_id,
                Payment.org_id == org_id,
                Payment.deleted_at.is_(None)
            )
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse.model_validate(payment)


@payments_router.get("/overdue", response_model=List[PaymentResponse])
async def get_overdue_payments(
    days_overdue: int = Query(1, ge=0, description="Minimum days overdue"),
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get overdue payments"""
    
    # Calculate cutoff date
    cutoff_date = date.today() - timedelta(days=days_overdue)
    
    # Get overdue payments
    result = await db.execute(
        select(Payment).where(
            and_(
                Payment.org_id == org_id,
                Payment.status == PaymentStatus.PENDING,
                Payment.due_date < cutoff_date,
                Payment.deleted_at.is_(None)
            )
        ).order_by(Payment.due_date)
    )
    payments = result.scalars().all()
    
    return [PaymentResponse.model_validate(payment) for payment in payments]


@payments_router.post("/{payment_id}/refund")
async def process_refund(
    payment_id: UUID,
    refund_amount: Optional[Decimal] = None,
    refund_reason: Optional[str] = None,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Process a refund for a payment"""
    
    # Get payment
    result = await db.execute(
        select(Payment).where(
            and_(
                Payment.id == payment_id,
                Payment.org_id == org_id,
                Payment.deleted_at.is_(None)
            )
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check if payment is eligible for refund
    if payment.status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paid payments can be refunded"
        )
    
    # Determine refund amount
    if refund_amount is None:
        refund_amount = payment.amount
    elif refund_amount > payment.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount cannot exceed original payment amount"
        )
    
    # Create refund payment record
    refund_payment = Payment(
        org_id=org_id,
        lease_id=payment.lease_id,
        amount=-refund_amount,  # Negative amount for refund
        payment_type="refund",
        payment_method=payment.payment_method,
        due_date=date.today(),
        paid_date=date.today(),
        status=PaymentStatus.PAID,
        transaction_id=f"REFUND_{payment.transaction_id}" if payment.transaction_id else None,
        notes=f"Refund for payment {payment_id}. Reason: {refund_reason or 'No reason provided'}"
    )
    
    db.add(refund_payment)
    
    # Update original payment status
    payment.status = PaymentStatus.REFUNDED
    if refund_reason:
        payment.notes = f"{payment.notes or ''}\nRefunded: {refund_reason}".strip()
    
    await db.commit()
    await db.refresh(refund_payment)
    
    return {
        "message": "Refund processed successfully",
        "original_payment_id": str(payment_id),
        "refund_payment_id": str(refund_payment.id),
        "refund_amount": float(refund_amount),
        "refund_reason": refund_reason
    }
