/**
 * Accounting TypeScript Interfaces
 * Type definitions for accounting models matching backend structure
 */

// Enums
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type TransactionType = 'debit' | 'credit';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// Base interfaces
export interface BaseEntity {
  id: string;
  org_id: string;
  created_at: string;
  updated_at?: string;
}

// Account interface
export interface Account extends BaseEntity {
  account_number: string;
  account_name: string;
  account_type: AccountType;
  parent_account_id?: string;
  description?: string;
  is_active: boolean;
  balance: string; // Decimal as string - current account balance
}

// Transaction interface
export interface Transaction extends BaseEntity {
  property_id?: string;
  account_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  amount: string; // Decimal as string
  reference_number?: string;
  description?: string;
  memo?: string;
  tenant_id?: string;
  vendor_id?: string;
  invoice_id?: string;
}

// Budget interface
export interface Budget extends BaseEntity {
  property_id?: string;
  account_id: string;
  year: number;
  month: number;
  budgeted_amount: string; // Decimal as string
  notes?: string;
}

// Vendor interface
export interface Vendor extends BaseEntity {
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  is_active: boolean;
}

// Invoice interface
export interface Invoice extends BaseEntity {
  property_id?: string;
  vendor_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: string; // Decimal as string
  tax_amount: string; // Decimal as string
  total_amount: string; // Decimal as string
  amount_paid: string; // Decimal as string
  status: InvoiceStatus;
  notes?: string;
  line_items?: InvoiceLineItem[]; // Optional array of line items
}

// Invoice Line Item interface
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: string; // Decimal as string
  unit_price: string; // Decimal as string
  amount: string; // Decimal as string
}

// Bank Account interface
export interface BankAccount extends BaseEntity {
  account_id: string;
  bank_name: string;
  account_number: string;
  routing_number?: string;
  account_type?: string;
  current_balance: string; // Decimal as string
  is_active: boolean;
}

// Extended interfaces with relationships
export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

export interface TransactionWithAccount extends Transaction {
  account?: Account;
}

export interface BudgetWithAccount extends Budget {
  account?: Account;
}

// API Response interfaces
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
}

// Request interfaces for creating/updating entities
export interface CreateAccountRequest {
  account_number: string;
  account_name: string;
  account_type: AccountType;
  parent_account_id?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateAccountRequest {
  account_number?: string;
  account_name?: string;
  account_type?: AccountType;
  parent_account_id?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateTransactionRequest {
  property_id?: string;
  account_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  amount: string;
  reference_number?: string;
  description?: string;
  memo?: string;
  tenant_id?: string;
  vendor_id?: string;
  invoice_id?: string;
}

export interface UpdateTransactionRequest {
  property_id?: string;
  account_id?: string;
  transaction_date?: string;
  transaction_type?: TransactionType;
  amount?: string;
  reference_number?: string;
  description?: string;
  memo?: string;
  tenant_id?: string;
  vendor_id?: string;
  invoice_id?: string;
}

export interface CreateBudgetRequest {
  property_id?: string;
  account_id: string;
  year: number;
  month: number;
  budgeted_amount: string;
  notes?: string;
}

export interface UpdateBudgetRequest {
  property_id?: string;
  account_id?: string;
  year?: number;
  month?: number;
  budgeted_amount?: string;
  notes?: string;
}

export interface CreateVendorRequest {
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  is_active?: boolean;
}

export interface UpdateVendorRequest {
  vendor_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  is_active?: boolean;
}

export interface CreateInvoiceRequest {
  property_id?: string;
  vendor_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount?: string;
  total_amount: string;
  amount_paid?: string;
  status?: InvoiceStatus;
  notes?: string;
  line_items: CreateInvoiceLineItemRequest[];
}

export interface UpdateInvoiceRequest {
  property_id?: string;
  vendor_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: string;
  tax_amount?: string;
  total_amount?: string;
  amount_paid?: string;
  status?: InvoiceStatus;
  notes?: string;
  line_items?: CreateInvoiceLineItemRequest[];
}

export interface CreateInvoiceLineItemRequest {
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface CreateBankAccountRequest {
  account_id: string;
  bank_name: string;
  account_number: string;
  routing_number?: string;
  account_type?: string;
  current_balance?: string;
  is_active?: boolean;
}

export interface UpdateBankAccountRequest {
  account_id?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  account_type?: string;
  current_balance?: string;
  is_active?: boolean;
}

export interface UpdateBankAccountBalanceRequest {
  new_balance: string;
}

export interface MarkInvoicePaidRequest {
  payment_date: string;
  amount: string;
}

// Filter interfaces for API queries
export interface AccountFilters {
  account_type?: AccountType;
  is_active?: boolean;
}

export interface TransactionFilters {
  account_id?: string;
  property_id?: string;
  limit?: number;
  offset?: number;
}

export interface BudgetFilters {
  property_id?: string;
  year?: number;
  month?: number;
}

export interface VendorFilters {
  is_active?: boolean;
}

export interface InvoiceFilters {
  vendor_id?: string;
  property_id?: string;
  status?: InvoiceStatus;
}

export interface BankAccountFilters {
  is_active?: boolean;
}

// Report interfaces
export interface ProfitLossReport {
  period: string;
  property_id?: string;
  revenue: string;
  expenses: string;
  net_income: string;
  gross_profit_margin: string;
}

export interface BalanceSheetReport {
  as_of_date: string;
  property_id?: string;
  assets: string;
  liabilities: string;
  equity: string;
  total_liabilities_and_equity: string;
  balance_check: string;
}

export interface CashFlowReport {
  period: string;
  property_id?: string;
  operating_cash_flow: string;
  investing_cash_flow: string;
  financing_cash_flow: string;
  net_cash_flow: string;
}

export interface BudgetVsActualReport {
  period: string;
  property_id?: string;
  total_budgeted: string;
  total_actual: string;
  total_variance: string;
  budgets: BudgetVsActualItem[];
}

export interface BudgetVsActualItem {
  account_id: string;
  account_name: string;
  budgeted_amount: string;
  actual_amount: string;
  variance: string;
  variance_percentage: string;
}

export interface Vendor1099Data {
  vendor_id: string;
  vendor_name: string;
  tax_id?: string;
  year: number;
  total_invoices: number;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  invoices: Vendor1099Invoice[];
}

export interface Vendor1099Invoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  amount_paid: string;
  status: string;
}

// Report request interfaces
export interface ProfitLossRequest {
  property_id?: string;
  start_date: string;
  end_date: string;
}

export interface BalanceSheetRequest {
  property_id?: string;
  as_of_date: string;
}

export interface CashFlowRequest {
  property_id?: string;
  start_date: string;
  end_date: string;
}

export interface BudgetVsActualRequest {
  property_id?: string;
  year: number;
  month: number;
}

export interface Vendor1099Request {
  vendor_id: string;
  year: number;
}