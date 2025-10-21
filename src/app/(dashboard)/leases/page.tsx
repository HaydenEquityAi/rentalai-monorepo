'use client';

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Plus, FileText, AlertCircle, Edit, Trash2, MoreHorizontal, Eye, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

interface Lease {
  id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  security_deposit: number;
  notes?: string;
}

const LEASE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'terminated', label: 'Terminated' },
];

const STATUS_COLORS = {
  active: 'success',
  expired: 'secondary',
  upcoming: 'info',
  terminated: 'destructive',
} as const;

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Lease[]>([]);

  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    tenant_name: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    status: 'active',
    notes: '',
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchLeases();
    fetchProperties();
  }, []);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/leases/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLeases(data.items || data || []);
    } catch (err) {
      console.error('Failed to load leases:', err);
      setError('Failed to load leases');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/properties/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProperties(data.items || data || []);
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      unit_number: '',
      tenant_name: '',
      start_date: '',
      end_date: '',
      monthly_rent: '',
      security_deposit: '',
      status: 'active',
      notes: '',
    });
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/leases/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          tenant_name: formData.tenant_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          monthly_rent: parseFloat(formData.monthly_rent) || 0,
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: formData.status,
          notes: formData.notes,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create lease');
      }

      toast.success('Lease created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchLeases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lease');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLease) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/leases/${editingLease.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          tenant_name: formData.tenant_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          monthly_rent: parseFloat(formData.monthly_rent) || 0,
          security_deposit: parseFloat(formData.security_deposit) || 0,
          status: formData.status,
          notes: formData.notes,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update lease');
      }

      toast.success('Lease updated successfully!');
      setIsEditModalOpen(false);
      setEditingLease(null);
      resetForm();
      fetchLeases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lease');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLease = async () => {
    if (!deletingLeaseId) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/leases/${deletingLeaseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete lease');
      }

      toast.success('Lease deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingLeaseId(null);
      fetchLeases();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lease');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (lease: Lease) => {
    setEditingLease(lease);
    setFormData({
      property_id: lease.property_id,
      unit_number: lease.unit_number,
      tenant_name: lease.tenant_name,
      start_date: lease.start_date,
      end_date: lease.end_date,
      monthly_rent: lease.monthly_rent.toString(),
      security_deposit: lease.security_deposit.toString(),
      status: lease.status,
      notes: lease.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (leaseId: string) => {
    setDeletingLeaseId(leaseId);
    setIsDeleteModalOpen(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const activeLeases = leases.filter(lease => lease.status === 'active').length;
    const expiringSoon = leases.filter(lease => {
      const endDate = new Date(lease.end_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;
    const totalMonthlyRevenue = leases
      .filter(lease => lease.status === 'active')
      .reduce((sum, lease) => sum + lease.monthly_rent, 0);
    const avgRent = activeLeases > 0 ? totalMonthlyRevenue / activeLeases : 0;

    return {
      activeLeases,
      expiringSoon,
      totalMonthlyRevenue,
      avgRent,
    };
  }, [leases]);

  const LeaseForm = ({ onSubmit, submitText }: { onSubmit: (e: React.FormEvent) => void; submitText: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="property_id">Property *</Label>
          <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unit_number">Unit Number *</Label>
          <Input
            id="unit_number"
            value={formData.unit_number}
            onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
            placeholder="Enter unit number"
            required
          />
        </div>

        <div>
          <Label htmlFor="tenant_name">Tenant Name *</Label>
          <Input
            id="tenant_name"
            value={formData.tenant_name}
            onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
            placeholder="Enter tenant name"
            required
          />
        </div>

        <div>
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="end_date">End Date *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="monthly_rent">Monthly Rent *</Label>
          <Input
            id="monthly_rent"
            type="number"
            value={formData.monthly_rent}
            onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
            placeholder="Enter monthly rent"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <Label htmlFor="security_deposit">Security Deposit</Label>
          <Input
            id="security_deposit"
            type="number"
            value={formData.security_deposit}
            onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
            placeholder="Enter security deposit"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {LEASE_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Enter any additional notes"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitText}
        </Button>
      </DialogFooter>
    </form>
  );

  const columns: ColumnDef<Lease>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "property_name",
        header: "Property/Unit",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue("property_name")}</div>
            <div className="text-sm text-gray-500">Unit {row.original.unit_number}</div>
          </div>
        ),
      },
      {
        accessorKey: "tenant_name",
        header: "Tenant Name",
        cell: ({ row }) => (
          <div className="font-medium">
            {row.getValue("tenant_name")}
          </div>
        ),
      },
      {
        accessorKey: "start_date",
        header: "Start Date",
        cell: ({ row }) => {
          const date = new Date(row.getValue("start_date"));
          return date.toLocaleDateString();
        },
      },
      {
        accessorKey: "end_date",
        header: "End Date",
        cell: ({ row }) => {
          const date = new Date(row.getValue("end_date"));
          return date.toLocaleDateString();
        },
      },
      {
        accessorKey: "monthly_rent",
        header: "Monthly Rent",
        cell: ({ row }) => (
          <div className="text-right font-medium">
            ${row.getValue("monthly_rent")?.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
          const label = LEASE_STATUSES.find(s => s.value === status)?.label || status;
          
          return (
            <Badge variant={color as any}>
              {label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const lease = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditModal(lease)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Renew
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <X className="mr-2 h-4 w-4" />
                  Terminate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openDeleteModal(lease.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading leases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Leases</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => fetchLeases()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leases</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your lease agreements
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Lease
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lease</DialogTitle>
              <DialogDescription>
                Add a new lease agreement. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <LeaseForm onSubmit={handleCreateLease} submitText="Create Lease" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Leases</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.activeLeases}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.expiringSoon}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-2xl font-semibold text-gray-900">${stats.totalMonthlyRevenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Rent</dt>
                  <dd className="text-2xl font-semibold text-gray-900">${stats.avgRent.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={leases}
        searchKey="leases"
        onRowSelectionChange={setSelectedRows}
      />

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lease</DialogTitle>
            <DialogDescription>
              Update the lease information. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <LeaseForm onSubmit={handleEditLease} submitText="Update Lease" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lease</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lease? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLease} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
