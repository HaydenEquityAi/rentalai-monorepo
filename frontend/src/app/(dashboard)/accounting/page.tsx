"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { accountingService } from '@/services/accounting.service';
import { Account, Transaction, AccountType, TransactionType } from '@/types/accounting';
import { Modal } from '@/components/ui/modal';
import { DataTable, Column } from '@/components/ui/data-table';
import { MetricCard, QuickActionCard } from '@/components/ui/metrics';
import { ReportDropdown, ActionButton } from '@/components/ui/actions';
import { useToast } from '@/components/ui/toast';
import { NewTransactionForm } from '@/components/accounting/NewTransactionForm';
import { NewInvoiceForm } from '@/components/accounting/NewInvoiceForm';

interface DashboardMetrics {
  totalAssets: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  assetsTrend: 'up' | 'down' | 'stable';
  revenueTrend: 'up' | 'down' | 'stable';
  expensesTrend: 'up' | 'down' | 'stable';
  incomeTrend: 'up' | 'down' | 'stable';
}

interface ChartData {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

interface BudgetData {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export default function AccountingDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  
  const { success, error: showError } = useToast();

  // Define table columns
  const transactionColumns: Column<Transaction>[] = [
    {
      key: 'transaction_date',
      label: 'Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      filterable: true
    },
    {
      key: 'transaction_type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: TransactionType) => (
        <Badge className={getTransactionTypeColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: string, row: Transaction) => (
        <div className={`font-semibold ${
          row.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.transaction_type === 'credit' ? '+' : '-'}
          {formatCurrency(parseFloat(value))}
        </div>
      )
    },
    {
      key: 'account_id',
      label: 'Account',
      sortable: true,
      filterable: true,
      render: (value: string) => {
        const account = accounts.find(acc => acc.id === value);
        return account ? account.account_name : 'Unknown';
      }
    }
  ];

  const accountColumns: Column<Account>[] = [
    {
      key: 'account_name',
      label: 'Account Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'account_number',
      label: 'Account Number',
      sortable: true,
      filterable: true
    },
    {
      key: 'account_type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: AccountType) => (
        <Badge className={getAccountTypeColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (value: string) => formatCurrency(parseFloat(value))
    }
  ];

  // Handle form success
  const handleTransactionSuccess = () => {
    setShowNewTransaction(false);
    success('Transaction Created', 'New transaction has been created successfully.');
    fetchDashboardData();
  };

  const handleInvoiceSuccess = () => {
    setShowNewInvoice(false);
    success('Invoice Created', 'New invoice has been created successfully.');
    fetchDashboardData();
  };

  // Handle report generation
  const handleGenerateReport = async (reportType: string) => {
    try {
      setReportLoading(reportType);
      
      // Mock report generation - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      success('Report Generated', `${reportType} report has been generated and downloaded.`);
    } catch (err) {
      showError('Report Generation Failed', 'Failed to generate report. Please try again.');
    } finally {
      setReportLoading(null);
    }
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountsData, transactionsData] = await Promise.all([
        accountingService.getAccounts(),
        accountingService.getTransactions({ limit: 20 })
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(accountsData);
      setMetrics(calculatedMetrics);

      // Generate chart data (last 6 months)
      const chartData = generateChartData(transactionsData);
      setChartData(chartData);

      // Generate budget data
      const budgetData = generateBudgetData(accountsData);
      setBudgetData(budgetData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      showError('Failed to load dashboard data', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics from accounts
  const calculateMetrics = (accounts: Account[]): DashboardMetrics => {
    const safeAccounts = accounts || [];
    
    const assets = safeAccounts
      .filter(acc => acc.account_type === 'asset')
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    const revenue = safeAccounts
      .filter(acc => acc.account_type === 'revenue')
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    const expenses = safeAccounts
      .filter(acc => acc.account_type === 'expense')
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

    const netIncome = revenue - expenses;

    // Simple trend calculation (could be enhanced with historical data)
    const assetsTrend = assets > 0 ? 'up' : 'stable';
    const revenueTrend = revenue > 0 ? 'up' : 'stable';
    const expensesTrend = expenses > 0 ? 'up' : 'stable';
    const incomeTrend = netIncome > 0 ? 'up' : netIncome < 0 ? 'down' : 'stable';

    return {
      totalAssets: assets,
      totalRevenue: revenue,
      totalExpenses: expenses,
      netIncome,
      assetsTrend,
      revenueTrend,
      expensesTrend,
      incomeTrend
    };
  };

  // Generate chart data for last 6 months
  const generateChartData = (transactions: Transaction[]): ChartData[] => {
    const months: ChartData[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: 0,
        expenses: 0,
        netIncome: 0
      });
    }

    // Calculate monthly totals
    (transactions || []).forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      const monthIndex = months.findIndex(m => 
        new Date(m.month + ' 1, ' + now.getFullYear()).getMonth() === transactionDate.getMonth()
      );
      
      if (monthIndex !== -1) {
        const amount = parseFloat(transaction.amount);
        if (transaction.transaction_type === 'credit') {
          months[monthIndex].revenue += amount;
        } else if (transaction.transaction_type === 'debit') {
          months[monthIndex].expenses += amount;
        }
      }
    });

    // Calculate net income
    months.forEach(month => {
      month.netIncome = month.revenue - month.expenses;
    });

    return months;
  };

  // Generate budget vs actual data
  const generateBudgetData = (accounts: Account[]): BudgetData[] => {
    const safeAccounts = accounts || [];
    const categories = ['Revenue', 'Operating Expenses', 'Administrative', 'Maintenance', 'Marketing'];
    
    return categories.map(category => {
      const budgeted = Math.random() * 50000 + 10000; // Mock budget data
      const actual = Math.random() * 60000 + 5000; // Mock actual data
      const variance = actual - budgeted;
      
      return {
        category,
        budgeted,
        actual,
        variance
      };
    });
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  // Get account type color
  const getAccountTypeColor = (type: AccountType): string => {
    switch (type) {
      case 'asset':
        return 'bg-blue-100 text-blue-800';
      case 'liability':
        return 'bg-red-100 text-red-800';
      case 'equity':
        return 'bg-green-100 text-green-800';
      case 'revenue':
        return 'bg-emerald-100 text-emerald-800';
      case 'expense':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: TransactionType): string => {
    switch (type) {
      case 'credit':
        return 'bg-green-100 text-green-800';
      case 'debit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={fetchDashboardData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your financial performance and manage accounts
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton
            label="Refresh"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchDashboardData}
            variant="outline"
          />
          <ActionButton
            label="New Transaction"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowNewTransaction(true)}
          />
          <ActionButton
            label="New Invoice"
            icon={<Receipt className="h-4 w-4" />}
            onClick={() => setShowNewInvoice(true)}
            variant="outline"
          />
          <ReportDropdown
            reports={[
              {
                label: 'Profit & Loss',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Profit & Loss'),
                loading: reportLoading === 'Profit & Loss'
              },
              {
                label: 'Balance Sheet',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Balance Sheet'),
                loading: reportLoading === 'Balance Sheet'
              },
              {
                label: 'Cash Flow',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Cash Flow'),
                loading: reportLoading === 'Cash Flow'
              },
              {
                label: 'Budget vs Actual',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Budget vs Actual'),
                loading: reportLoading === 'Budget vs Actual'
              }
            ]}
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Assets"
          value={metrics ? formatCurrency(metrics.totalAssets) : '$0.00'}
          description="Current asset value"
          trend={metrics?.assetsTrend}
          icon={<Building2 className="h-4 w-4" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Total Revenue"
          value={metrics ? formatCurrency(metrics.totalRevenue) : '$0.00'}
          description="Year-to-date revenue"
          trend={metrics?.revenueTrend}
          icon={<TrendingUp className="h-4 w-4" />}
          color="green"
          loading={loading}
        />
        
        <MetricCard
          title="Total Expenses"
          value={metrics ? formatCurrency(metrics.totalExpenses) : '$0.00'}
          description="Year-to-date expenses"
          trend={metrics?.expensesTrend}
          icon={<TrendingDown className="h-4 w-4" />}
          color="red"
          loading={loading}
        />
        
        <MetricCard
          title="Net Income"
          value={metrics ? formatCurrency(metrics.netIncome) : '$0.00'}
          description="Revenue minus expenses"
          trend={metrics?.incomeTrend}
          icon={<DollarSign className="h-4 w-4" />}
          color={metrics && metrics.netIncome >= 0 ? 'green' : 'red'}
          loading={loading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses (Last 6 Months)</CardTitle>
              <CardDescription>
                Track your financial performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netIncome" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Net Income"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <DataTable
            data={accounts}
            columns={accountColumns}
            searchable={true}
            filterable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            onExport={() => handleGenerateReport('Accounts Export')}
            loading={loading}
            emptyMessage="No accounts found"
          />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <DataTable
            data={transactions}
            columns={transactionColumns}
            searchable={true}
            filterable={true}
            sortable={true}
            pagination={true}
            pageSize={20}
            exportable={true}
            onExport={() => handleGenerateReport('Transactions Export')}
            actions={{
              view: (transaction) => console.log('View transaction:', transaction),
              edit: (transaction) => console.log('Edit transaction:', transaction)
            }}
            loading={loading}
            emptyMessage="No transactions found"
          />
        </TabsContent>

        {/* Budget vs Actual Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Performance</CardTitle>
              <CardDescription>
                Compare budgeted amounts with actual spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
                    <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionCard
          title="Quick Actions"
          description="Common accounting tasks"
          actions={[
            {
              label: 'New Transaction',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowNewTransaction(true)
            },
            {
              label: 'New Invoice',
              icon: <Receipt className="h-4 w-4" />,
              onClick: () => setShowNewInvoice(true)
            },
            {
              label: 'Generate P&L',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => handleGenerateReport('Profit & Loss')
            },
            {
              label: 'Generate Balance Sheet',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => handleGenerateReport('Balance Sheet')
            }
          ]}
        />

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Latest invoice activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <div>
                      <div className="font-medium">Invoice #{1000 + i}</div>
                      <div className="text-sm text-muted-foreground">
                        Vendor Name
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$1,250.00</div>
                    <div className="text-sm text-muted-foreground">
                      {i < 3 ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <Modal
        open={showNewTransaction}
        onOpenChange={setShowNewTransaction}
        title="New Transaction"
        description="Create a new accounting transaction"
        size="lg"
      >
        <NewTransactionForm
          onSuccess={handleTransactionSuccess}
          onCancel={() => setShowNewTransaction(false)}
        />
      </Modal>

      <Modal
        open={showNewInvoice}
        onOpenChange={setShowNewInvoice}
        title="New Invoice"
        description="Create a new invoice"
        size="xl"
      >
        <NewInvoiceForm
          onSuccess={handleInvoiceSuccess}
          onCancel={() => setShowNewInvoice(false)}
        />
      </Modal>
    </div>
  );
}