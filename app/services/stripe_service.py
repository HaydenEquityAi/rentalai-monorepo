"""
Stripe Service
Handles all Stripe operations for subscriptions and billing
"""

import stripe
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.config import settings
from app.models import Organization, Subscription, SubscriptionPlan, SubscriptionStatus

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for handling Stripe operations"""
    
    @staticmethod
    async def create_customer(email: str, name: str, org_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "org_id": org_id,
                    "source": "rentalai"
                }
            )
            
            # Update organization with Stripe customer ID
            result = await db.execute(
                select(Organization).where(Organization.id == org_id)
            )
            org = result.scalar_one_or_none()
            if org:
                org.stripe_customer_id = customer.id
                await db.commit()
            
            logger.info(f"Created Stripe customer {customer.id} for org {org_id}")
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {e}")
            raise Exception(f"Failed to create customer: {str(e)}")
    
    @staticmethod
    async def create_checkout_session(org_id: str, plan: SubscriptionPlan, db: AsyncSession) -> Dict[str, Any]:
        """Create a Stripe checkout session for subscription"""
        try:
            # Get organization
            result = await db.execute(
                select(Organization).where(Organization.id == org_id)
            )
            org = result.scalar_one_or_none()
            if not org:
                raise Exception("Organization not found")
            
            # Ensure customer exists
            if not org.stripe_customer_id:
                # Create customer first
                await StripeService.create_customer(
                    email=org.users[0].email if org.users else "admin@rentalai.com",
                    name=org.name,
                    org_id=org_id,
                    db=db
                )
                # Refresh org
                await db.refresh(org)
            
            # Get price ID based on plan
            price_id = StripeService._get_price_id(plan)
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=org.stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{settings.FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/billing/cancel",
                metadata={
                    "org_id": org_id,
                    "plan": plan.value
                }
            )
            
            logger.info(f"Created checkout session {session.id} for org {org_id}")
            return {
                "session_id": session.id,
                "url": session.url,
                "plan": plan.value
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            raise Exception(f"Failed to create checkout session: {str(e)}")
    
    @staticmethod
    async def create_customer_portal_session(customer_id: str) -> Dict[str, Any]:
        """Create a customer portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{settings.FRONTEND_URL}/billing"
            )
            
            logger.info(f"Created portal session for customer {customer_id}")
            return {
                "url": session.url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating portal session: {e}")
            raise Exception(f"Failed to create portal session: {str(e)}")
    
    @staticmethod
    async def report_usage(subscription_item_id: str, quantity: int) -> Dict[str, Any]:
        """Report usage for metered billing"""
        try:
            usage_record = stripe.UsageRecord.create(
                subscription_item=subscription_item_id,
                quantity=quantity,
                timestamp='now'
            )
            
            logger.info(f"Reported usage {quantity} for subscription item {subscription_item_id}")
            return {
                "usage_record_id": usage_record.id,
                "quantity": quantity,
                "timestamp": usage_record.timestamp
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error reporting usage: {e}")
            raise Exception(f"Failed to report usage: {str(e)}")
    
    @staticmethod
    async def cancel_subscription(subscription_id: str) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            
            logger.info(f"Cancelled subscription {subscription_id}")
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "current_period_end": subscription.current_period_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription: {e}")
            raise Exception(f"Failed to cancel subscription: {str(e)}")
    
    @staticmethod
    async def get_subscription(subscription_id: str) -> Dict[str, Any]:
        """Get subscription details"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "items": [
                    {
                        "id": item.id,
                        "price_id": item.price.id,
                        "quantity": item.quantity
                    }
                    for item in subscription.items.data
                ]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting subscription: {e}")
            raise Exception(f"Failed to get subscription: {str(e)}")
    
    @staticmethod
    def _get_price_id(plan: SubscriptionPlan) -> str:
        """Get Stripe price ID for plan"""
        price_map = {
            SubscriptionPlan.STARTER: settings.STRIPE_STARTER_BASE,
            SubscriptionPlan.GROWTH: settings.STRIPE_GROWTH_BASE,
            SubscriptionPlan.PROFESSIONAL: settings.STRIPE_PROFESSIONAL_BASE,
        }
        return price_map[plan]
    
    @staticmethod
    def _get_usage_price_id(plan: SubscriptionPlan) -> str:
        """Get Stripe usage price ID for plan"""
        price_map = {
            SubscriptionPlan.STARTER: settings.STRIPE_STARTER_USAGE,
            SubscriptionPlan.GROWTH: settings.STRIPE_GROWTH_USAGE,
            SubscriptionPlan.PROFESSIONAL: settings.STRIPE_PROFESSIONAL_USAGE,
        }
        return price_map[plan]
    
    @staticmethod
    async def handle_webhook(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle Stripe webhook events"""
        try:
            event_type = event['type']
            
            if event_type == 'checkout.session.completed':
                await StripeService._handle_checkout_completed(event, db)
            elif event_type == 'customer.subscription.created':
                await StripeService._handle_subscription_created(event, db)
            elif event_type == 'customer.subscription.updated':
                await StripeService._handle_subscription_updated(event, db)
            elif event_type == 'customer.subscription.deleted':
                await StripeService._handle_subscription_deleted(event, db)
            elif event_type == 'invoice.payment_succeeded':
                await StripeService._handle_payment_succeeded(event, db)
            elif event_type == 'invoice.payment_failed':
                await StripeService._handle_payment_failed(event, db)
            
            logger.info(f"Processed webhook event: {event_type}")
            
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            raise
    
    @staticmethod
    async def _handle_checkout_completed(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle checkout session completed"""
        session = event['data']['object']
        org_id = session['metadata']['org_id']
        
        # Update organization with subscription ID
        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = result.scalar_one_or_none()
        if org:
            org.stripe_subscription_id = session['subscription']
            await db.commit()
    
    @staticmethod
    async def _handle_subscription_created(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle subscription created"""
        subscription = event['data']['object']
        customer_id = subscription['customer']
        
        # Get organization by customer ID
        result = await db.execute(
            select(Organization).where(Organization.stripe_customer_id == customer_id)
        )
        org = result.scalar_one_or_none()
        if org:
            # Create subscription record
            subscription_record = Subscription(
                org_id=str(org.id),
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription['id'],
                plan=SubscriptionPlan.STARTER,  # Default, will be updated
                status=SubscriptionStatus.ACTIVE,
                current_period_end=subscription['current_period_end']
            )
            db.add(subscription_record)
            await db.commit()
    
    @staticmethod
    async def _handle_subscription_updated(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle subscription updated"""
        subscription = event['data']['object']
        
        # Update subscription record
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription['id'])
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus(subscription['status'])
            sub.current_period_end = subscription['current_period_end']
            await db.commit()
    
    @staticmethod
    async def _handle_subscription_deleted(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle subscription deleted"""
        subscription = event['data']['object']
        
        # Update subscription record
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription['id'])
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.CANCELED
            await db.commit()
    
    @staticmethod
    async def _handle_payment_succeeded(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle successful payment"""
        invoice = event['data']['object']
        subscription_id = invoice['subscription']
        
        # Update subscription status
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.ACTIVE
            await db.commit()
    
    @staticmethod
    async def _handle_payment_failed(event: Dict[str, Any], db: AsyncSession) -> None:
        """Handle failed payment"""
        invoice = event['data']['object']
        subscription_id = invoice['subscription']
        
        # Update subscription status
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.PAST_DUE
            await db.commit()