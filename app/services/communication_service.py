"""
Email & SMS Services for RentalAi
app/services/communication_service.py
"""

import resend
from twilio.rest import Client
from typing import List, Dict, Any, Optional
import logging
from jinja2 import Template

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize services
resend.api_key = settings.RESEND_API_KEY
twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_ACCOUNT_SID else None


# ============================================================================
# EMAIL SERVICE (Resend)
# ============================================================================

class EmailService:
    """Send emails via Resend"""
    
    @staticmethod
    async def send_email(
        to: str | List[str],
        subject: str,
        html: str,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Send email"""
        try:
            # Ensure to is a list
            if isinstance(to, str):
                to = [to]
            
            params = {
                "from": from_email or f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
                "to": to,
                "subject": subject,
                "html": html,
            }
            
            if reply_to:
                params["reply_to"] = reply_to
            if cc:
                params["cc"] = cc
            if bcc:
                params["bcc"] = bcc
            
            response = resend.Emails.send(params)
            
            logger.info(f"Email sent to {to}: {subject}")
            
            return {
                "success": True,
                "email_id": response.get("id"),
                "to": to,
            }
        
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def send_template_email(
        to: str | List[str],
        template_name: str,
        context: Dict[str, Any],
        subject: str,
    ) -> Dict[str, Any]:
        """Send email using template"""
        try:
            # Load template
            html = EmailTemplates.render(template_name, context)
            
            return await EmailService.send_email(
                to=to,
                subject=subject,
                html=html,
            )
        
        except Exception as e:
            logger.error(f"Failed to send template email: {e}")
            return {"success": False, "error": str(e)}
    
    # ========================================================================
    # PROPERTY MANAGEMENT EMAIL TEMPLATES
    # ========================================================================
    
    @staticmethod
    async def send_lease_invitation(
        to: str,
        tenant_name: str,
        property_name: str,
        unit_number: str,
        lease_link: str,
    ) -> Dict[str, Any]:
        """Send lease signing invitation"""
        return await EmailService.send_template_email(
            to=to,
            template_name="lease_invitation",
            subject=f"Sign Your Lease for {property_name} #{unit_number}",
            context={
                "tenant_name": tenant_name,
                "property_name": property_name,
                "unit_number": unit_number,
                "lease_link": lease_link,
            }
        )
    
    @staticmethod
    async def send_rent_reminder(
        to: str,
        tenant_name: str,
        amount: float,
        due_date: str,
        payment_link: str,
    ) -> Dict[str, Any]:
        """Send rent payment reminder"""
        return await EmailService.send_template_email(
            to=to,
            template_name="rent_reminder",
            subject=f"Rent Payment Reminder - ${amount} due {due_date}",
            context={
                "tenant_name": tenant_name,
                "amount": amount,
                "due_date": due_date,
                "payment_link": payment_link,
            }
        )
    
    @staticmethod
    async def send_maintenance_update(
        to: str,
        tenant_name: str,
        work_order_id: str,
        status: str,
        notes: str,
    ) -> Dict[str, Any]:
        """Send maintenance work order update"""
        return await EmailService.send_template_email(
            to=to,
            template_name="maintenance_update",
            subject=f"Maintenance Update - Work Order #{work_order_id}",
            context={
                "tenant_name": tenant_name,
                "work_order_id": work_order_id,
                "status": status,
                "notes": notes,
            }
        )
    
    @staticmethod
    async def send_application_status(
        to: str,
        applicant_name: str,
        property_name: str,
        status: str,
        next_steps: str,
    ) -> Dict[str, Any]:
        """Send application status update"""
        return await EmailService.send_template_email(
            to=to,
            template_name="application_status",
            subject=f"Application Status Update - {property_name}",
            context={
                "applicant_name": applicant_name,
                "property_name": property_name,
                "status": status,
                "next_steps": next_steps,
            }
        )
    
    @staticmethod
    async def send_owner_statement(
        to: str,
        owner_name: str,
        property_name: str,
        period: str,
        statement_link: str,
        noi: float,
    ) -> Dict[str, Any]:
        """Send monthly owner statement"""
        return await EmailService.send_template_email(
            to=to,
            template_name="owner_statement",
            subject=f"Owner Statement - {property_name} - {period}",
            context={
                "owner_name": owner_name,
                "property_name": property_name,
                "period": period,
                "statement_link": statement_link,
                "noi": noi,
            }
        )


# ============================================================================
# SMS SERVICE (Twilio)
# ============================================================================

class SMSService:
    """Send SMS via Twilio"""
    
    @staticmethod
    async def send_sms(
        to: str,
        message: str,
        from_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send SMS"""
        if not twilio_client:
            logger.error("Twilio not configured")
            return {"success": False, "error": "SMS service not configured"}
        
        try:
            # Ensure phone number has country code
            if not to.startswith("+"):
                to = f"+1{to}"
            
            message_obj = twilio_client.messages.create(
                body=message,
                from_=from_number or settings.TWILIO_PHONE_NUMBER,
                to=to,
            )
            
            logger.info(f"SMS sent to {to}: {message[:50]}...")
            
            return {
                "success": True,
                "message_sid": message_obj.sid,
                "to": to,
            }
        
        except Exception as e:
            logger.error(f"Failed to send SMS: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    # ========================================================================
    # PROPERTY MANAGEMENT SMS TEMPLATES
    # ========================================================================
    
    @staticmethod
    async def send_rent_reminder_sms(
        to: str,
        tenant_name: str,
        amount: float,
        due_date: str,
    ) -> Dict[str, Any]:
        """Send rent reminder via SMS"""
        message = f"Hi {tenant_name}, reminder: Rent of ${amount} is due on {due_date}. Pay online at [link]"
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_maintenance_confirmation_sms(
        to: str,
        tenant_name: str,
        appointment_date: str,
    ) -> Dict[str, Any]:
        """Send maintenance appointment confirmation"""
        message = f"Hi {tenant_name}, your maintenance appointment is scheduled for {appointment_date}. Reply CONFIRM to confirm."
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_showing_reminder_sms(
        to: str,
        prospect_name: str,
        property_name: str,
        showing_time: str,
    ) -> Dict[str, Any]:
        """Send showing reminder"""
        message = f"Hi {prospect_name}, reminder: Your showing at {property_name} is scheduled for {showing_time}. See you there!"
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_late_payment_sms(
        to: str,
        tenant_name: str,
        amount: float,
        late_fee: float,
    ) -> Dict[str, Any]:
        """Send late payment notice"""
        message = f"Hi {tenant_name}, your rent of ${amount} is overdue. A late fee of ${late_fee} has been applied. Please pay ASAP."
        return await SMSService.send_sms(to, message)


# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

class EmailTemplates:
    """HTML email templates"""
    
    BASE_TEMPLATE = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>RentalAi</h1>
            </div>
            <div class="content">
                {{ content }}
            </div>
            <div class="footer">
                <p>This email was sent by RentalAi Property Management</p>
                <p>If you have questions, contact your property manager</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    TEMPLATES = {
        "lease_invitation": """
            <h2>Sign Your Lease</h2>
            <p>Hi {{ tenant_name }},</p>
            <p>Your lease for <strong>{{ property_name }} #{{ unit_number }}</strong> is ready for signing.</p>
            <p>Please review and sign your lease agreement by clicking the button below:</p>
            <a href="{{ lease_link }}" class="button">Sign Lease</a>
            <p>If you have any questions, please contact us.</p>
            <p>Best regards,<br>The Property Management Team</p>
        """,
        
        "rent_reminder": """
            <h2>Rent Payment Reminder</h2>
            <p>Hi {{ tenant_name }},</p>
            <p>This is a friendly reminder that your rent payment of <strong>${{ amount }}</strong> is due on <strong>{{ due_date }}</strong>.</p>
            <a href="{{ payment_link }}" class="button">Pay Rent Online</a>
            <p>Thank you for being a valued resident!</p>
        """,
        
        "maintenance_update": """
            <h2>Maintenance Update</h2>
            <p>Hi {{ tenant_name }},</p>
            <p>Your maintenance request <strong>#{{ work_order_id }}</strong> has been updated.</p>
            <p><strong>Status:</strong> {{ status }}</p>
            <p><strong>Notes:</strong> {{ notes }}</p>
            <p>Thank you for your patience.</p>
        """,
        
        "application_status": """
            <h2>Application Status Update</h2>
            <p>Hi {{ applicant_name }},</p>
            <p>Your application for <strong>{{ property_name }}</strong> has been updated.</p>
            <p><strong>Status:</strong> {{ status }}</p>
            <p><strong>Next Steps:</strong> {{ next_steps }}</p>
            <p>We'll be in touch soon!</p>
        """,
        
        "owner_statement": """
            <h2>Monthly Owner Statement</h2>
            <p>Hi {{ owner_name }},</p>
            <p>Your owner statement for <strong>{{ property_name }}</strong> is ready.</p>
            <p><strong>Period:</strong> {{ period }}</p>
            <p><strong>Net Operating Income:</strong> ${{ noi }}</p>
            <a href="{{ statement_link }}" class="button">View Statement</a>
            <p>Thank you for trusting us with your property.</p>
        """,
    }
    
    @staticmethod
    def render(template_name: str, context: Dict[str, Any]) -> str:
        """Render email template"""
        if template_name not in EmailTemplates.TEMPLATES:
            raise ValueError(f"Template '{template_name}' not found")
        
        # Render content
        content_template = Template(EmailTemplates.TEMPLATES[template_name])
        content = content_template.render(**context)
        
        # Wrap in base template
        base_template = Template(EmailTemplates.BASE_TEMPLATE)
        return base_template.render(content=content)


# ============================================================================
# COMMUNICATION API ROUTES
# ============================================================================

from fastapi import APIRouter, Depends

communication_router = APIRouter(prefix="/communications", tags=["Communications"])

@communication_router.post("/email/send")
async def send_email_endpoint(
    to: str,
    subject: str,
    template: str,
    context: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Send email"""
    result = await EmailService.send_template_email(
        to=to,
        template_name=template,
        subject=subject,
        context=context,
    )
    return result

@communication_router.post("/sms/send")
async def send_sms_endpoint(
    to: str,
    message: str,
    current_user: User = Depends(get_current_user),
):
    """Send SMS"""
    result = await SMSService.send_sms(to=to, message=message)
    return result

@communication_router.post("/lease-invitation")
async def send_lease_invitation_endpoint(
    to: str,
    tenant_name: str,
    property_name: str,
    unit_number: str,
    lease_link: str,
    current_user: User = Depends(get_current_user),
):
    """Send lease signing invitation"""
    result = await EmailService.send_lease_invitation(
        to=to,
        tenant_name=tenant_name,
        property_name=property_name,
        unit_number=unit_number,
        lease_link=lease_link,
    )
    return result
