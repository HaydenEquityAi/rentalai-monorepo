"""
Accounting Service
Business logic for accounting operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date
from decimal import Decimal
import logging

from app.models.accounting import (
    Account, Transaction, AccountType, TransactionType,
    Budget, Vendor, Invoice, InvoiceLineItem, BankAccount
)

logger = logging.getLogger(__name__)


class AccountingService:
    """Service class for accounting operations"""

    @staticmethod
    async def get_accounts(
        db: AsyncSession,
        org_id: UUID,
        account_type: Optional[AccountType] = None,
        is_active: bool = True,
    ) -> List[Account]:
        """Get all accounts for an organization"""
        query = select(Account).where(
            and_(
                Account.org_id == org_id,
                Account.deleted_at.is_(None),
            )
        )
        if account_type:
            query = query.where(Account.account_type == account_type)
        if is_active is not None:
            query = query.where(Account.is_active == is_active)
        query = query.order_by(Account.account_number)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_account(db: AsyncSession, account_id: UUID, org_id: UUID) -> Optional[Account]:
        """Get a single account by ID"""
        query = select(Account).where(
            and_(
                Account.id == account_id,
                Account.org_id == org_id,
                Account.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_account(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> Account:
        """Create a new account"""
        account = Account(
            org_id=org_id,
            account_number=data["account_number"],
            account_name=data["account_name"],
            account_type=data["account_type"],
            parent_account_id=data.get("parent_account_id"),
            description=data.get("description"),
            is_active=data.get("is_active", True),
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def delete_account(db: AsyncSession, account_id: UUID, org_id: UUID) -> bool:
        """Soft delete an account"""
        from datetime import datetime
        account = await AccountingService.get_account(db, account_id, org_id)
        if not account:
            return False
        account.deleted_at = datetime.utcnow()
        account.is_active = False
        await db.commit()
        return True

    @staticmethod
    async def get_transactions(
        db: AsyncSession,
        org_id: UUID,
        account_id: Optional[UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Transaction]:
        """Get transactions with filters"""
        query = select(Transaction).where(
            and_(
                Transaction.org_id == org_id,
                Transaction.deleted_at.is_(None),
            )
        )
        if account_id:
            query = query.where(Transaction.account_id == account_id)
        query = query.order_by(Transaction.transaction_date.desc()).limit(limit).offset(offset)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_transaction(
        db: AsyncSession, org_id: UUID, data: Dict[str, Any], created_by: UUID
    ) -> Transaction:
        """Create a new transaction"""
        transaction = Transaction(
            org_id=org_id,
            property_id=data.get("property_id"),
            account_id=data["account_id"],
            transaction_date=data["transaction_date"],
            transaction_type=data["transaction_type"],
            amount=Decimal(str(data["amount"])),
            reference_number=data.get("reference_number"),
            description=data.get("description"),
            memo=data.get("memo"),
            created_by=created_by,
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction

    # BUDGET OPERATIONS
    @staticmethod
    async def get_budgets(
        db: AsyncSession,
        org_id: UUID,
        property_id: Optional[UUID] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> List[Budget]:
        """Get budgets with optional filters"""
        query = select(Budget).where(
            and_(
                Budget.org_id == org_id,
                Budget.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(Budget.property_id == property_id)
        if year:
            query = query.where(Budget.year == year)
        if month:
            query = query.where(Budget.month == month)
        query = query.order_by(Budget.year.desc(), Budget.month.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_budget(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> Budget:
        """Create a new budget"""
        budget = Budget(
            org_id=org_id,
            property_id=data.get("property_id"),
            account_id=data["account_id"],
            year=data["year"],
            month=data["month"],
            budgeted_amount=Decimal(str(data["budgeted_amount"])),
            notes=data.get("notes"),
        )
        db.add(budget)
        await db.commit()
        await db.refresh(budget)
        return budget

    @staticmethod
    async def update_budget(db: AsyncSession, budget_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[Budget]:
        """Update an existing budget"""
        budget = await db.execute(
            select(Budget).where(
                and_(
                    Budget.id == budget_id,
                    Budget.org_id == org_id,
                    Budget.deleted_at.is_(None),
                )
            )
        )
        budget = budget.scalar_one_or_none()
        if not budget:
            return None
        
        for key, value in data.items():
            if hasattr(budget, key):
                if key == "budgeted_amount":
                    setattr(budget, key, Decimal(str(value)))
                else:
                    setattr(budget, key, value)
        
        await db.commit()
        await db.refresh(budget)
        return budget

    @staticmethod
    async def get_budget_vs_actual(
        db: AsyncSession,
        org_id: UUID,
        property_id: Optional[UUID] = None,
        year: int = None,
        month: int = None,
    ) -> Dict[str, Any]:
        """Get budget vs actual comparison"""
        # Get budgets for the period
        budgets_query = select(Budget).where(
            and_(
                Budget.org_id == org_id,
                Budget.deleted_at.is_(None),
            )
        )
        if property_id:
            budgets_query = budgets_query.where(Budget.property_id == property_id)
        if year:
            budgets_query = budgets_query.where(Budget.year == year)
        if month:
            budgets_query = budgets_query.where(Budget.month == month)
        
        budgets_result = await db.execute(budgets_query)
        budgets = budgets_result.scalars().all()
        
        # Get actual transactions for the same accounts and period
        budget_data = []
        total_budgeted = Decimal('0')
        total_actual = Decimal('0')
        
        for budget in budgets:
            # Get actual transactions for this account and period
            start_date = date(budget.year, budget.month, 1)
            if budget.month == 12:
                end_date = date(budget.year + 1, 1, 1)
            else:
                end_date = date(budget.year, budget.month + 1, 1)
            
            actual_query = select(Transaction).where(
                and_(
                    Transaction.org_id == org_id,
                    Transaction.account_id == budget.account_id,
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date < end_date,
                    Transaction.deleted_at.is_(None),
                )
            )
            actual_result = await db.execute(actual_query)
            actual_transactions = actual_result.scalars().all()
            
            actual_amount = sum(t.amount for t in actual_transactions)
            variance = budget.budgeted_amount - actual_amount
            
            budget_data.append({
                "account_id": str(budget.account_id),
                "account_name": budget.account.account_name if budget.account else "Unknown",
                "budgeted_amount": str(budget.budgeted_amount),
                "actual_amount": str(actual_amount),
                "variance": str(variance),
                "variance_percentage": str((variance / budget.budgeted_amount * 100) if budget.budgeted_amount != 0 else 0),
            })
            
            total_budgeted += budget.budgeted_amount
            total_actual += actual_amount
        
        return {
            "period": f"{year}-{month:02d}" if year and month else "All",
            "property_id": str(property_id) if property_id else None,
            "total_budgeted": str(total_budgeted),
            "total_actual": str(total_actual),
            "total_variance": str(total_budgeted - total_actual),
            "budgets": budget_data,
        }

    # VENDOR OPERATIONS
    @staticmethod
    async def get_vendors(
        db: AsyncSession,
        org_id: UUID,
        is_active: Optional[bool] = None,
    ) -> List[Vendor]:
        """Get vendors with optional active filter"""
        query = select(Vendor).where(
            and_(
                Vendor.org_id == org_id,
                Vendor.deleted_at.is_(None),
            )
        )
        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)
        query = query.order_by(Vendor.vendor_name)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_vendor(db: AsyncSession, vendor_id: UUID, org_id: UUID) -> Optional[Vendor]:
        """Get a single vendor by ID"""
        query = select(Vendor).where(
            and_(
                Vendor.id == vendor_id,
                Vendor.org_id == org_id,
                Vendor.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_vendor(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> Vendor:
        """Create a new vendor"""
        vendor = Vendor(
            org_id=org_id,
            vendor_name=data["vendor_name"],
            contact_person=data.get("contact_person"),
            email=data.get("email"),
            phone=data.get("phone"),
            address=data.get("address"),
            tax_id=data.get("tax_id"),
            payment_terms=data.get("payment_terms"),
            is_active=data.get("is_active", True),
        )
        db.add(vendor)
        await db.commit()
        await db.refresh(vendor)
        return vendor

    @staticmethod
    async def update_vendor(db: AsyncSession, vendor_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[Vendor]:
        """Update an existing vendor"""
        vendor = await db.execute(
            select(Vendor).where(
                and_(
                    Vendor.id == vendor_id,
                    Vendor.org_id == org_id,
                    Vendor.deleted_at.is_(None),
                )
            )
        )
        vendor = vendor.scalar_one_or_none()
        if not vendor:
            return None
        
        for key, value in data.items():
            if hasattr(vendor, key):
                setattr(vendor, key, value)
        
        await db.commit()
        await db.refresh(vendor)
        return vendor

    @staticmethod
    async def get_vendor_1099_data(db: AsyncSession, vendor_id: UUID, org_id: UUID, year: int) -> Dict[str, Any]:
        """Get vendor 1099 data for a specific year"""
        vendor = await AccountingService.get_vendor(db, vendor_id, org_id)
        if not vendor:
            return {}
        
        # Get all invoices for this vendor in the year
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)
        
        invoices_query = select(Invoice).where(
            and_(
                Invoice.org_id == org_id,
                Invoice.vendor_id == vendor_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date < end_date,
                Invoice.deleted_at.is_(None),
            )
        )
        invoices_result = await db.execute(invoices_query)
        invoices = invoices_result.scalars().all()
        
        total_amount = sum(invoice.total_amount for invoice in invoices)
        paid_amount = sum(invoice.amount_paid for invoice in invoices)
        
        return {
            "vendor_id": str(vendor_id),
            "vendor_name": vendor.vendor_name,
            "tax_id": vendor.tax_id,
            "year": year,
            "total_invoices": len(invoices),
            "total_amount": str(total_amount),
            "paid_amount": str(paid_amount),
            "outstanding_amount": str(total_amount - paid_amount),
            "invoices": [
                {
                    "invoice_id": str(inv.id),
                    "invoice_number": inv.invoice_number,
                    "invoice_date": inv.invoice_date.isoformat(),
                    "total_amount": str(inv.total_amount),
                    "amount_paid": str(inv.amount_paid),
                    "status": inv.status,
                }
                for inv in invoices
            ],
        }

    # INVOICE OPERATIONS
    @staticmethod
    async def get_invoices(
        db: AsyncSession,
        org_id: UUID,
        vendor_id: Optional[UUID] = None,
        property_id: Optional[UUID] = None,
        status: Optional[str] = None,
    ) -> List[Invoice]:
        """Get invoices with optional filters"""
        query = select(Invoice).where(
            and_(
                Invoice.org_id == org_id,
                Invoice.deleted_at.is_(None),
            )
        )
        if vendor_id:
            query = query.where(Invoice.vendor_id == vendor_id)
        if property_id:
            query = query.where(Invoice.property_id == property_id)
        if status:
            query = query.where(Invoice.status == status)
        query = query.order_by(Invoice.invoice_date.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_invoice(db: AsyncSession, invoice_id: UUID, org_id: UUID) -> Optional[Invoice]:
        """Get a single invoice by ID with line items"""
        query = select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.org_id == org_id,
                Invoice.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        invoice = result.scalar_one_or_none()
        
        if invoice:
            # Load line items
            line_items_query = select(InvoiceLineItem).where(
                and_(
                    InvoiceLineItem.invoice_id == invoice_id,
                    InvoiceLineItem.deleted_at.is_(None),
                )
            )
            line_items_result = await db.execute(line_items_query)
            invoice.line_items = line_items_result.scalars().all()
        
        return invoice

    @staticmethod
    async def create_invoice(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> Invoice:
        """Create a new invoice with line items"""
        invoice = Invoice(
            org_id=org_id,
            property_id=data.get("property_id"),
            vendor_id=data.get("vendor_id"),
            tenant_id=data.get("tenant_id"),
            invoice_number=data["invoice_number"],
            invoice_date=data["invoice_date"],
            due_date=data["due_date"],
            subtotal=Decimal(str(data["subtotal"])),
            tax_amount=Decimal(str(data.get("tax_amount", 0))),
            total_amount=Decimal(str(data["total_amount"])),
            amount_paid=Decimal(str(data.get("amount_paid", 0))),
            status=data.get("status", "unpaid"),
            notes=data.get("notes"),
        )
        db.add(invoice)
        await db.flush()  # Flush to get the invoice ID
        
        # Create line items
        line_items_data = data.get("line_items", [])
        for item_data in line_items_data:
            line_item = InvoiceLineItem(
                invoice_id=invoice.id,
                account_id=item_data["account_id"],
                description=item_data["description"],
                quantity=Decimal(str(item_data.get("quantity", 1))),
                unit_price=Decimal(str(item_data["unit_price"])),
                total_amount=Decimal(str(item_data["total_amount"])),
            )
            db.add(line_item)
        
        await db.commit()
        await db.refresh(invoice)
        return invoice

    @staticmethod
    async def update_invoice(db: AsyncSession, invoice_id: UUID, org_id: UUID, data: Dict[str, Any]) -> Optional[Invoice]:
        """Update an existing invoice"""
        invoice = await db.execute(
            select(Invoice).where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.org_id == org_id,
                    Invoice.deleted_at.is_(None),
                )
            )
        )
        invoice = invoice.scalar_one_or_none()
        if not invoice:
            return None
        
        # Update invoice fields
        for key, value in data.items():
            if key == "line_items":
                continue  # Handle line items separately
            if hasattr(invoice, key):
                if key in ["subtotal", "tax_amount", "total_amount", "amount_paid"]:
                    setattr(invoice, key, Decimal(str(value)))
                else:
                    setattr(invoice, key, value)
        
        # Update line items if provided
        if "line_items" in data:
            # Delete existing line items
            await db.execute(
                select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice_id)
            )
            
            # Create new line items
            for item_data in data["line_items"]:
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    account_id=item_data["account_id"],
                    description=item_data["description"],
                    quantity=Decimal(str(item_data.get("quantity", 1))),
                    unit_price=Decimal(str(item_data["unit_price"])),
                    total_amount=Decimal(str(item_data["total_amount"])),
                )
                db.add(line_item)
        
        await db.commit()
        await db.refresh(invoice)
        return invoice

    @staticmethod
    async def mark_invoice_paid(
        db: AsyncSession,
        invoice_id: UUID,
        org_id: UUID,
        payment_date: date,
        amount: Decimal,
    ) -> Optional[Invoice]:
        """Mark an invoice as paid"""
        invoice = await db.execute(
            select(Invoice).where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.org_id == org_id,
                    Invoice.deleted_at.is_(None),
                )
            )
        )
        invoice = invoice.scalar_one_or_none()
        if not invoice:
            return None
        
        invoice.amount_paid = amount
        invoice.status = "paid" if amount >= invoice.total_amount else "partially_paid"
        
        await db.commit()
        await db.refresh(invoice)
        return invoice

    # BANK ACCOUNT OPERATIONS
    @staticmethod
    async def get_bank_accounts(
        db: AsyncSession,
        org_id: UUID,
        is_active: Optional[bool] = None,
    ) -> List[BankAccount]:
        """Get bank accounts with optional active filter"""
        query = select(BankAccount).where(
            and_(
                BankAccount.org_id == org_id,
                BankAccount.deleted_at.is_(None),
            )
        )
        if is_active is not None:
            query = query.where(BankAccount.is_active == is_active)
        query = query.order_by(BankAccount.bank_name)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_bank_account(db: AsyncSession, org_id: UUID, data: Dict[str, Any]) -> BankAccount:
        """Create a new bank account"""
        bank_account = BankAccount(
            org_id=org_id,
            account_id=data["account_id"],
            bank_name=data["bank_name"],
            account_number=data["account_number"],
            routing_number=data.get("routing_number"),
            account_type=data.get("account_type"),
            current_balance=Decimal(str(data.get("current_balance", 0))),
            is_active=data.get("is_active", True),
        )
        db.add(bank_account)
        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    @staticmethod
    async def update_balance(
        db: AsyncSession,
        bank_account_id: UUID,
        org_id: UUID,
        new_balance: Decimal,
    ) -> Optional[BankAccount]:
        """Update bank account balance"""
        bank_account = await db.execute(
            select(BankAccount).where(
                and_(
                    BankAccount.id == bank_account_id,
                    BankAccount.org_id == org_id,
                    BankAccount.deleted_at.is_(None),
                )
            )
        )
        bank_account = bank_account.scalar_one_or_none()
        if not bank_account:
            return None
        
        bank_account.current_balance = new_balance
        await db.commit()
        await db.refresh(bank_account)
        return bank_account

    # FINANCIAL REPORTS
    @staticmethod
    async def get_profit_loss(
        db: AsyncSession,
        org_id: UUID,
        start_date: date,
        end_date: date,
        property_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Generate profit and loss statement"""
        # Get all transactions in the date range
        query = select(Transaction).where(
            and_(
                Transaction.org_id == org_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(Transaction.property_id == property_id)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Group by account type
        revenue = Decimal('0')
        expenses = Decimal('0')
        assets = Decimal('0')
        liabilities = Decimal('0')
        equity = Decimal('0')
        
        for transaction in transactions:
            if transaction.account and transaction.account.account_type:
                amount = transaction.amount
                if transaction.transaction_type == TransactionType.CREDIT:
                    amount = -amount
                
                if transaction.account.account_type == AccountType.REVENUE:
                    revenue += amount
                elif transaction.account.account_type == AccountType.EXPENSE:
                    expenses += amount
                elif transaction.account.account_type == AccountType.ASSET:
                    assets += amount
                elif transaction.account.account_type == AccountType.LIABILITY:
                    liabilities += amount
                elif transaction.account.account_type == AccountType.EQUITY:
                    equity += amount
        
        net_income = revenue - expenses
        
        return {
            "period": f"{start_date} to {end_date}",
            "property_id": str(property_id) if property_id else None,
            "revenue": str(revenue),
            "expenses": str(expenses),
            "net_income": str(net_income),
            "gross_profit_margin": str((net_income / revenue * 100) if revenue != 0 else 0),
        }

    @staticmethod
    async def get_balance_sheet(
        db: AsyncSession,
        org_id: UUID,
        as_of_date: date,
        property_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Generate balance sheet"""
        # Get all transactions up to the as_of_date
        query = select(Transaction).where(
            and_(
                Transaction.org_id == org_id,
                Transaction.transaction_date <= as_of_date,
                Transaction.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(Transaction.property_id == property_id)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate balances by account type
        assets = Decimal('0')
        liabilities = Decimal('0')
        equity = Decimal('0')
        
        for transaction in transactions:
            if transaction.account and transaction.account.account_type:
                amount = transaction.amount
                if transaction.transaction_type == TransactionType.CREDIT:
                    amount = -amount
                
                if transaction.account.account_type == AccountType.ASSET:
                    assets += amount
                elif transaction.account.account_type == AccountType.LIABILITY:
                    liabilities += amount
                elif transaction.account.account_type == AccountType.EQUITY:
                    equity += amount
        
        return {
            "as_of_date": as_of_date.isoformat(),
            "property_id": str(property_id) if property_id else None,
            "assets": str(assets),
            "liabilities": str(liabilities),
            "equity": str(equity),
            "total_liabilities_and_equity": str(liabilities + equity),
            "balance_check": str(assets - (liabilities + equity)),
        }

    @staticmethod
    async def get_cash_flow(
        db: AsyncSession,
        org_id: UUID,
        start_date: date,
        end_date: date,
        property_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Generate cash flow statement"""
        # Get all transactions in the date range
        query = select(Transaction).where(
            and_(
                Transaction.org_id == org_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
                Transaction.deleted_at.is_(None),
            )
        )
        if property_id:
            query = query.where(Transaction.property_id == property_id)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate cash flows by category
        operating_cash_flow = Decimal('0')
        investing_cash_flow = Decimal('0')
        financing_cash_flow = Decimal('0')
        
        for transaction in transactions:
            if transaction.account and transaction.account.account_type:
                amount = transaction.amount
                if transaction.transaction_type == TransactionType.CREDIT:
                    amount = -amount
                
                # Simple categorization - in a real system, you'd have more sophisticated rules
                if transaction.account.account_type in [AccountType.REVENUE, AccountType.EXPENSE]:
                    operating_cash_flow += amount
                elif transaction.account.account_type == AccountType.ASSET:
                    investing_cash_flow += amount
                elif transaction.account.account_type in [AccountType.LIABILITY, AccountType.EQUITY]:
                    financing_cash_flow += amount
        
        net_cash_flow = operating_cash_flow + investing_cash_flow + financing_cash_flow
        
        return {
            "period": f"{start_date} to {end_date}",
            "property_id": str(property_id) if property_id else None,
            "operating_cash_flow": str(operating_cash_flow),
            "investing_cash_flow": str(investing_cash_flow),
            "financing_cash_flow": str(financing_cash_flow),
            "net_cash_flow": str(net_cash_flow),
        }
