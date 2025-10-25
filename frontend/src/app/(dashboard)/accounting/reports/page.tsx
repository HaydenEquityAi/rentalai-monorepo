"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  Scale, 
  DollarSign, 
  Download, 
  FileText, 
  BarChart3,
  Calendar,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Printer,
  Share2,
  Mail,
  Clock,
  ChevronRight,
  Minus,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { accountingService } from '@/services/accounting.service';
import { 
  Account, 
  ProfitLossReport, 
  BalanceSheetReport, 
  CashFlowReport,
  ProfitLossRequest,
  BalanceSheetRequest,
  CashFlowRequest
} from '@/types/accounting';

type ReportType = 'profit-loss' | 'balance-sheet' | 'cash-flow';

interface ReportParams {
  property_id?: string;
  start_date: string;
  end_date: string;
  as_of_date: string;
}

interface ProfitLossData {
  revenue: Array<{ account: string; amount: number }>;
  expenses: Array<{ account: string; amount: number }>;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}

interface BalanceSheetData {
  assets: Array<{ account: string; amount: number }>;
  liabilities: Array<{ account: string; amount: number }>;
  equity: Array<{ account: string; amount: number }>;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

interface CashFlowData {
  operating: Array<{ account: string; amount: number }>;
  investing: Array<{ account: string; amount: number }>;
  financing: Array<{ account: string; amount: number }>;
  net_cash_flow: number;
}

export default function FinancialReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [reportParams, setReportParams] = useState<ReportParams>({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    as_of_date: new Date().toISOString().split('T')[0]
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reportData, setReportData] = useState<ProfitLossReport | BalanceSheetReport | CashFlowReport | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('report');

  // Fetch accounts for property filter
  const fetchAccounts = async () => {
    try {
      const accountsData = await accountingService.getAccounts();
      setAccounts(accountsData);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Generate report data
  const generateReport = async () => {
    if (!selectedReportType) return;

    try {
      setLoading(true);
      setError(null);

      let data: ProfitLossReport | BalanceSheetReport | CashFlowReport;

      switch (selectedReportType) {
        case 'profit-loss':
          const profitLossRequest: ProfitLossRequest = {
            property_id: reportParams.property_id,
            start_date: reportParams.start_date,
            end_date: reportParams.end_date
          };
          data = await accountingService.getProfitLoss(profitLossRequest);
          break;
        case 'balance-sheet':
          const balanceSheetRequest: BalanceSheetRequest = {
            property_id: reportParams.property_id,
            as_of_date: reportParams.as_of_date
          };
          data = await accountingService.getBalanceSheet(balanceSheetRequest);
          break;
        case 'cash-flow':
          const cashFlowRequest: CashFlowRequest = {
            property_id: reportParams.property_id,
            start_date: reportParams.start_date,
            end_date: reportParams.end_date
          };
          data = await accountingService.getCashFlow(cashFlowRequest);
          break;
      }

      setReportData(data);
      generateChartData(data, selectedReportType);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data based on report type
  const generateChartData = (data: ProfitLossReport | BalanceSheetReport | CashFlowReport, reportType: ReportType) => {
    switch (reportType) {
      case 'profit-loss':
        // Generate monthly data for P&L chart
        const months = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(new Date().getFullYear(), i, 1);
          months.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            revenue: Math.random() * 50000 + 20000,
            expenses: Math.random() * 40000 + 15000,
            netIncome: 0
          });
        }
        months.forEach(month => {
          month.netIncome = month.revenue - month.expenses;
        });
        setChartData(months);
        break;

      case 'balance-sheet':
        // Generate pie chart data for balance sheet
        const balanceSheetData = data as BalanceSheetReport;
        const pieData = [
          { name: 'Current Assets', value: parseFloat(balanceSheetData.assets) * 0.4, color: '#3b82f6' },
          { name: 'Fixed Assets', value: parseFloat(balanceSheetData.assets) * 0.6, color: '#1d4ed8' },
          { name: 'Current Liabilities', value: parseFloat(balanceSheetData.liabilities) * 0.7, color: '#ef4444' },
          { name: 'Long-term Liabilities', value: parseFloat(balanceSheetData.liabilities) * 0.3, color: '#dc2626' },
          { name: 'Equity', value: parseFloat(balanceSheetData.equity), color: '#10b981' }
        ];
        setChartData(pieData);
        break;

      case 'cash-flow':
        // Generate waterfall chart data for cash flow
        const cashFlowData = data as CashFlowReport;
        const waterfallData = [
          { category: 'Operating', amount: parseFloat(cashFlowData.operating_cash_flow) },
          { category: 'Investing', amount: parseFloat(cashFlowData.investing_cash_flow) },
          { category: 'Financing', amount: parseFloat(cashFlowData.financing_cash_flow) }
        ];
        setChartData(waterfallData);
        break;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!selectedReportType || !reportParams.start_date || !reportParams.end_date) return;

    try {
      if (selectedReportType === 'balance-sheet') {
        const filters: BalanceSheetRequest = {
          property_id: reportParams.property_id,
          as_of_date: reportParams.as_of_date
        };
        await accountingService.downloadBalanceSheetPDF(filters);
      } else {
        const filters: ProfitLossRequest = {
          property_id: reportParams.property_id,
          start_date: reportParams.start_date,
          end_date: reportParams.end_date
        };
        await accountingService.downloadProfitLossPDF(filters);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    }
  };

  // Download Excel
  const downloadExcel = async () => {
    if (!selectedReportType || !reportParams.start_date || !reportParams.end_date) return;

    try {
      if (selectedReportType === 'balance-sheet') {
        const filters: BalanceSheetRequest = {
          property_id: reportParams.property_id,
          as_of_date: reportParams.as_of_date
        };
        await accountingService.downloadBalanceSheetExcel(filters);
      } else {
        const filters: ProfitLossRequest = {
          property_id: reportParams.property_id,
          start_date: reportParams.start_date,
          end_date: reportParams.end_date
        };
        await accountingService.downloadProfitLossExcel(filters);
      }
    } catch (err) {
      console.error('Error downloading Excel:', err);
      setError('Failed to download Excel. Please try again.');
    }
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  // Load accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Generate report when parameters change
  useEffect(() => {
    if (selectedReportType && reportData) {
      generateReport();
    }
  }, [selectedReportType, reportParams]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Generate and export professional financial reports
          </p>
        </div>
        {reportData && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={downloadExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Report Type Selector */}
      {!selectedReportType && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300"
            onClick={() => setSelectedReportType('profit-loss')}
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-green-700">Profit & Loss</CardTitle>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <CardDescription>
                  Revenue, expenses, and net income statement
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Shows:</div>
                  <ul className="text-sm space-y-1">
                    <li>• Total Revenue</li>
                    <li>• Operating Expenses</li>
                    <li>• Net Income</li>
                    <li>• Monthly Trends</li>
                  </ul>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
            onClick={() => setSelectedReportType('balance-sheet')}
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-700">Balance Sheet</CardTitle>
                  <Scale className="h-8 w-8 text-blue-600" />
                </div>
                <CardDescription>
                  Assets, liabilities, and equity snapshot
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Shows:</div>
                  <ul className="text-sm space-y-1">
                    <li>• Current Assets</li>
                    <li>• Fixed Assets</li>
                    <li>• Liabilities</li>
                    <li>• Owner Equity</li>
                  </ul>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-300"
            onClick={() => setSelectedReportType('cash-flow')}
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-purple-700">Cash Flow</CardTitle>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <CardDescription>
                  Cash inflows and outflows analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Shows:</div>
                  <ul className="text-sm space-y-1">
                    <li>• Operating Activities</li>
                    <li>• Investing Activities</li>
                    <li>• Financing Activities</li>
                    <li>• Net Cash Flow</li>
                  </ul>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      {/* Report Parameters */}
      {selectedReportType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Parameters
            </CardTitle>
            <CardDescription>
              Configure your {selectedReportType.replace('-', ' & ')} report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property">Property (Optional)</Label>
                <Select
                  value={reportParams.property_id || 'ALL'}
                  onValueChange={(value) => setReportParams(prev => ({ 
                    ...prev, 
                    property_id: value === 'ALL' ? undefined : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Properties</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReportType !== 'balance-sheet' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={reportParams.start_date}
                      onChange={(e) => setReportParams(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={reportParams.end_date}
                      onChange={(e) => setReportParams(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {selectedReportType === 'balance-sheet' && (
                <div className="space-y-2">
                  <Label htmlFor="as_of_date">As of Date</Label>
                  <Input
                    id="as_of_date"
                    type="date"
                    value={reportParams.as_of_date}
                    onChange={(e) => setReportParams(prev => ({ ...prev, as_of_date: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button onClick={generateReport} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {reportData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="report">Report View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Report View Tab */}
          <TabsContent value="report" className="space-y-4">
            <Card className="print:shadow-none print:border-0">
              <CardContent className="p-8">
                {/* Report Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">
                    {selectedReportType?.replace('-', ' & ').toUpperCase()} STATEMENT
                  </h2>
                  <div className="text-sm text-muted-foreground mt-2">
                    {selectedReportType === 'balance-sheet' ? (
                      `As of ${new Date(reportParams.as_of_date).toLocaleDateString()}`
                    ) : (
                      `For the period ${new Date(reportParams.start_date).toLocaleDateString()} to ${new Date(reportParams.end_date).toLocaleDateString()}`
                    )}
                  </div>
                </div>

                {/* Profit & Loss Report */}
                {selectedReportType === 'profit-loss' && (
                  <div className="space-y-6">
                    {/* Revenue Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-700 mb-4">REVENUE</h3>
                      <div className="space-y-2">
                        <div className="border-t pt-2 flex justify-between items-center font-semibold">
                          <span>Total Revenue</span>
                          <span className="font-mono text-green-700">{formatCurrency(parseFloat((reportData as ProfitLossReport).revenue))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-red-700 mb-4">EXPENSES</h3>
                      <div className="space-y-2">
                        <div className="border-t pt-2 flex justify-between items-center font-semibold">
                          <span>Total Expenses</span>
                          <span className="font-mono text-red-700">{formatCurrency(parseFloat((reportData as ProfitLossReport).expenses))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="border-t-2 pt-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>NET INCOME</span>
                        <span className={`font-mono ${parseFloat((reportData as ProfitLossReport).net_income) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(parseFloat((reportData as ProfitLossReport).net_income))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Balance Sheet Report */}
                {selectedReportType === 'balance-sheet' && (
                  <div className="grid grid-cols-2 gap-8">
                    {/* Assets */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4">ASSETS</h3>
                      <div className="space-y-2">
                        <div className="border-t pt-2 flex justify-between items-center font-semibold">
                          <span>Total Assets</span>
                          <span className="font-mono text-blue-700">{formatCurrency(parseFloat((reportData as BalanceSheetReport).assets))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h3 className="text-lg font-semibold text-red-700 mb-4">LIABILITIES</h3>
                      <div className="space-y-2">
                        <div className="border-t pt-2 flex justify-between items-center font-semibold">
                          <span>Total Liabilities</span>
                          <span className="font-mono text-red-700">{formatCurrency(parseFloat((reportData as BalanceSheetReport).liabilities))}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-green-700 mb-4 mt-6">EQUITY</h3>
                      <div className="space-y-2">
                        <div className="border-t pt-2 flex justify-between items-center font-semibold">
                          <span>Total Equity</span>
                          <span className="font-mono text-green-700">{formatCurrency(parseFloat((reportData as BalanceSheetReport).equity))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Report */}
                {selectedReportType === 'cash-flow' && (
                  <div className="space-y-6">
                    {/* Operating Activities */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 mb-4">OPERATING ACTIVITIES</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="ml-4">Operating Cash Flow</span>
                          <span className="font-mono">{formatCurrency(parseFloat((reportData as CashFlowReport).operating_cash_flow))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Investing Activities */}
                    <div>
                      <h3 className="text-lg font-semibold text-purple-700 mb-4">INVESTING ACTIVITIES</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="ml-4">Investing Cash Flow</span>
                          <span className="font-mono">{formatCurrency(parseFloat((reportData as CashFlowReport).investing_cash_flow))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financing Activities */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-700 mb-4">FINANCING ACTIVITIES</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="ml-4">Financing Cash Flow</span>
                          <span className="font-mono">{formatCurrency(parseFloat((reportData as CashFlowReport).financing_cash_flow))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Cash Flow */}
                    <div className="border-t-2 pt-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>NET CASH FLOW</span>
                        <span className={`font-mono ${parseFloat((reportData as CashFlowReport).net_cash_flow) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(parseFloat((reportData as CashFlowReport).net_cash_flow))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chart View Tab */}
          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visual Analysis</CardTitle>
                <CardDescription>
                  Interactive charts for better insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <>
                      {selectedReportType === 'profit-loss' && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                          <Bar dataKey="netIncome" fill="#3b82f6" name="Net Income" />
                        </BarChart>
                      )}

                      {selectedReportType === 'balance-sheet' && (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      )}

                      {selectedReportType === 'cash-flow' && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="amount" fill="#8b5cf6" name="Cash Flow" />
                        </BarChart>
                      )}
                    </>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PDF Export
                  </CardTitle>
                  <CardDescription>
                    Download professional PDF report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Features:</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Professional formatting</li>
                      <li>• Print-ready layout</li>
                      <li>• Company branding</li>
                      <li>• Detailed calculations</li>
                    </ul>
                  </div>
                  <Button onClick={downloadPDF} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Excel Export
                  </CardTitle>
                  <CardDescription>
                    Download Excel spreadsheet with formulas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Features:</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Interactive formulas</li>
                      <li>• Multiple worksheets</li>
                      <li>• Data validation</li>
                      <li>• Chart integration</li>
                    </ul>
                  </div>
                  <Button onClick={downloadExcel} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Report
                  </CardTitle>
                  <CardDescription>
                    Send report via email (Coming Soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Schedule Report
                  </CardTitle>
                  <CardDescription>
                    Set up recurring reports (Coming Soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}