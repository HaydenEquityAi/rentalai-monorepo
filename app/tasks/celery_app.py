"""
Celery Tasks for RentalAi
Background job processing for emails, AI, and scheduled tasks
app/tasks/celery_app.py
"""

from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timedelta, date
from sqlalchemy import select
from decimal import Decimal
import logging

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import (
    Payment, PaymentStatus, Lease, LeaseStatus, WorkOrder,
    WorkOrderStatus, User, Organization
)
from app.services.communication_service import EmailService, SMSService
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "rentalai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    worker_prefetch_multiplier=1,
)


# ============================================================================
# SCHEDULED TASKS
# ============================================================================

# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    # Send rent reminders every day at 9 AM
    "send-rent-reminders": {
        "task": "app.tasks.celery_app.send_rent_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    
    # Process late payments every day at midnight
    "process-late-payments": {
        "task": "app.tasks.celery_app.process_late_payments",
        "schedule": crontab(hour=0, minute=0),
    },
    
    # Check lease expirations every day at 8 AM
    "check-lease-expirations": {
        "task": "app.tasks.celery_app.check_lease_expirations",
        "schedule": crontab(hour=8, minute=0),
    },
    
    # Generate owner statements on 1st of month at 6 AM
    "generate-owner-statements": {
        "task": "app.tasks.celery_app.generate_owner_statements",
        "schedule": crontab(hour=6, minute=0, day_of_month=1),
    },
    
    # Check overdue work orders every hour
    "check-overdue-workorders": {
        "task": "app.tasks.celery_app.check_overdue_workorders",
        "schedule": crontab(minute=0),  # Every hour
    },
}


# ============================================================================
# RENT & PAYMENT TASKS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.send_rent_reminders")
def send_rent_reminders():
    """Send rent payment reminders for payments due in 3 days"""
    logger.info("Starting rent reminder task")
    
    async def _send_reminders():
        async with AsyncSessionLocal() as db:
            # Get payments due in 3 days
            target_date = date.today() + timedelta(days=3)
            
            result = await db.execute(
                select(Payment)
                .where(
                    Payment.due_date == target_date,
                    Payment.status == PaymentStatus.PENDING,
                    Payment.deleted_at.is_(None)
                )
            )
            
            payments = result.scalars().all()
            
            sent_count = 0
            for payment in payments:
                try:
                    # Get lease and tenant info
                    lease = await db.get(Lease, payment.lease_id)
                    if not lease:
                        continue
                    
                    # Get tenant user
                    tenant_result = await db.execute(
                        select(User).where(User.id == lease.tenant_id)
                    )
                    tenant = tenant_result.scalar_one_or_none()
                    
                    if tenant and tenant.email:
                        # Send email reminder
                        await EmailService.send_rent_reminder(
                            to=tenant.email,
                            tenant_name=f"{tenant.first_name} {tenant.last_name}",
                            amount=float(payment.amount),
                            due_date=payment.due_date.strftime("%B %d, %Y"),
                            payment_link=f"https://app.rentalai.com/pay/{payment.id}",
                        )
                        
                        # Send SMS if phone available
                        if tenant.phone:
                            await SMSService.send_rent_reminder_sms(
                                to=tenant.phone,
                                tenant_name=tenant.first_name,
                                amount=float(payment.amount),
                                due_date=payment.due_date.strftime("%m/%d"),
                            )
                        
                        sent_count += 1
                
                except Exception as e:
                    logger.error(f"Failed to send reminder for payment {payment.id}: {e}")
                    continue
            
            logger.info(f"Sent {sent_count} rent reminders")
    
    import asyncio
    asyncio.run(_send_reminders())


