'use client';

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
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
import { propertiesAPI } from '@/lib/api';
import { Plus, Building2, MapPin, AlertCircle, Edit, Trash2, MoreHorizontal, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  total_units: number;
  year_built: number;
  description: string;
  status: 'active' | 'inactive';
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
];

const PROPERTY_TYPE_COLORS = {
  single_family: 'info',
  multi_family: 'success',
  commercial: 'warning',
  apartment: 'info',
  condo: 'secondary',
  townhouse: 'secondary',
} as const;

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Property[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: '',
    total_units: '',
    year_built: '',
    description: '',
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await propertiesAPI.list();
      const data = response.data;
      // Add status field to properties (mock data for now)
      const propertiesWithStatus = (data.items || data || []).map((property: any) => ({
        ...property,
        status: Math.random() > 0.2 ? 'active' : 'inactive' // Mock status
      }));
      setProperties(propertiesWithStatus);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      property_type: '',
      total_units: '',
      year_built: '',
      description: '',
    });
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await propertiesAPI.create({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        property_type: formData.property_type,
        total_units: parseInt(formData.total_units) || 0,
        year_built: parseInt(formData.year_built) || new Date().getFullYear(),
        description: formData.description,
      });

      toast.success('Property created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchProperties();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    setSubmitting(true);

    try {
      const response = await propertiesAPI.update(editingProperty.id, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        property_type: formData.property_type,
        total_units: parseInt(formData.total_units) || 0,
        year_built: parseInt(formData.year_built) || new Date().getFullYear(),
        description: formData.description,
      });

      toast.success('Property updated successfully!');
      setIsEditModalOpen(false);
      setEditingProperty(null);
      resetForm();
      fetchProperties();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!deletingPropertyId) return;

    setSubmitting(true);

    try {
      await propertiesAPI.delete(deletingPropertyId);

      toast.success('Property deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingPropertyId(null);
      fetchProperties();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setSubmitting(true);

    try {
      const deletePromises = selectedRows.map(property =>
        propertiesAPI.delete(property.id)
      );

      await Promise.all(deletePromises);
      toast.success(`${selectedRows.length} properties deleted successfully!`);
      setSelectedRows([]);
      fetchProperties();
    } catch (err: any) {
      toast.error('Failed to delete selected properties');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      property_type: property.property_type,
      total_units: property.total_units.toString(),
      year_built: property.year_built.toString(),
      description: property.description,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (propertyId: string) => {
    setDeletingPropertyId(propertyId);
    setIsDeleteModalOpen(true);
  };

  const PropertyForm = ({ onSubmit, submitText }: { onSubmit: (e: React.FormEvent) => void; submitText: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">Property Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter property name"
            required
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter street address"
            required
          />
        </div>

        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Enter city"
            required
          />
        </div>

        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="Enter state"
            required
          />
        </div>

        <div>
          <Label htmlFor="zip">ZIP Code *</Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            placeholder="Enter ZIP code"
            required
          />
        </div>

        <div>
          <Label htmlFor="property_type">Property Type *</Label>
          <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="total_units">Total Units</Label>
          <Input
            id="total_units"
            type="number"
            value={formData.total_units}
            onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
            placeholder="Enter number of units"
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="year_built">Year Built</Label>
          <Input
            id="year_built"
            type="number"
            value={formData.year_built}
            onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
            placeholder="Enter year built"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter property description"
            rows={3}
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

  const columns: ColumnDef<Property>[] = useMemo(
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
        accessorKey: "name",
        header: "Property Name",
        cell: ({ row }) => (
          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">
            {row.getValue("address")}
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: "City",
      },
      {
        accessorKey: "total_units",
        header: "Units",
        cell: ({ row }) => (
          <div className="text-center">
            {row.getValue("total_units") || 0}
          </div>
        ),
      },
      {
        accessorKey: "property_type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("property_type") as string;
          const color = PROPERTY_TYPE_COLORS[type as keyof typeof PROPERTY_TYPE_COLORS] || 'default';
          const label = PROPERTY_TYPES.find(t => t.value === type)?.label || type;
          
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
          return (
            <Badge variant={status === 'active' ? 'success' : 'secondary'}>
              {status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const property = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditModal(property)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openDeleteModal(property.id)}
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

  const bulkActions = (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleBulkDelete}
      disabled={submitting}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete Selected ({selectedRows.length})
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading properties...</p>
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Properties</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => fetchProperties()}
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
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your property portfolio
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
              <DialogDescription>
                Add a new property to your portfolio. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <PropertyForm onSubmit={handleCreateProperty} submitText="Create Property" />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={properties}
        searchKey="properties"
        onRowSelectionChange={setSelectedRows}
        bulkActions={bulkActions}
      />

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property information. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <PropertyForm onSubmit={handleEditProperty} submitText="Update Property" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProperty} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}