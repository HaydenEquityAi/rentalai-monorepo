"""
Subscription Model
Stripe subscription management for organizations
"""

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum
import uuid

from app.core.database import Base


class SubscriptionPlan(str, Enum):
    """Subscription plan types"""
    STARTER = "starter"
    GROWTH = "growth"
    PROFESSIONAL = "professional"


class SubscriptionStatus(str, Enum):
    """Subscription status types"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    PAUSED = "paused"


class Subscription(Base):
    """Organization subscription model"""
    __tablename__ = "subscriptions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Stripe fields
    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    stripe_subscription_id: Mapped[str] = mapped_column(String, nullable=True, unique=True, index=True)
    
    # Subscription details
    plan: Mapped[SubscriptionPlan] = mapped_column(SQLEnum(SubscriptionPlan), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Usage tracking
    door_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription(id={self.id}, org_id={self.org_id}, plan={self.plan}, status={self.status})>"
