"""
Accounting API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_org
from app.models.accounting import AccountType, TransactionType
from app.services.accounting_service import AccountingService
from app.services.report_export_service import ReportExportService
from app.models import User

logger = logging.getLogger(__name__)
accounting_router = APIRouter()

@accounting_router.get("/accounts")
async def get_accounts(
    account_type: Optional[AccountType] = None,
    is_active: bool = True,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    accounts = await AccountingService.get_accounts(db, UUID(org_id), account_type, is_active)
    return {"data": [{"id": str(a.id), "account_number": a.account_number, "account_name": a.account_name, "account_type": a.account_type.value} for a in accounts]}

@accounting_router.post("/accounts", status_code=201)
async def create_account(
    account_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if "account_type" in account_data:
        account_data["account_type"] = AccountType(account_data["account_type"])
    account = await AccountingService.create_account(db, UUID(org_id), account_data)
    return {"data": {"id": str(account.id), "account_number": account.account_number}}

@accounting_router.get("/transactions")
async def get_transactions(
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    transactions = await AccountingService.get_transactions(db, UUID(org_id))
    return {"data": [{"id": str(t.id), "amount": str(t.amount)} for t in transactions]}

# BUDGET ENDPOINTS
@accounting_router.get("/budgets")
async def get_budgets(
    property_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get budgets with optional filters"""
    budgets = await AccountingService.get_budgets(
        db, 
        UUID(org_id), 
        UUID(property_id) if property_id else None,
        year,
        month
    )
    return {
        "data": [
            {
                "id": str(b.id),
                "property_id": str(b.property_id) if b.property_id else None,
                "account_id": str(b.account_id),
                "year": b.year,
                "month": b.month,
                "budgeted_amount": str(b.budgeted_amount),
                "notes": b.notes,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in budgets
        ]
    }

@accounting_router.post("/budgets", status_code=201)
async def create_budget(
    budget_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new budget"""
    try:
        budget = await AccountingService.create_budget(db, UUID(org_id), budget_data)
        return {
            "data": {
                "id": str(budget.id),
                "property_id": str(budget.property_id) if budget.property_id else None,
                "account_id": str(budget.account_id),
                "year": budget.year,
                "month": budget.month,
                "budgeted_amount": str(budget.budgeted_amount),
                "notes": budget.notes,
            }
        }
    except Exception as e:
        logger.error(f"Error creating budget: {e}")
        raise HTTPException(status_code=400, detail="Failed to create budget")

@accounting_router.put("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    budget_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing budget"""
    budget = await AccountingService.update_budget(db, UUID(budget_id), UUID(org_id), budget_data)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {
        "data": {
            "id": str(budget.id),
            "property_id": str(budget.property_id) if budget.property_id else None,
            "account_id": str(budget.account_id),
            "year": budget.year,
            "month": budget.month,
            "budgeted_amount": str(budget.budgeted_amount),
            "notes": budget.notes,
        }
    }

@accounting_router.get("/budgets/vs-actual")
async def get_budget_vs_actual(
    property_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get budget vs actual comparison report"""
    if not year or not month:
        raise HTTPException(status_code=400, detail="Year and month are required")
    
    report = await AccountingService.get_budget_vs_actual(
        db,
        UUID(org_id),
        UUID(property_id) if property_id else None,
        year,
        month
    )
    return {"data": report}

# VENDOR ENDPOINTS
@accounting_router.get("/vendors")
async def get_vendors(
    is_active: Optional[bool] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get vendors with optional active filter"""
    vendors = await AccountingService.get_vendors(db, UUID(org_id), is_active)
    return {
        "data": [
            {
                "id": str(v.id),
                "vendor_name": v.vendor_name,
                "contact_person": v.contact_person,
                "email": v.email,
                "phone": v.phone,
                "address": v.address,
                "tax_id": v.tax_id,
                "payment_terms": v.payment_terms,
                "is_active": v.is_active,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in vendors
        ]
    }

@accounting_router.get("/vendors/{vendor_id}")
async def get_vendor(
    vendor_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single vendor by ID"""
    vendor = await AccountingService.get_vendor(db, UUID(vendor_id), UUID(org_id))
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "data": {
            "id": str(vendor.id),
            "vendor_name": vendor.vendor_name,
            "contact_person": vendor.contact_person,
            "email": vendor.email,
            "phone": vendor.phone,
            "address": vendor.address,
            "tax_id": vendor.tax_id,
            "payment_terms": vendor.payment_terms,
            "is_active": vendor.is_active,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
        }
    }

@accounting_router.post("/vendors", status_code=201)
async def create_vendor(
    vendor_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new vendor"""
    try:
        vendor = await AccountingService.create_vendor(db, UUID(org_id), vendor_data)
        return {
            "data": {
                "id": str(vendor.id),
                "vendor_name": vendor.vendor_name,
                "contact_person": vendor.contact_person,
                "email": vendor.email,
                "phone": vendor.phone,
                "address": vendor.address,
                "tax_id": vendor.tax_id,
                "payment_terms": vendor.payment_terms,
                "is_active": vendor.is_active,
            }
        }
    except Exception as e:
        logger.error(f"Error creating vendor: {e}")
        raise HTTPException(status_code=400, detail="Failed to create vendor")

@accounting_router.put("/vendors/{vendor_id}")
async def update_vendor(
    vendor_id: str,
    vendor_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing vendor"""
    vendor = await AccountingService.update_vendor(db, UUID(vendor_id), UUID(org_id), vendor_data)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "data": {
            "id": str(vendor.id),
            "vendor_name": vendor.vendor_name,
            "contact_person": vendor.contact_person,
            "email": vendor.email,
            "phone": vendor.phone,
            "address": vendor.address,
            "tax_id": vendor.tax_id,
            "payment_terms": vendor.payment_terms,
            "is_active": vendor.is_active,
        }
    }

@accounting_router.get("/vendors/{vendor_id}/1099")
async def get_vendor_1099_data(
    vendor_id: str,
    year: int = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get vendor 1099 data for a specific year"""
    data = await AccountingService.get_vendor_1099_data(db, UUID(vendor_id), UUID(org_id), year)
    if not data:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {"data": data}

# INVOICE ENDPOINTS
@accounting_router.get("/invoices")
async def get_invoices(
    vendor_id: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get invoices with optional filters"""
    invoices = await AccountingService.get_invoices(
        db,
        UUID(org_id),
        UUID(vendor_id) if vendor_id else None,
        UUID(property_id) if property_id else None,
        status
    )
    return {
        "data": [
            {
                "id": str(inv.id),
                "property_id": str(inv.property_id) if inv.property_id else None,
                "vendor_id": str(inv.vendor_id) if inv.vendor_id else None,
                "tenant_id": str(inv.tenant_id) if inv.tenant_id else None,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "subtotal": str(inv.subtotal),
                "tax_amount": str(inv.tax_amount),
                "total_amount": str(inv.total_amount),
                "amount_paid": str(inv.amount_paid),
                "status": inv.status,
                "notes": inv.notes,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
            for inv in invoices
        ]
    }

@accounting_router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single invoice with line items"""
    invoice = await AccountingService.get_invoice(db, UUID(invoice_id), UUID(org_id))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "data": {
            "id": str(invoice.id),
            "property_id": str(invoice.property_id) if invoice.property_id else None,
            "vendor_id": str(invoice.vendor_id) if invoice.vendor_id else None,
            "tenant_id": str(invoice.tenant_id) if invoice.tenant_id else None,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "subtotal": str(invoice.subtotal),
            "tax_amount": str(invoice.tax_amount),
            "total_amount": str(invoice.total_amount),
            "amount_paid": str(invoice.amount_paid),
            "status": invoice.status,
            "notes": invoice.notes,
            "line_items": [
                {
                    "id": str(item.id),
                    "account_id": str(item.account_id),
                    "description": item.description,
                    "quantity": str(item.quantity),
                    "unit_price": str(item.unit_price),
                    "total_amount": str(item.total_amount),
                }
                for item in invoice.line_items
            ],
        }
    }

@accounting_router.post("/invoices", status_code=201)
async def create_invoice(
    invoice_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invoice with line items"""
    try:
        invoice = await AccountingService.create_invoice(db, UUID(org_id), invoice_data)
        return {
            "data": {
                "id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "total_amount": str(invoice.total_amount),
                "status": invoice.status,
            }
        }
    except Exception as e:
        logger.error(f"Error creating invoice: {e}")
        raise HTTPException(status_code=400, detail="Failed to create invoice")

@accounting_router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing invoice"""
    invoice = await AccountingService.update_invoice(db, UUID(invoice_id), UUID(org_id), invoice_data)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "data": {
            "id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "total_amount": str(invoice.total_amount),
            "status": invoice.status,
        }
    }

@accounting_router.post("/invoices/{invoice_id}/pay")
async def mark_invoice_paid(
    invoice_id: str,
    payment_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an invoice as paid"""
    try:
        payment_date = date.fromisoformat(payment_data["payment_date"])
        amount = Decimal(str(payment_data["amount"]))
        
        invoice = await AccountingService.mark_invoice_paid(
            db, UUID(invoice_id), UUID(org_id), payment_date, amount
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "data": {
                "id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "amount_paid": str(invoice.amount_paid),
                "status": invoice.status,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payment data format")
    except Exception as e:
        logger.error(f"Error marking invoice as paid: {e}")
        raise HTTPException(status_code=400, detail="Failed to mark invoice as paid")

# BANK ACCOUNT ENDPOINTS
@accounting_router.get("/bank-accounts")
async def get_bank_accounts(
    is_active: Optional[bool] = Query(None),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bank accounts with optional active filter"""
    bank_accounts = await AccountingService.get_bank_accounts(db, UUID(org_id), is_active)
    return {
        "data": [
            {
                "id": str(ba.id),
                "account_id": str(ba.account_id),
                "bank_name": ba.bank_name,
                "account_number": ba.account_number,
                "routing_number": ba.routing_number,
                "account_type": ba.account_type,
                "current_balance": str(ba.current_balance),
                "is_active": ba.is_active,
                "created_at": ba.created_at.isoformat() if ba.created_at else None,
            }
            for ba in bank_accounts
        ]
    }

@accounting_router.post("/bank-accounts", status_code=201)
async def create_bank_account(
    bank_account_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new bank account"""
    try:
        bank_account = await AccountingService.create_bank_account(db, UUID(org_id), bank_account_data)
        return {
            "data": {
                "id": str(bank_account.id),
                "bank_name": bank_account.bank_name,
                "account_number": bank_account.account_number,
                "current_balance": str(bank_account.current_balance),
            }
        }
    except Exception as e:
        logger.error(f"Error creating bank account: {e}")
        raise HTTPException(status_code=400, detail="Failed to create bank account")

@accounting_router.put("/bank-accounts/{bank_account_id}/balance")
async def update_bank_account_balance(
    bank_account_id: str,
    balance_data: dict,
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update bank account balance"""
    try:
        new_balance = Decimal(str(balance_data["new_balance"]))
        bank_account = await AccountingService.update_balance(
            db, UUID(bank_account_id), UUID(org_id), new_balance
        )
        if not bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        return {
            "data": {
                "id": str(bank_account.id),
                "bank_name": bank_account.bank_name,
                "current_balance": str(bank_account.current_balance),
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid balance format")
    except Exception as e:
        logger.error(f"Error updating bank account balance: {e}")
        raise HTTPException(status_code=400, detail="Failed to update balance")

# FINANCIAL REPORTS ENDPOINTS
@accounting_router.get("/reports/profit-loss")
async def get_profit_loss_report(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate profit and loss statement"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        report = await AccountingService.get_profit_loss(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        return {"data": report}
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error generating profit loss report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@accounting_router.get("/reports/balance-sheet")
async def get_balance_sheet_report(
    property_id: Optional[str] = Query(None),
    as_of_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate balance sheet"""
    try:
        as_of_date_obj = date.fromisoformat(as_of_date)
        
        report = await AccountingService.get_balance_sheet(
            db,
            UUID(org_id),
            as_of_date_obj,
            UUID(property_id) if property_id else None
        )
        return {"data": report}
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error generating balance sheet: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@accounting_router.get("/reports/cash-flow")
async def get_cash_flow_report(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate cash flow statement"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        report = await AccountingService.get_cash_flow(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        return {"data": report}
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error generating cash flow report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

# REPORT EXPORT ENDPOINTS
@accounting_router.get("/reports/profit-loss/pdf")
async def export_profit_loss_pdf(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Profit & Loss statement as PDF"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        # Get report data
        report_data = await AccountingService.get_profit_loss(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate PDF
        pdf_buffer = ReportExportService.export_profit_loss_pdf(
            report_data, org_name, start_date_obj, end_date_obj
        )
        
        # Create filename
        filename = f"ProfitLoss_{start_date_obj.strftime('%Y-%m-%d')}_to_{end_date_obj.strftime('%Y-%m-%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting profit loss PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to export PDF")

@accounting_router.get("/reports/profit-loss/excel")
async def export_profit_loss_excel(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Profit & Loss statement as Excel"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        # Get report data
        report_data = await AccountingService.get_profit_loss(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate Excel
        excel_buffer = ReportExportService.export_profit_loss_excel(
            report_data, org_name, start_date_obj, end_date_obj
        )
        
        # Create filename
        filename = f"ProfitLoss_{start_date_obj.strftime('%Y-%m-%d')}_to_{end_date_obj.strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting profit loss Excel: {e}")
        raise HTTPException(status_code=500, detail="Failed to export Excel")

@accounting_router.get("/reports/balance-sheet/pdf")
async def export_balance_sheet_pdf(
    property_id: Optional[str] = Query(None),
    as_of_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Balance Sheet as PDF"""
    try:
        as_of_date_obj = date.fromisoformat(as_of_date)
        
        # Get report data
        report_data = await AccountingService.get_balance_sheet(
            db,
            UUID(org_id),
            as_of_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate PDF
        pdf_buffer = ReportExportService.export_balance_sheet_pdf(
            report_data, org_name, as_of_date_obj
        )
        
        # Create filename
        filename = f"BalanceSheet_{as_of_date_obj.strftime('%Y-%m-%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting balance sheet PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to export PDF")

@accounting_router.get("/reports/balance-sheet/excel")
async def export_balance_sheet_excel(
    property_id: Optional[str] = Query(None),
    as_of_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Balance Sheet as Excel"""
    try:
        as_of_date_obj = date.fromisoformat(as_of_date)
        
        # Get report data
        report_data = await AccountingService.get_balance_sheet(
            db,
            UUID(org_id),
            as_of_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate Excel
        excel_buffer = ReportExportService.export_balance_sheet_excel(
            report_data, org_name, as_of_date_obj
        )
        
        # Create filename
        filename = f"BalanceSheet_{as_of_date_obj.strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting balance sheet Excel: {e}")
        raise HTTPException(status_code=500, detail="Failed to export Excel")

@accounting_router.get("/reports/cash-flow/pdf")
async def export_cash_flow_pdf(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Cash Flow Statement as PDF"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        # Get report data
        report_data = await AccountingService.get_cash_flow(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate PDF
        pdf_buffer = ReportExportService.export_cash_flow_pdf(
            report_data, org_name, start_date_obj, end_date_obj
        )
        
        # Create filename
        filename = f"CashFlow_{start_date_obj.strftime('%Y-%m-%d')}_to_{end_date_obj.strftime('%Y-%m-%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting cash flow PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to export PDF")

@accounting_router.get("/reports/cash-flow/excel")
async def export_cash_flow_excel(
    property_id: Optional[str] = Query(None),
    start_date: str = Query(...),
    end_date: str = Query(...),
    org_id: str = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export Cash Flow Statement as Excel"""
    try:
        start_date_obj = date.fromisoformat(start_date)
        end_date_obj = date.fromisoformat(end_date)
        
        # Get report data
        report_data = await AccountingService.get_cash_flow(
            db,
            UUID(org_id),
            start_date_obj,
            end_date_obj,
            UUID(property_id) if property_id else None
        )
        
        # Get organization name
        org_name = getattr(current_user.organization, 'name', None) if hasattr(current_user, 'organization') else "RentalAi"
        
        # Generate Excel
        excel_buffer = ReportExportService.export_cash_flow_excel(
            report_data, org_name, start_date_obj, end_date_obj
        )
        
        # Create filename
        filename = f"CashFlow_{start_date_obj.strftime('%Y-%m-%d')}_to_{end_date_obj.strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format")
    except Exception as e:
        logger.error(f"Error exporting cash flow Excel: {e}")
        raise HTTPException(status_code=500, detail="Failed to export Excel")
