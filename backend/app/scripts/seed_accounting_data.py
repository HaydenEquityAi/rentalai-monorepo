"""
Seed Accounting Data Script
Populates sample accounting data for testing and development
"""
import asyncio
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.core.database import get_db
from app.services.accounting_service import AccountingService
from app.models.accounting import (
    Account, Transaction, Budget, Vendor, Invoice, InvoiceLineItem,
    AccountType, TransactionType
)

# Test organization and user IDs
TEST_ORG_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()

# Chart of Accounts data
CHART_OF_ACCOUNTS = [
    # ASSETS
    {"account_number": "1000", "account_name": "Cash", "account_type": AccountType.ASSET},
    {"account_number": "1100", "account_name": "Accounts Receivable", "account_type": AccountType.ASSET},
    {"account_number": "1200", "account_name": "Security Deposits Held", "account_type": AccountType.ASSET},
    {"account_number": "1300", "account_name": "Prepaid Insurance", "account_type": AccountType.ASSET},
    {"account_number": "1400", "account_name": "Prepaid Property Tax", "account_type": AccountType.ASSET},
    
    # LIABILITIES
    {"account_number": "2000", "account_name": "Accounts Payable", "account_type": AccountType.LIABILITY},
    {"account_number": "2100", "account_name": "Security Deposits Liability", "account_type": AccountType.LIABILITY},
    {"account_number": "2200", "account_name": "Mortgage Payable", "account_type": AccountType.LIABILITY},
    {"account_number": "2300", "account_name": "Accrued Expenses", "account_type": AccountType.LIABILITY},
    
    # EQUITY
    {"account_number": "3000", "account_name": "Owner's Equity", "account_type": AccountType.EQUITY},
    {"account_number": "3100", "account_name": "Retained Earnings", "account_type": AccountType.EQUITY},
    
    # REVENUE
    {"account_number": "4000", "account_name": "Rental Income", "account_type": AccountType.REVENUE},
    {"account_number": "4100", "account_name": "Late Fees", "account_type": AccountType.REVENUE},
    {"account_number": "4200", "account_name": "Application Fees", "account_type": AccountType.REVENUE},
    {"account_number": "4300", "account_name": "Pet Rent", "account_type": AccountType.REVENUE},
    {"account_number": "4400", "account_name": "Parking Fees", "account_type": AccountType.REVENUE},
    
    # EXPENSES
    {"account_number": "5000", "account_name": "Repairs & Maintenance", "account_type": AccountType.EXPENSE},
    {"account_number": "5100", "account_name": "Property Management Fees", "account_type": AccountType.EXPENSE},
    {"account_number": "5200", "account_name": "Insurance", "account_type": AccountType.EXPENSE},
    {"account_number": "5300", "account_name": "Property Tax", "account_type": AccountType.EXPENSE},
    {"account_number": "5400", "account_name": "Utilities", "account_type": AccountType.EXPENSE},
    {"account_number": "5500", "account_name": "HOA Fees", "account_type": AccountType.EXPENSE},
    {"account_number": "5600", "account_name": "Landscaping", "account_type": AccountType.EXPENSE},
    {"account_number": "5700", "account_name": "HVAC Maintenance", "account_type": AccountType.EXPENSE},
]

# Vendor data
VENDORS_DATA = [
    {
        "vendor_name": "ABC Plumbing Services",
        "contact_person": "John Smith",
        "email": "john@abcplumbing.com",
        "phone": "(555) 123-4567",
        "address": "123 Main St, City, ST 12345",
        "tax_id": "12-3456789",
        "payment_terms": "Net 30",
    },
    {
        "vendor_name": "Smith HVAC Services",
        "contact_person": "Mike Johnson",
        "email": "mike@smithhvac.com",
        "phone": "(555) 234-5678",
        "address": "456 Oak Ave, City, ST 12345",
        "tax_id": "23-4567890",
        "payment_terms": "Net 15",
    },
    {
        "vendor_name": "Green Lawn Care",
        "contact_person": "Sarah Davis",
        "email": "sarah@greenlawn.com",
        "phone": "(555) 345-6789",
        "address": "789 Pine St, City, ST 12345",
        "tax_id": "34-5678901",
        "payment_terms": "Net 30",
    },
    {
        "vendor_name": "Metro Insurance Co",
        "contact_person": "Robert Wilson",
        "email": "robert@metroinsurance.com",
        "phone": "(555) 456-7890",
        "address": "321 Elm St, City, ST 12345",
        "tax_id": "45-6789012",
        "payment_terms": "Due on Receipt",
    },
    {
        "vendor_name": "City Property Tax Office",
        "contact_person": "City Clerk",
        "email": "taxes@city.gov",
        "phone": "(555) 567-8901",
        "address": "654 Government Blvd, City, ST 12345",
        "tax_id": "56-7890123",
        "payment_terms": "Due on Receipt",
    },
]

