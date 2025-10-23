'use client';

import { useState } from 'react';
import { accountingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export default function AccountingReportsPage() {
  const [reportType, setReportType] = useState<'profit-loss' | 'balance-sheet'>('profit-loss');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-10-23');

  const generateReport = async () => {
    setLoading(true);
    try {
      let response;
      if (reportType === 'profit-loss') {
        response = await accountingApi.getProfitLoss(startDate, endDate);
      } else {
        response = await accountingApi.getBalanceSheet(endDate);
      }
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Financial Reports</h1>

      {/* Report Type Selector */}
      <div className="flex gap-4">
        <Button
          onClick={() => setReportType('profit-loss')}
          variant={reportType === 'profit-loss' ? 'default' : 'outline'}
        >
          Profit & Loss
        </Button>
        <Button
          onClick={() => setReportType('balance-sheet')}
          variant={reportType === 'balance-sheet' ? 'default' : 'outline'}
        >
          Balance Sheet
        </Button>
      </div>

      {/* Date Range */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {/* Report Display */}
      {reportData && reportType === 'profit-loss' && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-2xl font-bold mb-4">Profit & Loss Statement</h2>
          <p className="text-gray-600 mb-6">
            {reportData.start_date} to {reportData.end_date}
          </p>

          {/* Income */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-green-700">INCOME</h3>
            {reportData.income.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                <span>{item.account_name}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 px-4 border-t-2 font-bold">
              <span>Total Income</span>
              <span className="text-green-700">${reportData.income.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-red-700">EXPENSES</h3>
            {reportData.expenses.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                <span>{item.account_name}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 px-4 border-t-2 font-bold">
              <span>Total Expenses</span>
              <span className="text-red-700">${reportData.expenses.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className={`flex justify-between py-4 px-4 border-t-4 text-xl font-bold ${
            reportData.net_income >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
          }`}>
            <span>NET INCOME</span>
            <span>${reportData.net_income.toFixed(2)}</span>
          </div>
        </div>
      )}

      {reportData && reportType === 'balance-sheet' && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-2xl font-bold mb-4">Balance Sheet</h2>
          <p className="text-gray-600 mb-6">As of {reportData.as_of_date}</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Assets */}
            <div>
              <h3 className="text-lg font-semibold mb-3">ASSETS</h3>
              {reportData.assets.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                  <span>{item.account_name}</span>
                  <span className="font-medium">${item.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 px-4 border-t-2 font-bold">
                <span>Total Assets</span>
                <span>${reportData.assets.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h3 className="text-lg font-semibold mb-3">LIABILITIES</h3>
              {reportData.liabilities.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                  <span>{item.account_name}</span>
                  <span className="font-medium">${item.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 px-4 border-t font-bold">
                <span>Total Liabilities</span>
                <span>${reportData.liabilities.total.toFixed(2)}</span>
              </div>

              <h3 className="text-lg font-semibold mb-3 mt-6">EQUITY</h3>
              {reportData.equity.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                  <span>{item.account_name}</span>
                  <span className="font-medium">${item.balance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 px-4 border-t font-bold">
                <span>Total Equity</span>
                <span>${reportData.equity.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 px-4 border-t-4 font-bold text-lg mt-4">
                <span>Total Liabilities & Equity</span>
                <span>${reportData.total_liabilities_equity.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}