@celery_app.task(name="app.tasks.celery_app.process_late_payments")
def process_late_payments():
    """Mark payments as late and apply late fees"""
    logger.info("Processing late payments")
    
    async def _process_late():
        async with AsyncSessionLocal() as db:
            # Get overdue payments
            today = date.today()
            
            result = await db.execute(
                select(Payment)
                .where(
                    Payment.due_date < today,
                    Payment.status == PaymentStatus.PENDING,
                    Payment.deleted_at.is_(None)
                )
            )
            
            payments = result.scalars().all()
            
            for payment in payments:
                try:
                    # Update status to late
                    payment.status = PaymentStatus.LATE
                    
                    # Calculate late fee (e.g., $50 or 5% of rent, whichever is greater)
                    late_fee = max(Decimal("50.00"), payment.amount * Decimal("0.05"))
                    
                    # Create late fee charge
                    late_fee_payment = Payment(
                        org_id=payment.org_id,
                        lease_id=payment.lease_id,
                        amount=late_fee,
                        payment_type="late_fee",
                        payment_method=payment.payment_method,
                        due_date=today,
                        status=PaymentStatus.PENDING,
                    )
                    db.add(late_fee_payment)
                    
                    # Send late payment notice
                    lease = await db.get(Lease, payment.lease_id)
                    if lease:
                        tenant = await db.get(User, lease.tenant_id)
                        if tenant and tenant.email:
                            # Send email notification
                            await EmailService.send_email(
                                to=tenant.email,
                                subject="Late Payment Notice",
                                html=f"Your rent payment is overdue. A late fee of ${late_fee} has been applied.",
                            )
                    
                    await db.commit()
                    logger.info(f"Processed late payment {payment.id}, applied ${late_fee} late fee")
                
                except Exception as e:
                    logger.error(f"Failed to process late payment {payment.id}: {e}")
                    await db.rollback()
    
    import asyncio
    asyncio.run(_process_late())


@celery_app.task(name="app.tasks.celery_app.charge_rent_autopay")
def charge_rent_autopay(payment_id: str):
    """Charge rent for autopay-enabled leases"""
    logger.info(f"Charging autopay for payment {payment_id}")
    
    async def _charge():
        async with AsyncSessionLocal() as db:
            payment = await db.get(Payment, payment_id)
            if not payment:
                logger.error(f"Payment {payment_id} not found")
                return
            
            lease = await db.get(Lease, payment.lease_id)
            if not lease:
                logger.error(f"Lease not found for payment {payment_id}")
                return
            
            # Get saved payment method
            # This would come from a saved payment method table
            payment_method_id = "pm_xxxxx"  # Get from tenant's saved methods
            
            # Charge payment
            result = await StripeService.charge_rent(
                lease=lease,
                payment=payment,
                payment_method_id=payment_method_id,
            )
            
            if result["success"]:
                logger.info(f"Successfully charged ${payment.amount} for payment {payment_id}")
            else:
                logger.error(f"Failed to charge payment {payment_id}: {result.get('error')}")
                
                # Send failed payment notification
                tenant = await db.get(User, lease.tenant_id)
                if tenant and tenant.email:
                    await EmailService.send_email(
                        to=tenant.email,
                        subject="Payment Failed",
                        html=f"Your automatic rent payment failed. Please update your payment method.",
                    )
            
            await db.commit()
    
    import asyncio
    asyncio.run(_charge())


# ============================================================================
# LEASE TASKS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.check_lease_expirations")
def check_lease_expirations():
    """Check for expiring leases and send renewal notices"""
    logger.info("Checking lease expirations")
    
    async def _check_expirations():
        async with AsyncSessionLocal() as db:
            # Get leases expiring in 60 days
            sixty_days = date.today() + timedelta(days=60)
            
            result = await db.execute(
                select(Lease)
                .where(
                    Lease.end_date == sixty_days,
                    Lease.status == LeaseStatus.ACTIVE,
                    Lease.deleted_at.is_(None)
                )
            )
            
            leases = result.scalars().all()
            
            for lease in leases:
                try:
                    # Update lease status
                    lease.status = LeaseStatus.EXPIRING
                    
                    # Send renewal notice
                    tenant = await db.get(User, lease.tenant_id)
                    if tenant and tenant.email:
                        await EmailService.send_email(
                            to=tenant.email,
                            subject="Lease Renewal Notice",
                            html=f"""
                                <h2>Your lease is expiring soon</h2>
                                <p>Your lease ends on {lease.end_date.strftime('%B %d, %Y')}.</p>
                                <p>If you'd like to renew, please contact us or use the renewal portal.</p>
                            """,
                        )
                    
                    await db.commit()
                    logger.info(f"Sent renewal notice for lease {lease.id}")
                
                except Exception as e:
                    logger.error(f"Failed to process lease expiration {lease.id}: {e}")
                    await db.rollback()
    
    import asyncio
    asyncio.run(_check_expirations())