# Transaction templates
TRANSACTION_TEMPLATES = [
    # Revenue transactions
    {"description": "Monthly rent payment - Unit 101", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (1200, 2500)},
    {"description": "Monthly rent payment - Unit 102", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (1200, 2500)},
    {"description": "Late fee - Unit 101", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (25, 100)},
    {"description": "Application fee - New tenant", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (25, 75)},
    {"description": "Pet rent - Unit 103", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (25, 50)},
    {"description": "Parking fee - Unit 104", "account_type": AccountType.REVENUE, "transaction_type": TransactionType.CREDIT, "amount_range": (50, 150)},
    
    # Expense transactions
    {"description": "Plumbing repair - Unit 101", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (150, 800)},
    {"description": "HVAC maintenance - Building A", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (200, 600)},
    {"description": "Landscaping service", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (100, 400)},
    {"description": "Property insurance premium", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (500, 2000)},
    {"description": "Property tax payment", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (1000, 5000)},
    {"description": "Utility bill - Water", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (200, 800)},
    {"description": "HOA monthly fee", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (100, 300)},
    {"description": "Property management fee", "account_type": AccountType.EXPENSE, "transaction_type": TransactionType.DEBIT, "amount_range": (200, 1000)},
]

# Budget amounts (monthly)
BUDGET_AMOUNTS = {
    "Repairs & Maintenance": Decimal("500.00"),
    "Property Management Fees": Decimal("800.00"),
    "Insurance": Decimal("300.00"),
    "Property Tax": Decimal("2000.00"),
    "Utilities": Decimal("400.00"),
    "HOA Fees": Decimal("200.00"),
    "Landscaping": Decimal("150.00"),
    "HVAC Maintenance": Decimal("200.00"),
}

# Invoice line item templates
INVOICE_LINE_ITEMS = [
    {"description": "Emergency plumbing repair - Unit 101", "unit_price": Decimal("350.00"), "quantity": Decimal("1.00")},
    {"description": "HVAC system maintenance", "unit_price": Decimal("450.00"), "quantity": Decimal("1.00")},
    {"description": "Monthly landscaping service", "unit_price": Decimal("200.00"), "quantity": Decimal("1.00")},
    {"description": "Property insurance premium", "unit_price": Decimal("1200.00"), "quantity": Decimal("1.00")},
    {"description": "Quarterly property tax", "unit_price": Decimal("3000.00"), "quantity": Decimal("1.00")},
    {"description": "Water heater replacement", "unit_price": Decimal("800.00"), "quantity": Decimal("1.00")},
    {"description": "AC unit repair", "unit_price": Decimal("275.00"), "quantity": Decimal("1.00")},
    {"description": "Gutter cleaning", "unit_price": Decimal("150.00"), "quantity": Decimal("1.00")},
]


async def create_chart_of_accounts(db: AsyncSession) -> dict:
    """Create chart of accounts and return account mapping"""
    print("Creating Chart of Accounts...")
    accounts = {}
    
    for account_data in CHART_OF_ACCOUNTS:
        account = await AccountingService.create_account(db, TEST_ORG_ID, account_data)
        accounts[account.account_name] = account
        print(f"  Created account: {account.account_number} - {account.account_name}")
    
    return accounts


async def create_vendors(db: AsyncSession) -> list:
    """Create vendors and return list of vendor objects"""
    print("Creating Vendors...")
    vendors = []
    
    for vendor_data in VENDORS_DATA:
        vendor = await AccountingService.create_vendor(db, TEST_ORG_ID, vendor_data)
        vendors.append(vendor)
        print(f"  Created vendor: {vendor.vendor_name}")
    
    return vendors


async def create_transactions(db: AsyncSession, accounts: dict) -> list:
    """Create sample transactions"""
    print("Creating Transactions...")
    transactions = []
    
    # Get revenue and expense accounts
    revenue_accounts = [acc for acc in accounts.values() if acc.account_type == AccountType.REVENUE]
    expense_accounts = [acc for acc in accounts.values() if acc.account_type == AccountType.EXPENSE]
    
    # Create transactions for the last 90 days
    end_date = date.today()
    start_date = end_date - timedelta(days=90)
    
    for i in range(50):
        # Random date within the last 90 days
        days_ago = random.randint(0, 90)
        transaction_date = end_date - timedelta(days=days_ago)
        
        # Pick a random template
        template = random.choice(TRANSACTION_TEMPLATES)
        
        # Find appropriate account
        if template["account_type"] == AccountType.REVENUE:
            account = random.choice(revenue_accounts)
        else:
            account = random.choice(expense_accounts)
        
        # Generate random amount
        min_amount, max_amount = template["amount_range"]
        amount = Decimal(str(random.randint(min_amount, max_amount)))
        
        transaction_data = {
            "account_id": str(account.id),
            "transaction_date": transaction_date,
            "transaction_type": template["transaction_type"],
            "amount": str(amount),
            "description": template["description"],
            "reference_number": f"TXN-{i+1:04d}",
        }
        
        transaction = await AccountingService.create_transaction(
            db, TEST_ORG_ID, transaction_data, TEST_USER_ID
        )
        transactions.append(transaction)
        
        if (i + 1) % 10 == 0:
            print(f"  Created {i + 1} transactions...")
    
    print(f"  Created {len(transactions)} total transactions")
    return transactions


