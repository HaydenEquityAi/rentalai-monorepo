"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { CalendarIcon, AlertCircle, DollarSign, Building2, User, Receipt, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { accountingService } from '@/services/accounting.service';
import { tenantsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { 
  CreateInvoiceRequest,
  InvoiceStatus
} from '@/types/accounting';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit_price: z.string().min(1, 'Unit price is required'),
  amount: z.string().min(1, 'Amount is required'),
  account_id: z.string().min(1, 'Account is required')
});

const invoiceSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  invoice_date: z.date({ required_error: 'Invoice date is required' }),
  due_date: z.date({ required_error: 'Due date is required' }),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const),
  notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface NewInvoiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewInvoiceForm({ onSuccess, onCancel }: NewInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'draft',
      line_items: [{ description: '', quantity: '1', unit_price: '0.00', amount: '0.00', account_id: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items'
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadTenants(),
      loadAccounts()
    ]);
  };

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const tenantsData = await tenantsAPI.getAll();
      setTenants(tenantsData);
    } catch (err: any) {
      console.error('Error loading tenants:', err);
      toast.error('Error loading tenants', {
        description: err.message || 'Failed to load tenants. Please try again.',
      });
      setTenants([]);
    } finally {
      setLoadingTenants(false);
    }
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

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setLoading(true);
      setError(null);

      const invoiceData: CreateInvoiceRequest = {
        ...data,
        invoice_date: data.invoice_date.toISOString(),
        due_date: data.due_date.toISOString(),
        line_items: data.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        })),
        notes: data.notes || undefined,
        invoice_number: `INV-${Date.now()}`, // Generate invoice number
        subtotal: data.line_items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0).toFixed(2),
        total_amount: data.line_items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0).toFixed(2)
      };

      await accountingService.createInvoice(invoiceData);
      
      reset();
      onSuccess();
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const lineItems = watch('line_items') || [];
    return lineItems.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const addLineItem = () => {
    append({ description: '', quantity: '1', unit_price: '0.00', amount: '0.00', account_id: '' });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
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
        {/* Tenant Selection */}
        <div className="space-y-2">
          <Label htmlFor="tenant_id" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Tenant *
          </Label>
          <Select onValueChange={(value) => setValue('tenant_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingTenants ? "Loading..." : "Select tenant"} />
            </SelectTrigger>
            <SelectContent>
              {loadingTenants ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  No tenants available
                </div>
              ) : (
                tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.tenant_id && (
            <p className="text-sm text-red-600">{errors.tenant_id.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select onValueChange={(value) => setValue('status', value as InvoiceStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* Invoice Date */}
        <div className="space-y-2">
          <Label>Invoice Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('invoice_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('invoice_date') ? (
                  format(watch('invoice_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('invoice_date')}
                onSelect={(date) => date && setValue('invoice_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.invoice_date && (
            <p className="text-sm text-red-600">{errors.invoice_date.message}</p>
          )}
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('due_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('due_date') ? (
                  format(watch('due_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('due_date')}
                onSelect={(date) => date && setValue('due_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.due_date && (
            <p className="text-sm text-red-600">{errors.due_date.message}</p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Line Items
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
          <CardDescription>
            Add items to this invoice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor={`line_items.${index}.description`}>Description *</Label>
                <Input
                  placeholder="Item description"
                  {...register(`line_items.${index}.description`)}
                />
                {errors.line_items?.[index]?.description && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.description?.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`line_items.${index}.quantity`}>Quantity *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1"
                  {...register(`line_items.${index}.quantity`)}
                />
                {errors.line_items?.[index]?.quantity && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.quantity?.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`line_items.${index}.unit_price`}>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register(`line_items.${index}.unit_price`)}
                />
                {errors.line_items?.[index]?.unit_price && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.unit_price?.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`line_items.${index}.account_id`}>Account *</Label>
                <Select onValueChange={(value) => setValue(`line_items.${index}.account_id`, value)}>
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
                          {account.name} ({account.number})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.line_items?.[index]?.account_id && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.account_id?.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`line_items.${index}.amount`}>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register(`line_items.${index}.amount`)}
                />
                {errors.line_items?.[index]?.amount && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.amount?.message}</p>
                )}
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  disabled={fields.length === 1}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about this invoice..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
