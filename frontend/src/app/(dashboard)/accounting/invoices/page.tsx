"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Download,
  X,
  Calculator
} from 'lucide-react';
import { accountingService } from '@/services/accounting.service';
import { 
  Invoice, 
  InvoiceLineItem, 
  Vendor, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest, 
  CreateInvoiceLineItemRequest,
  MarkInvoicePaidRequest 
} from '@/types/accounting';

// Form data interfaces (without backend-generated fields)
interface InvoiceLineItemFormData {
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

interface InvoiceFormData {
  vendor_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  line_items: InvoiceLineItemFormData[];
  tax_amount: string;
  notes: string;
}

interface InvoiceFilters {
  search: string;
  status: 'ALL' | 'pending' | 'paid' | 'overdue';
  vendor_id: string;
  date_from: string;
  date_to: string;
}

interface PaymentFormData {
  payment_date: string;
  amount_paid: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    status: 'ALL',
    vendor_id: 'ALL',
    date_from: '',
    date_to: ''
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [formData, setFormData] = useState<InvoiceFormData>({
    vendor_id: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    line_items: [{ description: '', quantity: '1', unit_price: '0', amount: '0' }],
    tax_amount: '0',
    notes: ''
  });
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '0'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invoicesData, vendorsData] = await Promise.all([
        accountingService.getInvoices(),
        accountingService.getVendors()
      ]);
      setInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
      setVendors(vendorsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices
  const filterInvoices = () => {
    let filtered = invoices;

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by status
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(invoice => {
        const today = new Date();
        const dueDate = new Date(invoice.due_date);
        const isOverdue = dueDate < today && invoice.status !== 'paid';
        
        if (filters.status === 'overdue') {
          return isOverdue;
        }
        return invoice.status === filters.status;
      });
    }

    // Filter by vendor
    if (filters.vendor_id !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.vendor_id === filters.vendor_id);
    }

