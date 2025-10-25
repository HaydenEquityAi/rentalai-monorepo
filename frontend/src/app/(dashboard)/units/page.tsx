'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, Column } from '@/components/ui/data-table';
import { Plus, Home, AlertCircle, Edit, Trash2, MoreHorizontal, Eye, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  rent_amount: number;
  deposit_amount: number;
  status: string;
  amenities?: string | string[];
}

const UNIT_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'unavailable', label: 'Unavailable' },
];

const STATUS_COLORS = {
  available: 'secondary',
  occupied: 'secondary',
  maintenance: 'outline',
  unavailable: 'destructive',
} as const;

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    rent_amount: '',
    deposit_amount: '',
    status: 'available',
    amenities: '',
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const loadData = async () => {
      await fetchUnits();
      await fetchProperties();
    };
    loadData();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/units/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUnits(data.items || data || []);
    } catch (err) {
      console.error('Failed to load units:', err);
      setError('Failed to load units');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/properties/`, {
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
      bedrooms: '',
      bathrooms: '',
      square_feet: '',
      rent_amount: '',
      deposit_amount: '',
      status: 'available',
      amenities: '',
    });
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/units/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseFloat(formData.bathrooms) || 0,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
          rent_amount: parseFloat(formData.rent_amount) || 0,
          deposit_amount: parseFloat(formData.deposit_amount) || 0,
          status: formData.status,
          amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create unit');
      }

      toast.success('Unit created successfully!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/units/${editingUnit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_id: formData.property_id,
          unit_number: formData.unit_number,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseFloat(formData.bathrooms) || 0,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
          rent_amount: parseFloat(formData.rent_amount) || 0,
          deposit_amount: parseFloat(formData.deposit_amount) || 0,
          status: formData.status,
          amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update unit');
      }

      toast.success('Unit updated successfully!');
      setIsEditModalOpen(false);
      setEditingUnit(null);
      resetForm();
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deletingUnitId) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/units/${deletingUnitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete unit');
      }

      toast.success('Unit deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingUnitId(null);
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete unit');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      property_id: unit.property_id,
      unit_number: unit.unit_number,
      bedrooms: unit.bedrooms.toString(),
      bathrooms: unit.bathrooms.toString(),
      square_feet: unit.square_feet?.toString() || '',
      rent_amount: unit.rent_amount.toString(),
      deposit_amount: unit.deposit_amount.toString(),
      status: unit.status,
      amenities: Array.isArray(unit.amenities) ? unit.amenities.join(', ') : (unit.amenities || ''),
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (unitId: string) => {
    setDeletingUnitId(unitId);
    setIsDeleteModalOpen(true);
  };

  // Helper function to get property name by ID
  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalUnits = units.length;
    const availableUnits = units.filter(unit => unit.status === 'available').length;
    const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
    const maintenanceUnits = units.filter(unit => unit.status === 'maintenance').length;
    const totalRentRoll = units
      .filter(unit => unit.status === 'occupied')
      .reduce((sum, unit) => sum + unit.rent_amount, 0);

    return {
      totalUnits,
      availableUnits,
      occupiedUnits,
      maintenanceUnits,
      totalRentRoll,
    };
  }, [units]);

  const columns: Column<Unit>[] = useMemo(
    () => [
      {
        key: 'unit_number',
        label: 'Unit #',
        sortable: true,
        filterable: true,
        render: (value: string) => (
          <div className="font-medium">
            {value}
          </div>
        )
      },
      {
        key: 'property_name',
        label: 'Property',
        sortable: true,
        filterable: true,
        render: (value: string, unit: Unit) => (
          <div className="font-medium">
            {getPropertyName(unit.property_id)}
          </div>
        )
      },
      {
        key: 'bedrooms',
        label: 'Beds/Baths',
        sortable: true,
        render: (value: number, unit: Unit) => (
          <div className="text-sm">
            {unit.bedrooms} bed / {unit.bathrooms} bath
          </div>
        )
      },
      {
        key: 'rent_amount',
        label: 'Rent',
        sortable: true,
        render: (value: number) => (
          <div className="text-right font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)}
          </div>
        )
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        filterable: true,
        render: (value: string) => {
          const color = STATUS_COLORS[value as keyof typeof STATUS_COLORS] || 'default';
          const label = UNIT_STATUSES.find(s => s.value === value)?.label || value;
          
          return (
            <Badge variant={color as any}>
              {label}
            </Badge>
          );
        }
      }
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading units...</p>
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Units</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => fetchUnits()}
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
          <h1 className="text-3xl font-bold text-gray-900">Units</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your rental units
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Unit</DialogTitle>
              <DialogDescription>
                Add a new rental unit. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-property_id">Property *</Label>
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
                  <Label htmlFor="create-unit_number">Unit Number *</Label>
                  <Input
                    id="create-unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    placeholder="Enter unit number"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="create-bedrooms">Bedrooms *</Label>
                  <Input
                    id="create-bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    placeholder="Number of bedrooms"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="create-bathrooms">Bathrooms *</Label>
                  <Input
                    id="create-bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    placeholder="Number of bathrooms"
                    min="0"
                    step="0.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="create-square_feet">Square Feet</Label>
                  <Input
                    id="create-square_feet"
                    type="number"
                    value={formData.square_feet}
                    onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
                    placeholder="Square footage"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="create-rent_amount">Rent Amount *</Label>
                  <Input
                    id="create-rent_amount"
                    type="number"
                    value={formData.rent_amount}
                    onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                    placeholder="Monthly rent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="create-deposit_amount">Deposit Amount *</Label>
                  <Input
                    id="create-deposit_amount"
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                    placeholder="Security deposit"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="create-status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="create-amenities">Amenities</Label>
                  <Input
                    id="create-amenities"
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    placeholder="Enter amenities (comma-separated)"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Unit'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Units</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalUnits}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.availableUnits}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Occupied</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.occupiedUnits}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Maintenance</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.maintenanceUnits}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rent Roll</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRentRoll)}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <DataTable
          data={units}
          columns={columns}
          searchable={true}
          filterable={true}
          sortable={true}
          pagination={true}
          pageSize={10}
          exportable={true}
          onExport={() => {
            // Export functionality
            console.log('Exporting units...');
          }}
          actions={{
            view: (unit) => console.log('View unit:', unit),
            edit: (unit) => openEditModal(unit),
            delete: (unit) => openDeleteModal(unit.id)
          }}
          loading={loading}
          emptyMessage="No units found"
        />
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update the unit information. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUnit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-property_id">Property *</Label>
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
                <Label htmlFor="edit-unit_number">Unit Number *</Label>
                <Input
                  id="edit-unit_number"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="Enter unit number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-bedrooms">Bedrooms *</Label>
                <Input
                  id="edit-bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="Number of bedrooms"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-bathrooms">Bathrooms *</Label>
                <Input
                  id="edit-bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="Number of bathrooms"
                  min="0"
                  step="0.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-square_feet">Square Feet</Label>
                <Input
                  id="edit-square_feet"
                  type="number"
                  value={formData.square_feet}
                  onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
                  placeholder="Square footage"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="edit-rent_amount">Rent Amount *</Label>
                <Input
                  id="edit-rent_amount"
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                  placeholder="Monthly rent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-deposit_amount">Deposit Amount *</Label>
                <Input
                  id="edit-deposit_amount"
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  placeholder="Security deposit"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-amenities">Amenities</Label>
                <Input
                  id="edit-amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="Enter amenities (comma-separated)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditModalOpen(false);
                setEditingUnit(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update Unit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this unit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUnit} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
