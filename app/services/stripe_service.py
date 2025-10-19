"""
Stripe Integration Service
app/services/stripe_service.py
"""

import stripe
from decimal import Decimal
from typing import Dict, Any, Optional
import logging

from app.core.config import settings
from app.models import Organization, Lease, Payment

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Handle all Stripe payment operations"""
    
    # ========================================================================
    # CUSTOMER MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_customer(
        org: Organization,
        email: str,
        name: str,
    ) -> str:
        """Create Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"org_id": str(org.id)},
            )
            logger.info(f"Created Stripe customer {customer.id} for org {org.id}")
            return customer.id
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {e}")
            raise
    
    @staticmethod
    async def get_or_create_customer(org: Organization, email: str, name: str) -> str:
        """Get existing customer or create new one"""
        if org.stripe_customer_id:
            return org.stripe_customer_id
        
        return await StripeService.create_customer(org, email, name)
    
    # ========================================================================
    # SUBSCRIPTION MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_subscription(
        customer_id: str,
        price_id: str,
        trial_days: int = 14,
    ) -> Dict[str, Any]:
        """Create subscription for customer"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                trial_period_days=trial_days,
                payment_behavior="default_incomplete",
                payment_settings={"save_default_payment_method": "on_subscription"},
                expand=["latest_invoice.payment_intent"],
            )
            
            return {
                "subscription_id": subscription.id,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                "status": subscription.status,
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {e}")
            raise
    
    @staticmethod
    async def cancel_subscription(subscription_id: str) -> bool:
        """Cancel subscription"""
        try:
            stripe.Subscription.delete(subscription_id)
            logger.info(f"Canceled subscription {subscription_id}")
            return True
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {e}")
            return False
    
    @staticmethod
    async def update_subscription(
        subscription_id: str,
        price_id: str,
    ) -> Dict[str, Any]:
        """Update subscription (change plan)"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            updated = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0].id,
                    "price": price_id,
                }],
                proration_behavior="create_prorations",
            )
            
            return {
                "subscription_id": updated.id,
                "status": updated.status,
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription: {e}")
            raise
    
    # ========================================================================
    # PAYMENT INTENT (ONE-TIME PAYMENTS)
    # ========================================================================
    
    @staticmethod
    async def create_payment_intent(
        amount: Decimal,
        currency: str = "usd",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create payment intent for one-time payment"""
        try:
            # Convert to cents
            amount_cents = int(amount * 100)
            
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                customer=customer_id,
                metadata=metadata or {},
                automatic_payment_methods={"enabled": True},
            )
            
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status,
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {e}")
            raise
    
    @staticmethod
    async def capture_payment_intent(payment_intent_id: str) -> bool:
        """Manually capture a payment intent"""
        try:
            stripe.PaymentIntent.capture(payment_intent_id)
            logger.info(f"Captured payment intent {payment_intent_id}")
            return True
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error capturing payment: {e}")
            return False
    
    # ========================================================================
    # RENT PAYMENT
    # ========================================================================
    
    @staticmethod
    async def charge_rent(
        lease: Lease,
        payment: Payment,
        payment_method_id: str,
    ) -> Dict[str, Any]:
        """Charge rent payment"""
        try:
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(payment.amount * 100),
                currency="usd",
                customer=lease.stripe_customer_id,
                payment_method=payment_method_id,
                off_session=True,
                confirm=True,
                metadata={
                    "lease_id": str(lease.id),
                    "payment_id": str(payment.id),
                },
            )
            
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
            }
        
        except stripe.error.CardError as e:
            logger.error(f"Card error: {e}")
            return {"error": str(e)}
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            raise
    
    # ========================================================================
    # WEBHOOKS
    # ========================================================================
    
    @staticmethod
    async def handle_webhook(payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Process Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            
            # Handle different event types
            if event.type == "payment_intent.succeeded":
                return await StripeService._handle_payment_succeeded(event.data.object)
            
            elif event.type == "payment_intent.payment_failed":
                return await StripeService._handle_payment_failed(event.data.object)
            
            elif event.type == "customer.subscription.created":
                return await StripeService._handle_subscription_created(event.data.object)
            
            elif event.type == "customer.subscription.updated":
                return await StripeService._handle_subscription_updated(event.data.object)
            
            elif event.type == "customer.subscription.deleted":
                return await StripeService._handle_subscription_deleted(event.data.object)
            
            elif event.type == "invoice.paid":
                return await StripeService._handle_invoice_paid(event.data.object)
            
            elif event.type == "invoice.payment_failed":
                return await StripeService._handle_invoice_failed(event.data.object)
            
            return {"status": "unhandled"}
        
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise
        
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise
    
    @staticmethod
    async def _handle_payment_succeeded(payment_intent: Dict) -> Dict[str, Any]:
        """Handle successful payment"""
        payment_id = payment_intent.metadata.get("payment_id")
        
        if payment_id:
            logger.info(f"Payment {payment_id} succeeded")
            # Update payment status in database here
        
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_payment_failed(payment_intent: Dict) -> Dict[str, Any]:
        """Handle failed payment"""
        payment_id = payment_intent.metadata.get("payment_id")
        
        if payment_id:
            logger.error(f"Payment {payment_id} failed")
            # Update payment status, send notification
        
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_subscription_created(subscription: Dict) -> Dict[str, Any]:
        """Handle subscription creation"""
        customer_id = subscription.get("customer")
        logger.info(f"Subscription created for customer {customer_id}")
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_subscription_updated(subscription: Dict) -> Dict[str, Any]:
        """Handle subscription update"""
        logger.info(f"Subscription {subscription.id} updated")
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_subscription_deleted(subscription: Dict) -> Dict[str, Any]:
        """Handle subscription cancellation"""
        logger.info(f"Subscription {subscription.id} deleted")
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_invoice_paid(invoice: Dict) -> Dict[str, Any]:
        """Handle paid invoice"""
        logger.info(f"Invoice {invoice.id} paid")
        return {"status": "handled"}
    
    @staticmethod
    async def _handle_invoice_failed(invoice: Dict) -> Dict[str, Any]:
        """Handle failed invoice"""
        logger.error(f"Invoice {invoice.id} payment failed")
        return {"status": "handled"}
