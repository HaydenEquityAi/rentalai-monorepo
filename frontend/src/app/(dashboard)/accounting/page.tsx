'use client';

import { useState, useEffect } from 'react';
import { accountingApi } from '@/lib/api';
import { Account, Transaction } from '@/types/accounting';

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        accountingApi.getAccounts(),
        accountingApi.getTransactions(),
      ]);
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Failed to load accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Accounting</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Accounts */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Accounts ({accounts.length})</h2>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="font-medium">{account.account_name}</div>
                <div className="text-sm text-gray-600">
                  {account.account_number} • {account.account_type}
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-gray-500 text-center py-4">No accounts yet</p>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions ({transactions.length})</h2>
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="flex justify-between">
                  <span className="font-medium">${transaction.amount}</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    transaction.transaction_type === 'DEBIT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {transaction.transaction_type}
                  </span>
                </div>
                {transaction.description && (
                  <div className="text-sm text-gray-600 mt-1">{transaction.description}</div>
                )}
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-gray-500 text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}