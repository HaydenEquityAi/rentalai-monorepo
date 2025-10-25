"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ReportCardProps {
  title: string;
  description: string;
  type: 'pdf' | 'excel' | 'csv';
  onGenerate: () => void;
  loading?: boolean;
  className?: string;
}

export function ReportCard({
  title,
  description,
  type,
  onGenerate,
  loading = false,
  className = ''
}: ReportCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <Download className="h-4 w-4" />;
      case 'csv':
        return <Download className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'excel':
        return 'bg-green-100 text-green-800';
      case 'csv':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge className={getTypeColor()}>
            {type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onGenerate} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            getIcon()
          )}
          <span className="ml-2">
            {loading ? 'Generating...' : `Generate ${type.toUpperCase()}`}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}

interface ReportDropdownProps {
  reports: Array<{
    label: string;
    type: 'pdf' | 'excel';
    onGenerate: () => void;
    loading?: boolean;
  }>;
  trigger?: React.ReactNode;
}

export function ReportDropdown({ reports, trigger }: ReportDropdownProps) {
  const defaultTrigger = (
    <Button variant="outline">
      <FileText className="h-4 w-4 mr-2" />
      Generate Report
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {reports.map((report, index) => (
          <DropdownMenuItem
            key={index}
            onClick={report.onGenerate}
            disabled={report.loading}
          >
            {report.loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            <span className="flex-1">{report.label}</span>
            <Badge variant="outline" className="ml-2">
              {report.type.toUpperCase()}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  label,
  icon,
  onClick,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  className = ''
}: ActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        icon
      )}
      <span className="ml-2">{label}</span>
    </Button>
  );
}

interface TableActionMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCustom?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
}

export function TableActionMenu({ onView, onEdit, onDelete, onCustom }: TableActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        {onCustom?.map((action, index) => (
          <DropdownMenuItem key={index} onClick={action.onClick}>
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: Array<{
    key: string;
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onValueChange: (value: string) => void;
  }>;
  onClearFilters: () => void;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  filters,
  onClearFilters,
  className = ''
}: FilterBarProps) {
  return (
    <div className={`flex items-center gap-4 p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onValueChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All {filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      
      <Button variant="outline" size="sm" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  );
}
