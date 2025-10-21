'use client';

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Plus, Wrench, AlertCircle, Edit, Trash2, MoreHorizontal, Eye, User, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MaintenanceRequest {
  id: string;
  request_id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  issue_description: string;
  priority: string;
  status: string;
  submitted_date: string;
  assigned_to?: string;
  estimated_cost?: number;
  notes?: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_COLORS = {
  low: 'secondary',
  medium: 'warning',
  high: 'warning',
  urgent: 'destructive',
} as const;

const STATUS_COLORS = {
  open: 'info',
  assigned: 'warning',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
} as const;

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<MaintenanceRequest[]>([]);

  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    issue_description: '',
    priority: 'medium',
    status: 'open',
    assigned_to: '',
    estimated_cost: '',
    notes: '',
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchRequests();
    fetchProperties();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/maintenance/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRequests(data.items || data || []);
    } catch (err) {
      console.error('Failed to load maintenance requests:', err);
      setError('Failed to load maintenance requests');
      setRequests([]);
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
      issue_description: '',
      priority: 'medium',
      status: 'open',
      assigned_to: '',
      estimated_cost: '',
      notes: '',
    });
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/maintenance/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          issue_description: formData.issue_description,
          priority: formData.priority,
          status: formData.status,
          assigned_to: formData.assigned_to || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          notes: formData.notes,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create maintenance request');
      }

      toast.success('Maintenance request created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/maintenance/${editingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          issue_description: formData.issue_description,
          priority: formData.priority,
          status: formData.status,
          assigned_to: formData.assigned_to || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          notes: formData.notes,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update maintenance request');
      }

      toast.success('Maintenance request updated successfully!');
      setIsEditModalOpen(false);
      setEditingRequest(null);
      resetForm();
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingRequestId) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/maintenance/${deletingRequestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete maintenance request');
      }

      toast.success('Maintenance request deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingRequestId(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setFormData({
      property_id: request.property_id,
      unit_number: request.unit_number,
      issue_description: request.issue_description,
      priority: request.priority,
      status: request.status,
      assigned_to: request.assigned_to || '',
      estimated_cost: request.estimated_cost?.toString() || '',
      notes: request.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (requestId: string) => {
    setDeletingRequestId(requestId);
    setIsDeleteModalOpen(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const openRequests = requests.filter(req => req.status === 'open').length;
    const inProgress = requests.filter(req => req.status === 'in_progress').length;
    const completedThisMonth = requests.filter(req => {
      if (req.status !== 'completed') return false;
      const completedDate = new Date(req.submitted_date);
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
    }).length;
    const urgent = requests.filter(req => req.priority === 'urgent').length;

    return {
      openRequests,
      inProgress,
      completedThisMonth,
      urgent,
    };
  }, [requests]);

  const MaintenanceForm = ({ onSubmit, submitText }: { onSubmit: (e: React.FormEvent) => void; submitText: string }) => (
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
          <Label htmlFor="unit_number">Unit Number</Label>
          <Input
            id="unit_number"
            value={formData.unit_number}
            onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
            placeholder="Enter unit number"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="issue_description">Issue Description *</Label>
          <Textarea
            id="issue_description"
            value={formData.issue_description}
            onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
            placeholder="Describe the maintenance issue"
            rows={3}
            required
          />
        </div>

        <div>
          <Label htmlFor="priority">Priority *</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="assigned_to">Assigned To</Label>
          <Input
            id="assigned_to"
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            placeholder="Enter assigned person"
          />
        </div>

        <div>
          <Label htmlFor="estimated_cost">Estimated Cost</Label>
          <Input
            id="estimated_cost"
            type="number"
            value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            placeholder="Enter estimated cost"
            min="0"
            step="0.01"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Enter any additional notes"
            rows={2}
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

  const columns: ColumnDef<MaintenanceRequest>[] = useMemo(
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
        accessorKey: "request_id",
        header: "Request ID",
        cell: ({ row }) => (
          <div className="font-mono text-sm">
            #{row.getValue("request_id")}
          </div>
        ),
      },
      {
        accessorKey: "property_name",
        header: "Property/Unit",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue("property_name")}</div>
            {row.original.unit_number && (
              <div className="text-sm text-gray-500">Unit {row.original.unit_number}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "issue_description",
        header: "Issue Description",
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.getValue("issue_description")}
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const priority = row.getValue("priority") as string;
          const color = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'default';
          const label = PRIORITIES.find(p => p.value === priority)?.label || priority;
          
          return (
            <Badge variant={color as any}>
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
          const label = STATUSES.find(s => s.value === status)?.label || status;
          
          return (
            <Badge variant={color as any}>
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "submitted_date",
        header: "Submitted Date",
        cell: ({ row }) => {
          const date = new Date(row.getValue("submitted_date"));
          return date.toLocaleDateString();
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const request = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditModal(request)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Update Status
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Assign
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openDeleteModal(request.id)}
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
          <p className="mt-2 text-sm text-gray-600">Loading maintenance requests...</p>
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Maintenance Requests</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => fetchRequests()}
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
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage maintenance requests and work orders
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
              <DialogDescription>
                Add a new maintenance request. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <MaintenanceForm onSubmit={handleCreateRequest} submitText="Create Request" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Requests</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.openRequests}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.inProgress}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed This Month</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.completedThisMonth}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Urgent</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.urgent}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        searchKey="maintenance requests"
        onRowSelectionChange={setSelectedRows}
      />

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Request</DialogTitle>
            <DialogDescription>
              Update the maintenance request information. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <MaintenanceForm onSubmit={handleEditRequest} submitText="Update Request" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Maintenance Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this maintenance request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRequest} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
