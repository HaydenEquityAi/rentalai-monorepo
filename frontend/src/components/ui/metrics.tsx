"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  Receipt
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  loading?: boolean;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500/10 to-blue-600/10',
    text: 'text-blue-600',
    value: 'text-blue-700',
    icon: 'text-blue-600'
  },
  green: {
    bg: 'from-green-500/10 to-green-600/10',
    text: 'text-green-600',
    value: 'text-green-700',
    icon: 'text-green-600'
  },
  red: {
    bg: 'from-red-500/10 to-red-600/10',
    text: 'text-red-600',
    value: 'text-red-700',
    icon: 'text-red-600'
  },
  yellow: {
    bg: 'from-yellow-500/10 to-yellow-600/10',
    text: 'text-yellow-600',
    value: 'text-yellow-700',
    icon: 'text-yellow-600'
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/10',
    text: 'text-purple-600',
    value: 'text-purple-700',
    icon: 'text-purple-600'
  },
  gray: {
    bg: 'from-gray-500/10 to-gray-600/10',
    text: 'text-gray-600',
    value: 'text-gray-700',
    icon: 'text-gray-600'
  }
};

export function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon,
  color = 'blue',
  loading = false,
  className = ''
}: MetricCardProps) {
  const colors = colorClasses[color];

  if (loading) {
    return (
      <Card className={`relative overflow-hidden ${className}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="relative">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className={`text-sm font-medium ${colors.text}`}>
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {icon && <div className={colors.icon}>{icon}</div>}
          {trend && getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className={`text-2xl font-bold ${colors.value}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trendValue && (
          <p className="text-xs text-muted-foreground mt-1">
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressCardProps {
  title: string;
  value: number;
  max?: number;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  className?: string;
}

export function ProgressCard({
  title,
  value,
  max = 100,
  description,
  color = 'blue',
  className = ''
}: ProgressCardProps) {
  const percentage = (value / max) * 100;

  const getColorClass = () => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'purple':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-sm text-muted-foreground">
              {percentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  count?: number;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export function AlertCard({
  type,
  title,
  description,
  count,
  action,
  onAction,
  className = ''
}: AlertCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className={`border-l-4 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                {count !== undefined && (
                  <Badge variant="outline">{count}</Badge>
                )}
                {action && onAction && (
                  <Button size="sm" variant="outline" onClick={onAction}>
                    {action}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  }>;
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  actions,
  className = ''
}: QuickActionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            className="w-full justify-start"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