async def create_budgets(db: AsyncSession, accounts: dict) -> list:
    """Create monthly budgets for current year"""
    print("Creating Budgets...")
    budgets = []
    
    current_year = date.today().year
    expense_accounts = [acc for acc in accounts.values() if acc.account_type == AccountType.EXPENSE]
    
    for month in range(1, 13):
        for account in expense_accounts:
            # Get budget amount for this account type
            budget_amount = BUDGET_AMOUNTS.get(account.account_name, Decimal("100.00"))
            
            # Add some variation (±20%)
            variation = random.uniform(0.8, 1.2)
            adjusted_amount = budget_amount * Decimal(str(variation))
            
            budget_data = {
                "account_id": str(account.id),
                "year": current_year,
                "month": month,
                "budgeted_amount": str(adjusted_amount),
                "notes": f"Monthly budget for {account.account_name}",
            }
            
            budget = await AccountingService.create_budget(db, TEST_ORG_ID, budget_data)
            budgets.append(budget)
    
    print(f"  Created {len(budgets)} monthly budgets")
    return budgets


async def create_invoices(db: AsyncSession, vendors: list, accounts: dict) -> list:
    """Create sample invoices"""
    print("Creating Invoices...")
    invoices = []
    
    # Get expense accounts for line items
    expense_accounts = [acc for acc in accounts.values() if acc.account_type == AccountType.EXPENSE]
    
    for i in range(10):
        vendor = random.choice(vendors)
        invoice_date = date.today() - timedelta(days=random.randint(1, 60))
        due_date = invoice_date + timedelta(days=30)
        
        # Create line items
        line_items = []
        num_items = random.randint(1, 3)
        subtotal = Decimal("0")
        
        for j in range(num_items):
            line_template = random.choice(INVOICE_LINE_ITEMS)
            account = random.choice(expense_accounts)
            
            line_item = {
                "account_id": str(account.id),
                "description": line_template["description"],
                "quantity": str(line_template["quantity"]),
                "unit_price": str(line_template["unit_price"]),
                "total_amount": str(line_template["unit_price"] * line_template["quantity"]),
            }
            line_items.append(line_item)
            subtotal += line_template["unit_price"] * line_template["quantity"]
        
        # Calculate tax and total
        tax_rate = Decimal("0.08")  # 8% tax
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + tax_amount
        
        # Determine if invoice is paid
        is_paid = i < 5  # First 5 invoices are paid
        amount_paid = total_amount if is_paid else Decimal("0")
        status = "paid" if is_paid else "unpaid"
        
        invoice_data = {
            "vendor_id": str(vendor.id),
            "invoice_number": f"INV-{i+1:04d}",
            "invoice_date": invoice_date,
            "due_date": due_date,
            "subtotal": str(subtotal),
            "tax_amount": str(tax_amount),
            "total_amount": str(total_amount),
            "amount_paid": str(amount_paid),
            "status": status,
            "notes": f"Invoice from {vendor.vendor_name}",
            "line_items": line_items,
        }
        
        invoice = await AccountingService.create_invoice(db, TEST_ORG_ID, invoice_data)
        invoices.append(invoice)
        print(f"  Created invoice: {invoice.invoice_number} - ${total_amount} ({status})")
    
    print(f"  Created {len(invoices)} total invoices")
    return invoices


async def main():
    """Main function to seed accounting data"""
    print("Starting Accounting Data Seeding...")
    print(f"Test Org ID: {TEST_ORG_ID}")
    print(f"Test User ID: {TEST_USER_ID}")
    print("-" * 50)
    
    try:
        # Get database session
        async for db in get_db():
            # Create chart of accounts
            accounts = await create_chart_of_accounts(db)
            print()
            
            # Create vendors
            vendors = await create_vendors(db)
            print()
            
            # Create transactions
            transactions = await create_transactions(db, accounts)
            print()
            
            # Create budgets
            budgets = await create_budgets(db, accounts)
            print()
            
            # Create invoices
            invoices = await create_invoices(db, vendors, accounts)
            print()
            
            print("-" * 50)
            print("Accounting Data Seeding Complete!")
            print(f"Created:")
            print(f"  - {len(accounts)} accounts")
            print(f"  - {len(vendors)} vendors")
            print(f"  - {len(transactions)} transactions")
            print(f"  - {len(budgets)} budgets")
            print(f"  - {len(invoices)} invoices")
            print()
            print("You can now test the accounting system with this sample data.")
            
            break  # Exit the async generator
    
    except Exception as e:
        print(f"Error seeding accounting data: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
