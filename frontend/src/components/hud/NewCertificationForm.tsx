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
import { CalendarIcon, AlertCircle, Users, DollarSign, Building2, Home } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { hudService } from '@/services/hud.service';
import { 
  CreateTenantIncomeCertificationRequest,
  CertificationType,
  CertificationStatus
} from '@/types/hud';

const certificationSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  property_id: z.string().min(1, 'Property is required'),
  unit_id: z.string().min(1, 'Unit is required'),
  certification_date: z.date({ required_error: 'Certification date is required' }),
  effective_date: z.date({ required_error: 'Effective date is required' }),
  cert_type: z.enum(['initial', 'annual', 'interim', 'other'] as const),
  household_size: z.number().min(1, 'Household size must be at least 1'),
  annual_income: z.string().min(1, 'Annual income is required'),
  adjusted_income: z.string().min(1, 'Adjusted income is required'),
  tenant_rent_portion: z.string().min(1, 'Tenant rent portion is required'),
  utility_allowance: z.string().min(1, 'Utility allowance is required'),
  subsidy_amount: z.string().min(1, 'Subsidy amount is required'),
  certification_status: z.enum(['draft', 'submitted', 'approved', 'rejected'] as const),
  notes: z.string().optional()
});

type CertificationFormData = z.infer<typeof certificationSchema>;

interface NewCertificationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewCertificationForm({ onSuccess, onCancel }: NewCertificationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      cert_type: 'annual',
      certification_status: 'draft',
      household_size: 1,
      annual_income: '0',
      adjusted_income: '0',
      tenant_rent_portion: '0',
      utility_allowance: '0',
      subsidy_amount: '0'
    }
  });

  const watchedProperty = watch('property_id');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load units when property changes
  useEffect(() => {
    if (watchedProperty) {
      loadUnits(watchedProperty);
    }
  }, [watchedProperty]);

  const loadInitialData = async () => {
    try {
      // Mock data - replace with actual API calls
      setTenants([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ]);
      
      setProperties([
        { id: '1', name: 'Sunset Apartments', address: '123 Main St' },
        { id: '2', name: 'Oak Gardens', address: '456 Oak Ave' }
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadUnits = async (propertyId: string) => {
    try {
      // Mock data - replace with actual API call
      setUnits([
        { id: '1', number: '101', bedrooms: 1, bathrooms: 1 },
        { id: '2', number: '102', bedrooms: 2, bathrooms: 1 },
        { id: '3', number: '201', bedrooms: 1, bathrooms: 1 },
        { id: '4', number: '202', bedrooms: 2, bathrooms: 2 }
      ]);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const onSubmit = async (data: CertificationFormData) => {
    try {
      setLoading(true);
      setError(null);

      const certificationData: CreateTenantIncomeCertificationRequest = {
        ...data,
        certification_date: data.certification_date.toISOString(),
        effective_date: data.effective_date.toISOString(),
        annual_income: data.annual_income,
        adjusted_income: data.adjusted_income,
        tenant_rent_portion: data.tenant_rent_portion,
        utility_allowance: data.utility_allowance,
        subsidy_amount: data.subsidy_amount
      };

      await hudService.createCertification(certificationData);
      
      reset();
      onSuccess();
    } catch (err: any) {
      console.error('Error creating certification:', err);
      setError(err.message || 'Failed to create certification');
    } finally {
      setLoading(false);
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
            <Users className="h-4 w-4" />
            Tenant *
          </Label>
          <Select onValueChange={(value) => setValue('tenant_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tenant_id && (
            <p className="text-sm text-red-600">{errors.tenant_id.message}</p>
          )}
        </div>

        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="property_id" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Property *
          </Label>
          <Select onValueChange={(value) => {
            setValue('property_id', value);
            setSelectedProperty(value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.property_id && (
            <p className="text-sm text-red-600">{errors.property_id.message}</p>
          )}
        </div>

        {/* Unit Selection */}
        <div className="space-y-2">
          <Label htmlFor="unit_id" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Unit *
          </Label>
          <Select onValueChange={(value) => setValue('unit_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  Unit {unit.number} ({unit.bedrooms}BR/{unit.bathrooms}BA)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit_id && (
            <p className="text-sm text-red-600">{errors.unit_id.message}</p>
          )}
        </div>

        {/* Certification Type */}
        <div className="space-y-2">
          <Label htmlFor="cert_type">Certification Type *</Label>
          <Select onValueChange={(value) => setValue('cert_type', value as CertificationType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial">Initial</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="interim">Interim</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.cert_type && (
            <p className="text-sm text-red-600">{errors.cert_type.message}</p>
          )}
        </div>

        {/* Certification Date */}
        <div className="space-y-2">
          <Label>Certification Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('certification_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('certification_date') ? (
                  format(watch('certification_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('certification_date')}
                onSelect={(date) => date && setValue('certification_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.certification_date && (
            <p className="text-sm text-red-600">{errors.certification_date.message}</p>
          )}
        </div>

        {/* Effective Date */}
        <div className="space-y-2">
          <Label>Effective Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('effective_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('effective_date') ? (
                  format(watch('effective_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('effective_date')}
                onSelect={(date) => date && setValue('effective_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.effective_date && (
            <p className="text-sm text-red-600">{errors.effective_date.message}</p>
          )}
        </div>

        {/* Household Size */}
        <div className="space-y-2">
          <Label htmlFor="household_size">Household Size *</Label>
          <Input
            id="household_size"
            type="number"
            min="1"
            {...register('household_size', { valueAsNumber: true })}
          />
          {errors.household_size && (
            <p className="text-sm text-red-600">{errors.household_size.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="certification_status">Status</Label>
          <Select onValueChange={(value) => setValue('certification_status', value as CertificationStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {errors.certification_status && (
            <p className="text-sm text-red-600">{errors.certification_status.message}</p>
          )}
        </div>
      </div>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Information
          </CardTitle>
          <CardDescription>
            Income and rent calculation details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annual_income">Annual Income *</Label>
              <Input
                id="annual_income"
                type="number"
                step="0.01"
                {...register('annual_income')}
              />
              {errors.annual_income && (
                <p className="text-sm text-red-600">{errors.annual_income.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjusted_income">Adjusted Income *</Label>
              <Input
                id="adjusted_income"
                type="number"
                step="0.01"
                {...register('adjusted_income')}
              />
              {errors.adjusted_income && (
                <p className="text-sm text-red-600">{errors.adjusted_income.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant_rent_portion">Tenant Rent Portion *</Label>
              <Input
                id="tenant_rent_portion"
                type="number"
                step="0.01"
                {...register('tenant_rent_portion')}
              />
              {errors.tenant_rent_portion && (
                <p className="text-sm text-red-600">{errors.tenant_rent_portion.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="utility_allowance">Utility Allowance *</Label>
              <Input
                id="utility_allowance"
                type="number"
                step="0.01"
                {...register('utility_allowance')}
              />
              {errors.utility_allowance && (
                <p className="text-sm text-red-600">{errors.utility_allowance.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subsidy_amount">Subsidy Amount *</Label>
              <Input
                id="subsidy_amount"
                type="number"
                step="0.01"
                {...register('subsidy_amount')}
              />
              {errors.subsidy_amount && (
                <p className="text-sm text-red-600">{errors.subsidy_amount.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes or comments..."
          {...register('notes')}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Certification'}
        </Button>
      </div>
    </form>
  );
}