    // Filter by date range
    if (filters.date_from) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.invoice_date) >= new Date(filters.date_from)
      );
    }
    if (filters.date_to) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.invoice_date) <= new Date(filters.date_to)
      );
    }

    setFilteredInvoices(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters when they change
  useEffect(() => {
    filterInvoices();
  }, [filters, invoices]);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor_id: '',
      invoice_number: '',
      invoice_date: '',
      due_date: '',
      line_items: [{ description: '', quantity: '1', unit_price: '0', amount: '0' }],
      tax_amount: '0',
      notes: ''
    });
    setFormErrors({});
  };

  // Calculate line item amount
  const calculateLineItemAmount = (quantity: string, unitPrice: string): string => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    return (qty * price).toFixed(2);
  };

  // Calculate subtotal
  const calculateSubtotal = (): number => {
    return formData.line_items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
  };

  // Calculate total
  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const tax = parseFloat(formData.tax_amount) || 0;
    return subtotal + tax;
  };

  // Add line item
  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', quantity: '1', unit_price: '0', amount: '0' }]
    }));
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (formData.line_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index)
      }));
    }
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof InvoiceLineItemFormData, value: string) => {
    setFormData(prev => {
      const newLineItems = [...prev.line_items];
      newLineItems[index] = { ...newLineItems[index], [field]: value };
      
      // Auto-calculate amount
      if (field === 'quantity' || field === 'unit_price') {
        const amount = calculateLineItemAmount(
          newLineItems[index].quantity,
          newLineItems[index].unit_price
        );
        newLineItems[index].amount = amount;
      }
      
      return { ...prev, line_items: newLineItems };
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.vendor_id) {
      errors.vendor_id = 'Vendor is required';
    }

    if (!formData.invoice_number.trim()) {
      errors.invoice_number = 'Invoice number is required';
    }

    if (!formData.invoice_date) {
      errors.invoice_date = 'Invoice date is required';
    }

    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
    }

    // Validate line items
    formData.line_items.forEach((item, index) => {
      if (!item.description.trim()) {
        errors[`line_item_${index}_description`] = 'Description is required';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        errors[`line_item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (!item.unit_price || parseFloat(item.unit_price) < 0) {
        errors[`line_item_${index}_unit_price`] = 'Unit price must be 0 or greater';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const subtotal = calculateSubtotal().toFixed(2);
      const total = calculateTotal().toFixed(2);
      
      const createData: CreateInvoiceRequest = {
        vendor_id: formData.vendor_id || undefined,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        subtotal: subtotal,
        tax_amount: formData.tax_amount,
        total_amount: total,
        amount_paid: '0',
        status: 'pending',
        notes: formData.notes || undefined,
        line_items: formData.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))
      };
      
      await accountingService.createInvoice(createData);
      await fetchData();
      setCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit invoice
  const handleEditInvoice = async () => {
    if (!validateForm() || !selectedInvoice) return;

    try {
      setSubmitting(true);
      const subtotal = calculateSubtotal().toFixed(2);
      const total = calculateTotal().toFixed(2);
      
      const updateData: UpdateInvoiceRequest = {
        vendor_id: formData.vendor_id || undefined,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        subtotal: subtotal,
        tax_amount: formData.tax_amount,
        total_amount: total,
        notes: formData.notes || undefined,
        line_items: formData.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))
      };
      
      await accountingService.updateInvoice(selectedInvoice.id, updateData);
      await fetchData();
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      resetForm();
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError('Failed to update invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark invoice as paid
  const handleMarkPaid = async () => {
    if (!selectedInvoice) return;

    try {
      setSubmitting(true);
      const paymentData: MarkInvoicePaidRequest = {
        payment_date: paymentFormData.payment_date,
        amount: paymentFormData.amount_paid
      };
      
      await accountingService.markInvoicePaid(selectedInvoice.id, paymentData);
      await fetchData();
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError('Failed to mark invoice as paid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      setSubmitting(true);
      await accountingService.deleteInvoice(selectedInvoice.id);
      await fetchData();
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('Failed to delete invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      vendor_id: invoice.vendor_id || '',
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      line_items: invoice.line_items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount
      })) || [{ description: '', quantity: '1', unit_price: '0', amount: '0' }],
      tax_amount: invoice.tax_amount || '0',
      notes: invoice.notes || ''
    });
    setEditDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  // Open payment dialog
  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount_paid: invoice.total_amount
    });
    setPaymentDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string, dueDate: string): string => {
    if (status === 'PAID') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    const today = new Date();
    const due = new Date(dueDate);
    if (due < today) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  // Get status text
  const getStatusText = (status: string, dueDate: string): string => {
    if (status === 'PAID') {
      return 'Paid';
    }
    
    const today = new Date();
    const due = new Date(dueDate);
    if (due < today) {
      return 'Overdue';
    }
    
    return 'Pending';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your vendor invoices and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Add a new invoice with line items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_id">Vendor</Label>
                    <Select
                      value={formData.vendor_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.vendor_id && (
                      <p className="text-sm text-red-500">{formErrors.vendor_id}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                      placeholder="e.g., INV-001"
                    />
                    {formErrors.invoice_number && (
                      <p className="text-sm text-red-500">{formErrors.invoice_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    />
                    {formErrors.invoice_date && (
                      <p className="text-sm text-red-500">{formErrors.invoice_date}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                    {formErrors.due_date && (
                      <p className="text-sm text-red-500">{formErrors.due_date}</p>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Line Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.line_items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                          {formErrors[`line_item_${index}_description`] && (
                            <p className="text-sm text-red-500">{formErrors[`line_item_${index}_description`]}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          />
                          {formErrors[`line_item_${index}_quantity`] && (
                            <p className="text-sm text-red-500">{formErrors[`line_item_${index}_quantity`]}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          />
                          {formErrors[`line_item_${index}_unit_price`] && (
                            <p className="text-sm text-red-500">{formErrors[`line_item_${index}_unit_price`]}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Label>Amount</Label>
                          <Input
                            value={formatCurrency(parseFloat(item.amount))}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            disabled={formData.line_items.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(calculateSubtotal())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.tax_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                          className="w-24 h-8"
                        />
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by invoice number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={filters.vendor_id}
                onValueChange={(value) => handleFilterChange('vendor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices ({filteredInvoices.length})
          </CardTitle>
          <CardDescription>
            Manage your vendor invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const vendor = vendors.find(v => v.id === invoice.vendor_id);
                  const status = getStatusText(invoice.status, invoice.due_date);
                  const isOverdue = status === 'Overdue';
                  
                  return (
                    <TableRow 
                      key={invoice.id} 
                      className={`hover:bg-muted/50 ${isOverdue ? 'bg-red-50' : ''}`}
                    >
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {vendor?.vendor_name || 'Unknown Vendor'}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(parseFloat(invoice.total_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(invoice.amount_paid || '0'))}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status, invoice.due_date)}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {invoice.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPaymentDialog(invoice)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(invoice)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              View invoice information and line items
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg">Invoice Information</h3>
                  <div className="space-y-2 mt-2">
                    <div><strong>Invoice Number:</strong> {selectedInvoice.invoice_number}</div>
                    <div><strong>Vendor:</strong> {vendors.find(v => v.id === selectedInvoice.vendor_id)?.vendor_name}</div>
                    <div><strong>Invoice Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</div>
                    <div><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Payment Information</h3>
                  <div className="space-y-2 mt-2">
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedInvoice.status, selectedInvoice.due_date)}`}>
                        {getStatusText(selectedInvoice.status, selectedInvoice.due_date)}
                      </Badge>
                    </div>
                    <div><strong>Total Amount:</strong> {formatCurrency(parseFloat(selectedInvoice.total_amount))}</div>
                    <div><strong>Amount Paid:</strong> {formatCurrency(parseFloat(selectedInvoice.amount_paid || '0'))}</div>
                    <div><strong>Balance:</strong> {formatCurrency(parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.amount_paid || '0'))}</div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Line Items</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.line_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(item.unit_price))}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(parseFloat(item.amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Notes</h3>
                  <p className="text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedInvoice.status !== 'paid' && (
                  <Button onClick={() => openPaymentDialog(selectedInvoice)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record payment for this invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentFormData.payment_date}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input
                id="amount_paid"
                type="number"
                min="0"
                step="0.01"
                value={paymentFormData.amount_paid}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount_paid: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={submitting}>
              {submitting ? 'Processing...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice "{selectedInvoice?.invoice_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
