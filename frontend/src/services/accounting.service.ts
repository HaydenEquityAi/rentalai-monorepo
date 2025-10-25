/**
 * Accounting Service
 * TypeScript API client for accounting endpoints
 */
import {
  Account,
  Transaction,
  Budget,
  Vendor,
  Invoice,
  BankAccount,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateTransactionRequest,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateVendorRequest,
  UpdateVendorRequest,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  MarkInvoicePaidRequest,
  CreateBankAccountRequest,
  UpdateBankAccountBalanceRequest,
  AccountFilters,
  TransactionFilters,
  BudgetFilters,
  VendorFilters,
  InvoiceFilters,
  BankAccountFilters,
  ProfitLossRequest,
  BalanceSheetRequest,
  CashFlowRequest,
  BudgetVsActualRequest,
  Vendor1099Request,
  ApiResponse,
  ApiListResponse,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  BudgetVsActualReport,
  Vendor1099Data
} from '@/types/accounting';

class AccountingServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'AccountingServiceError';
  }
}

export class AccountingService {
  private baseUrl = 'http://localhost:8004/api/v1';
  private basePath = '/accounting';

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new AccountingServiceError('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      throw new AccountingServiceError(errorMessage, response.status);
    }

    const data = await response.json();
    return data.data;
  }

  private async handleBlobResponse(response: Response): Promise<Blob> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.text();
        errorMessage = errorData || errorMessage;
      } catch {
        // Use default error message
      }
      throw new AccountingServiceError(errorMessage, response.status);
    }

    return response.blob();
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    return searchParams.toString();
  }

  // Account Management
  async getAccounts(filters?: AccountFilters): Promise<Account[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/accounts${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Account[]>(response);
  }

  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/accounts`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Account>(response);
  }

  async getAccount(id: string): Promise<Account> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/accounts/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Account>(response);
  }

  async updateAccount(id: string, data: UpdateAccountRequest): Promise<Account> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/accounts/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Account>(response);
  }

  async deleteAccount(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/accounts/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new AccountingServiceError(`Failed to delete account: ${response.statusText}`, response.status);
    }
  }

  // Transaction Management
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/transactions${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Transaction[]>(response);
  }

  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/transactions`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Transaction>(response);
  }

  // Budget Management
  async getBudgets(filters?: BudgetFilters): Promise<Budget[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/budgets${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Budget[]>(response);
  }

  async createBudget(data: CreateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/budgets`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Budget>(response);
  }

  async updateBudget(id: string, data: UpdateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/budgets/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Budget>(response);
  }

  async getBudgetVsActual(filters: BudgetVsActualRequest): Promise<BudgetVsActualReport> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/budgets/vs-actual${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<BudgetVsActualReport>(response);
  }

  // Vendor Management
  async getVendors(filters?: VendorFilters): Promise<Vendor[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/vendors${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Vendor[]>(response);
  }

  async createVendor(data: CreateVendorRequest): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/vendors`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Vendor>(response);
  }

  async getVendor(id: string): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/vendors/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Vendor>(response);
  }

  async updateVendor(id: string, data: UpdateVendorRequest): Promise<Vendor> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/vendors/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Vendor>(response);
  }

  async getVendor1099(id: string, year: number): Promise<Vendor1099Data> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/vendors/${id}/1099?year=${year}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Vendor1099Data>(response);
  }

  // Invoice Management
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/invoices${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Invoice[]>(response);
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/invoices`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Invoice>(response);
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/invoices/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Invoice>(response);
  }

  async updateInvoice(id: string, data: UpdateInvoiceRequest): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/invoices/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Invoice>(response);
  }

  async markInvoicePaid(id: string, paymentData: MarkInvoicePaidRequest): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/invoices/${id}/pay`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return this.handleResponse<Invoice>(response);
  }

  // Bank Account Management
  async getBankAccounts(filters?: BankAccountFilters): Promise<BankAccount[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/bank-accounts${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<BankAccount[]>(response);
  }

  async createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/bank-accounts`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<BankAccount>(response);
  }

  async updateBankBalance(id: string, newBalance: UpdateBankAccountBalanceRequest): Promise<BankAccount> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/bank-accounts/${id}/balance`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(newBalance),
    });
    return this.handleResponse<BankAccount>(response);
  }

  // Financial Reports
  async getProfitLoss(filters: ProfitLossRequest): Promise<ProfitLossReport> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/profit-loss${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<ProfitLossReport>(response);
  }

  async getBalanceSheet(filters: BalanceSheetRequest): Promise<BalanceSheetReport> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/balance-sheet${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<BalanceSheetReport>(response);
  }

  async getCashFlow(filters: CashFlowRequest): Promise<CashFlowReport> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/cash-flow${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<CashFlowReport>(response);
  }

  // Report Downloads - PDF
  async downloadProfitLossPDF(filters: ProfitLossRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/profit-loss/pdf${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  async downloadBalanceSheetPDF(filters: BalanceSheetRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/balance-sheet/pdf${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  async downloadCashFlowPDF(filters: CashFlowRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/cash-flow/pdf${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  // Report Downloads - Excel
  async downloadProfitLossExcel(filters: ProfitLossRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/profit-loss/excel${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  async downloadBalanceSheetExcel(filters: BalanceSheetRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/balance-sheet/excel${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  async downloadCashFlowExcel(filters: CashFlowRequest): Promise<Blob> {
    const queryString = `?${this.buildQueryString(filters)}`;
    const response = await fetch(`${this.baseUrl}${this.basePath}/reports/cash-flow/excel${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleBlobResponse(response);
  }

  // Utility methods for file downloads
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async downloadAndSaveProfitLossPDF(filters: ProfitLossRequest, filename?: string): Promise<void> {
    const blob = await this.downloadProfitLossPDF(filters);
    const defaultFilename = `profit_loss_${filters.start_date}_to_${filters.end_date}.pdf`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  async downloadAndSaveProfitLossExcel(filters: ProfitLossRequest, filename?: string): Promise<void> {
    const blob = await this.downloadProfitLossExcel(filters);
    const defaultFilename = `profit_loss_${filters.start_date}_to_${filters.end_date}.xlsx`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  async downloadAndSaveBalanceSheetPDF(filters: BalanceSheetRequest, filename?: string): Promise<void> {
    const blob = await this.downloadBalanceSheetPDF(filters);
    const defaultFilename = `balance_sheet_${filters.as_of_date}.pdf`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  async downloadAndSaveBalanceSheetExcel(filters: BalanceSheetRequest, filename?: string): Promise<void> {
    const blob = await this.downloadBalanceSheetExcel(filters);
    const defaultFilename = `balance_sheet_${filters.as_of_date}.xlsx`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  async downloadAndSaveCashFlowPDF(filters: CashFlowRequest, filename?: string): Promise<void> {
    const blob = await this.downloadCashFlowPDF(filters);
    const defaultFilename = `cash_flow_${filters.start_date}_to_${filters.end_date}.pdf`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  async downloadAndSaveCashFlowExcel(filters: CashFlowRequest, filename?: string): Promise<void> {
    const blob = await this.downloadCashFlowExcel(filters);
    const defaultFilename = `cash_flow_${filters.start_date}_to_${filters.end_date}.xlsx`;
    this.downloadBlob(blob, filename || defaultFilename);
  }
}

// Export singleton instance
export const accountingService = new AccountingService();
export default accountingService;
