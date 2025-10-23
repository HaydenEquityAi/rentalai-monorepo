export enum AccountType {
    ASSET = 'asset',
    LIABILITY = 'liability',
    EQUITY = 'equity',
    REVENUE = 'revenue',
    EXPENSE = 'expense',
  }
  
  export enum TransactionType {
    DEBIT = 'debit',
    CREDIT = 'credit',
  }
  
  export interface Account {
    id: string;
    org_id: string;
    account_number: string;
    account_name: string;
    account_type: AccountType;
    is_active: boolean;
    created_at: string;
  }
  
  export interface Transaction {
    id: string;
    account_id: string;
    transaction_date: string;
    transaction_type: TransactionType;
    amount: number;
    description?: string;
    created_at: string;
  }