# ============================================================================
# MAINTENANCE TASKS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.check_overdue_workorders")
def check_overdue_workorders():
    """Check for overdue work orders and send alerts"""
    logger.info("Checking overdue work orders")
    
    async def _check_overdue():
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            
            result = await db.execute(
                select(WorkOrder)
                .where(
                    WorkOrder.scheduled_date < now,
                    WorkOrder.status.in_([WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED]),
                    WorkOrder.deleted_at.is_(None)
                )
            )
            
            workorders = result.scalars().all()
            
            for wo in workorders:
                try:
                    # Send alert to property manager
                    property_manager = await db.get(User, wo.assigned_to)
                    if property_manager and property_manager.email:
                        await EmailService.send_email(
                            to=property_manager.email,
                            subject=f"Overdue Work Order #{wo.id}",
                            html=f"""
                                <h2>Work Order Overdue</h2>
                                <p>Work order #{wo.id} is overdue.</p>
                                <p><strong>Title:</strong> {wo.title}</p>
                                <p><strong>Priority:</strong> {wo.priority}</p>
                                <p>Please update the status.</p>
                            """,
                        )
                    
                    logger.info(f"Sent overdue alert for work order {wo.id}")
                
                except Exception as e:
                    logger.error(f"Failed to process overdue work order {wo.id}: {e}")
    
    import asyncio
    asyncio.run(_check_overdue())


# ============================================================================
# REPORTING TASKS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.generate_owner_statements")
def generate_owner_statements():
    """Generate monthly owner statements"""
    logger.info("Generating owner statements")
    
    async def _generate_statements():
        async with AsyncSessionLocal() as db:
            # Get all active organizations
            result = await db.execute(
                select(Organization)
                .where(
                    Organization.is_active == True,
                    Organization.deleted_at.is_(None)
                )
            )
            
            orgs = result.scalars().all()
            
            for org in orgs:
                try:
                    # Generate statement logic here
                    # This would calculate NOI, expenses, etc.
                    logger.info(f"Generated statement for org {org.id}")
                
                except Exception as e:
                    logger.error(f"Failed to generate statement for org {org.id}: {e}")
    
    import asyncio
    asyncio.run(_generate_statements())


# ============================================================================
# AI PROCESSING TASKS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.process_document_ai")
def process_document_ai(document_id: str, job_type: str):
    """Process document with AI in background"""
    logger.info(f"Processing document {document_id} with AI ({job_type})")
    
    async def _process():
        async with AsyncSessionLocal() as db:
            from app.models import Document, AIJob
            from app.ai.document_parser import document_parser
            
            document = await db.get(Document, document_id)
            if not document:
                logger.error(f"Document {document_id} not found")
                return
            
            # Process based on job type
            if job_type == "parse_lease":
                result = await document_parser.parse_lease(document.file_url)
            elif job_type == "analyze_risks":
                result = await document_parser.analyze_document_risks(document.file_url)
            else:
                logger.error(f"Unknown job type: {job_type}")
                return
            
            # Save results to AI job
            ai_job = AIJob(
                org_id=document.org_id,
                job_type=job_type,
                input_data={"document_id": document_id},
                output_data=result,
                status="completed" if not result.get("error") else "failed",
            )
            db.add(ai_job)
            await db.commit()
            
            logger.info(f"Completed AI processing for document {document_id}")
    
    import asyncio
    asyncio.run(_process())


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

@celery_app.task(name="app.tasks.celery_app.send_async_email")
def send_async_email(to: str, subject: str, html: str):
    """Send email asynchronously"""
    async def _send():
        await EmailService.send_email(to=to, subject=subject, html=html)
    
    import asyncio
    asyncio.run(_send())


@celery_app.task(name="app.tasks.celery_app.send_async_sms")
def send_async_sms(to: str, message: str):
    """Send SMS asynchronously"""
    async def _send():
        await SMSService.send_sms(to=to, message=message)
    
    import asyncio
    asyncio.run(_send())
