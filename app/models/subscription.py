"""
Subscription Model
Stripe subscription management for organizations
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
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
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Stripe fields
    stripe_customer_id = Column(String, nullable=False, unique=True, index=True)
    stripe_subscription_id = Column(String, nullable=True, unique=True, index=True)
    
    # Subscription details
    plan = Column(SQLEnum(SubscriptionPlan), nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    current_period_end = Column(DateTime, nullable=True)
    
    # Usage tracking
    door_count = Column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription(id={self.id}, org_id={self.org_id}, plan={self.plan}, status={self.status})>"
