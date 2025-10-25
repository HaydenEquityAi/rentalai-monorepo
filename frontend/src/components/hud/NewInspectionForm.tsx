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
import { CalendarIcon, AlertCircle, Building2, Shield, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { hudService } from '@/services/hud.service';
import { 
  CreateREACInspectionRequest,
  InspectionType,
  InspectionStatus
} from '@/types/hud';

const inspectionSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  inspection_date: z.date({ required_error: 'Inspection date is required' }),
  inspection_type: z.enum(['initial', 'annual', 'complaint', 'special'] as const),
  inspector_name: z.string().min(1, 'Inspector name is required'),
  overall_score: z.number().min(0).max(100).optional(),
  inspection_status: z.enum(['passed', 'failed', 'conditional', 'pending'] as const),
  deficiencies_count: z.number().min(0).optional(),
  notes: z.string().optional()
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

interface NewInspectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewInspectionForm({ onSuccess, onCancel }: NewInspectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      inspection_type: 'annual',
      inspection_status: 'pending',
      overall_score: undefined,
      deficiencies_count: 0
    }
  });

  // Load initial data
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      // Mock data - replace with actual API call
      setProperties([
        { id: '1', name: 'Sunset Apartments', address: '123 Main St' },
        { id: '2', name: 'Oak Gardens', address: '456 Oak Ave' },
        { id: '3', name: 'Pine Manor', address: '789 Pine St' }
      ]);
    } catch (err) {
      console.error('Error loading properties:', err);
    }
  };

  const onSubmit = async (data: InspectionFormData) => {
    try {
      setLoading(true);
      setError(null);

      const inspectionData: CreateREACInspectionRequest = {
        ...data,
        inspection_date: data.inspection_date.toISOString(),
        overall_score: data.overall_score || undefined,
        deficiencies_count: data.deficiencies_count || 0
      };

      await hudService.createInspection(inspectionData);
      
      reset();
      onSuccess();
    } catch (err: any) {
      console.error('Error creating inspection:', err);
      setError(err.message || 'Failed to create inspection');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
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
        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="property_id" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Property *
          </Label>
          <Select onValueChange={(value) => setValue('property_id', value)}>
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

        {/* Inspection Type */}
        <div className="space-y-2">
          <Label htmlFor="inspection_type" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Inspection Type *
          </Label>
          <Select onValueChange={(value) => setValue('inspection_type', value as InspectionType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial">Initial</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="special">Special</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
            </SelectContent>
          </Select>
          {errors.inspection_type && (
            <p className="text-sm text-red-600">{errors.inspection_type.message}</p>
          )}
        </div>

        {/* Inspection Date */}
        <div className="space-y-2">
          <Label>Inspection Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watch('inspection_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watch('inspection_date') ? (
                  format(watch('inspection_date'), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('inspection_date')}
                onSelect={(date) => date && setValue('inspection_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.inspection_date && (
            <p className="text-sm text-red-600">{errors.inspection_date.message}</p>
          )}
        </div>

        {/* Inspector Name */}
        <div className="space-y-2">
          <Label htmlFor="inspector_name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Inspector Name *
          </Label>
          <Input
            id="inspector_name"
            placeholder="Enter inspector name"
            {...register('inspector_name')}
          />
          {errors.inspector_name && (
            <p className="text-sm text-red-600">{errors.inspector_name.message}</p>
          )}
        </div>

        {/* Overall Score */}
        <div className="space-y-2">
          <Label htmlFor="overall_score">Overall Score (0-100)</Label>
          <Input
            id="overall_score"
            type="number"
            min="0"
            max="100"
            placeholder="Enter score"
            {...register('overall_score', { valueAsNumber: true })}
          />
          {watch('overall_score') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score:</span>
              <span className={`font-semibold ${getScoreColor(watch('overall_score') || 0)}`}>
                {watch('overall_score')}/100
              </span>
            </div>
          )}
          {errors.overall_score && (
            <p className="text-sm text-red-600">{errors.overall_score.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="inspection_status">Status</Label>
          <Select onValueChange={(value) => setValue('inspection_status', value as InspectionStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="conditional">Conditional</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          {errors.inspection_status && (
            <p className="text-sm text-red-600">{errors.inspection_status.message}</p>
          )}
        </div>

        {/* Deficiencies Count */}
        <div className="space-y-2">
          <Label htmlFor="deficiencies_count">Deficiencies Count</Label>
          <Input
            id="deficiencies_count"
            type="number"
            min="0"
            placeholder="Enter count"
            {...register('deficiencies_count', { valueAsNumber: true })}
          />
          {errors.deficiencies_count && (
            <p className="text-sm text-red-600">{errors.deficiencies_count.message}</p>
          )}
        </div>
      </div>

      {/* Inspection Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Inspection Details
          </CardTitle>
          <CardDescription>
            Additional information about the inspection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Interpretation */}
          {watch('overall_score') && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Score Interpretation</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>90-100: High Performer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>80-89: Standard Performer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>0-79: Substandard Performer</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the inspection..."
              rows={4}
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
          {loading ? 'Recording...' : 'Record Inspection'}
        </Button>
      </div>
    </form>
  );
}
