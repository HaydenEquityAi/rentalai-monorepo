"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, DollarSign, Building2, User, Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { accountingService } from '@/services/accounting.service';
import { toast } from 'sonner';
import { 
  CreateTransactionRequest,
  TransactionType,
  AccountType
} from '@/types/accounting';

const transactionSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  transaction_date: z.date({ required_error: 'Transaction date is required' }),
  transaction_type: z.enum(['debit', 'credit'] as const),
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  vendor_id: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional()
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface NewTransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewTransactionForm({ onSuccess, onCancel }: NewTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: 'debit',
      transaction_date: new Date(),
      amount: '0.00'
    }
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadAccounts(),
      loadVendors()
    ]);
    
    // Set static categories
    setCategories([
      'Rent Income',
      'Maintenance',
      'Utilities',
      'Insurance',
      'Legal Fees',
      'Marketing',
      'Office Supplies',
      'Professional Services'
    ]);
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accountsData = await accountingService.getAccounts();
      setAccounts(accountsData.map((acc: any) => ({
        id: acc.id,
        name: acc.account_name,
        type: acc.account_type,
        number: acc.account_number
      })));
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      toast.error('Error loading accounts', {
        description: err.message || 'Failed to load accounts. Please try again.',
      });
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      const vendorsData = await accountingService.getVendors();
      setVendors(vendorsData.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email || ''
      })));
    } catch (err: any) {
      console.error('Error loading vendors:', err);
      toast.error('Error loading vendors', {
        description: err.message || 'Failed to load vendors. Please try again.',
      });
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setLoading(true);
      setError(null);

      const transactionData: CreateTransactionRequest = {
        ...data,
        transaction_date: data.transaction_date.toISOString(),
        amount: data.amount,
        vendor_id: data.vendor_id || undefined,
        reference_number: data.reference_number || undefined,
        memo: data.notes || undefined
      };

      await accountingService.createTransaction(transactionData);
      
      reset();
      onSuccess();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Selection */}
        <div className="space-y-2">
          <Label htmlFor="account_id" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Account *
          </Label>
          <Select onValueChange={(value) => setValue('account_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingAccounts ? "Loading..." : "Select account"} />
            </SelectTrigger>
            <SelectContent>
              {loadingAccounts ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  No accounts available
                </div>
              ) : (
                accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.number}) - {account.type}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.account_id && (
            <p className="text-sm text-red-600">{errors.account_id.message}</p>
          )}
        </div>

        {/* Transaction Type */}
        <div className="space-y-2">
          <Label htmlFor="transaction_type" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Transaction Type *
          </Label>
          <Select onValueChange={(value) => setValue('transaction_type', value as TransactionType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
          {errors.transaction_type && (
            <p className="text-sm text-red-600">{errors.transaction_type.message}</p>
          )}
        </div>

        {/* Transaction Date */}
        <div className="space-y-2">
          <Label>Transaction Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('transaction_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('transaction_date') ? (
                  format(watch('transaction_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('transaction_date')}
                onSelect={(date) => date && setValue('transaction_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.transaction_date && (
            <p className="text-sm text-red-600">{errors.transaction_date.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Amount *
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('amount')}
          />
          {watch('amount') && (
            <div className="text-sm text-muted-foreground">
              Amount: {formatCurrency(watch('amount'))}
            </div>
          )}
          {errors.amount && (
            <p className="text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            placeholder="Enter transaction description"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select onValueChange={(value) => setValue('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Vendor */}
        <div className="space-y-2">
          <Label htmlFor="vendor_id" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Vendor (Optional)
          </Label>
          <Select onValueChange={(value) => setValue('vendor_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingVendors ? "Loading..." : "Select vendor"} />
            </SelectTrigger>
            <SelectContent>
              {loadingVendors ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : vendors.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  No vendors available
                </div>
              ) : (
                vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Reference Number */}
        <div className="space-y-2">
          <Label htmlFor="reference_number">Reference Number (Optional)</Label>
          <Input
            id="reference_number"
            placeholder="Enter reference number"
            {...register('reference_number')}
          />
        </div>
      </div>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction Summary
          </CardTitle>
          <CardDescription>
            Review transaction details before saving
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Account:</span>
              <span className="ml-2">
                {accounts.find(acc => acc.id === watch('account_id'))?.name || 'Not selected'}
              </span>
            </div>
            <div>
              <span className="font-medium">Type:</span>
              <span className="ml-2 capitalize">{watch('transaction_type')}</span>
            </div>
            <div>
              <span className="font-medium">Amount:</span>
              <span className="ml-2">{formatCurrency(watch('amount'))}</span>
            </div>
            <div>
              <span className="font-medium">Category:</span>
              <span className="ml-2">{watch('category') || 'Not selected'}</span>
            </div>
            <div>
              <span className="font-medium">Date:</span>
              <span className="ml-2">
                {watch('transaction_date') ? format(watch('transaction_date'), 'PPP') : 'Not selected'}
              </span>
            </div>
            <div>
              <span className="font-medium">Vendor:</span>
              <span className="ml-2">
                {vendors.find(v => v.id === watch('vendor_id'))?.name || 'None'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this transaction..."
              rows={3}
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Transaction'}
        </Button>
      </div>
    </form>
  );
}
