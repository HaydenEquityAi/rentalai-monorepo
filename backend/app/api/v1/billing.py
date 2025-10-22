"""
Billing API Routes
Stripe subscription and billing management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
from pydantic import BaseModel
import stripe
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.core.config import settings
from app.models import Organization, Subscription, SubscriptionPlan
from app.services.stripe_service import StripeService
from app.schemas import ErrorResponse

logger = logging.getLogger(__name__)

# Initialize router
billing_router = APIRouter()


class CheckoutSessionRequest(BaseModel):
    plan: str


@billing_router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session for subscription"""
    try:
        # Convert string to SubscriptionPlan enum
        try:
            plan = SubscriptionPlan(request.plan)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan: {request.plan}. Must be one of: {[p.value for p in SubscriptionPlan]}"
            )
        
        result = await StripeService.create_checkout_session(org_id, plan, db)
        return {
            "success": True,
            "session_id": result["session_id"],
            "url": result["url"],
            "plan": result["plan"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@billing_router.post("/portal-session")
async def create_portal_session(
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe customer portal session"""
    try:
        # Get organization
        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = result.scalar_one_or_none()
        
        if not org or not org.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Stripe customer found for this organization"
            )
        
        result = await StripeService.create_customer_portal_session(org.stripe_customer_id)
        return {
            "success": True,
            "url": result["url"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create portal session: {str(e)}"
        )


@billing_router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        # Handle the event
        await StripeService.handle_webhook(event, db)
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


@billing_router.get("/subscription")
async def get_subscription(
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current organization subscription"""
    try:
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.org_id == org_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return {
                "success": True,
                "subscription": None,
                "message": "No active subscription found"
            }
        
        # Get detailed info from Stripe if subscription exists
        stripe_data = None
        if subscription.stripe_subscription_id:
            try:
                stripe_data = await StripeService.get_subscription(subscription.stripe_subscription_id)
            except Exception as e:
                logger.warning(f"Could not fetch Stripe data: {e}")
        
        return {
            "success": True,
            "subscription": {
                "id": subscription.id,
                "org_id": subscription.org_id,
                "plan": subscription.plan.value,
                "status": subscription.status.value,
                "current_period_end": subscription.current_period_end,
                "door_count": subscription.door_count,
                "created_at": subscription.created_at,
                "updated_at": subscription.updated_at,
                "stripe_data": stripe_data
            }
        }
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription: {str(e)}"
        )


@billing_router.post("/report-usage")
async def report_usage(
    door_count: int,
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Report door count usage for metered billing"""
    try:
        # Get subscription
        result = await db.execute(
            select(Subscription).where(Subscription.org_id == org_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # Get subscription details from Stripe
        stripe_subscription = await StripeService.get_subscription(subscription.stripe_subscription_id)
        
        # Find usage-based subscription item
        usage_item = None
        for item in stripe_subscription["items"]:
            # Check if this is a usage-based price
            try:
                price = stripe.Price.retrieve(item["price_id"])
                if price.billing_scheme == "per_unit" and price.usage_type == "metered":
                    usage_item = item
                    break
            except:
                continue
        
        if not usage_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No usage-based pricing found for this subscription"
            )
        
        # Report usage to Stripe
        await StripeService.report_usage(usage_item["id"], door_count)
        
        # Update local subscription record
        subscription.door_count = door_count
        await db.commit()
        
        return {
            "success": True,
            "door_count": door_count,
            "message": "Usage reported successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reporting usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to report usage: {str(e)}"
        )


@billing_router.post("/cancel-subscription")
async def cancel_subscription(
    org_id: str = Depends(get_current_org),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel the current subscription"""
    try:
        # Get subscription
        result = await db.execute(
            select(Subscription).where(Subscription.org_id == org_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # Cancel subscription in Stripe
        result = await StripeService.cancel_subscription(subscription.stripe_subscription_id)
        
        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "cancel_at_period_end": result["cancel_at_period_end"],
            "current_period_end": result["current_period_end"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )
