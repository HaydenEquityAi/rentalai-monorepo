"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  AlertTriangle, 
  FileText, 
  Shield, 
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Eye,
  Edit,
  Send,
  RefreshCw,
  AlertCircle,
  Info,
  Building2,
  Home,
  ClipboardCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { hudService } from '@/services/hud.service';
import { 
  TenantIncomeCertification, 
  REACInspection, 
  CertificationType, 
  CertificationStatus,
  InspectionType,
  InspectionStatus
} from '@/types/hud';

interface DashboardMetrics {
  totalCertifications: number;
  expiringSoon: number;
  pendingSubmissions: number;
  lastREACScore: number;
  complianceRate: number;
}

interface ComplianceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action?: string;
}

interface CertificationSummary {
  property: string;
  unit: string;
  tenant: string;
  type: CertificationType;
  status: CertificationStatus;
  effectiveDate: string;
  expirationDate: string;
  daysUntilExpiry: number;
}

interface InspectionSummary {
  property: string;
  inspectionDate: string;
  type: InspectionType;
  overallScore: number;
  status: InspectionStatus;
  deficiencies: number;
}

export default function HUDComplianceDashboard() {
  const [certifications, setCertifications] = useState<TenantIncomeCertification[]>([]);
  const [inspections, setInspections] = useState<REACInspection[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [certificationSummary, setCertificationSummary] = useState<CertificationSummary[]>([]);
  const [inspectionSummary, setInspectionSummary] = useState<InspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('certifications');

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [certificationsData, inspectionsData] = await Promise.all([
        hudService.getCertifications(),
        hudService.getInspections()
      ]);

      setCertifications(certificationsData);
      setInspections(inspectionsData);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(certificationsData, inspectionsData);
      setMetrics(calculatedMetrics);

      // Generate alerts
      const alertsData = generateAlerts(certificationsData, inspectionsData);
      setAlerts(alertsData);

      // Generate summaries
      const certSummary = generateCertificationSummary(certificationsData);
      setCertificationSummary(certSummary);

      const inspSummary = generateInspectionSummary(inspectionsData);
      setInspectionSummary(inspSummary);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load compliance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate expiration date (1 year from effective_date)
  const getExpirationDate = (effectiveDate: string): Date => {
    const effective = new Date(effectiveDate);
    const expiration = new Date(effective);
    expiration.setFullYear(expiration.getFullYear() + 1);
    return expiration;
  };

  // Calculate key metrics
  const calculateMetrics = (certs: TenantIncomeCertification[], insp: REACInspection[]): DashboardMetrics => {
    const totalCertifications = certs.length;
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringSoon = certs.filter(cert => {
      const expiryDate = getExpirationDate(cert.effective_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate > today;
    }).length;

    const pendingSubmissions = certs.filter(cert => cert.status === 'PENDING').length;
    
    const lastInspection = insp.sort((a, b) => 
      new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime()
    )[0];
    
    const lastREACScore = lastInspection ? lastInspection.overall_score : 0;
    
    const currentCerts = certs.filter(cert => {
      const expiryDate = getExpirationDate(cert.effective_date);
      return expiryDate > today;
    }).length;
    
    const complianceRate = totalCertifications > 0 ? (currentCerts / totalCertifications) * 100 : 0;

    return {
      totalCertifications,
      expiringSoon,
      pendingSubmissions,
      lastREACScore,
      complianceRate
    };
  };

  // Generate compliance alerts
  const generateAlerts = (certs: TenantIncomeCertification[], insp: REACInspection[]): ComplianceAlert[] => {
    const alerts: ComplianceAlert[] = [];
    const today = new Date();

    // Overdue certifications
    const overdueCerts = certs.filter(cert => {
      const expiryDate = getExpirationDate(cert.effective_date);
      return expiryDate < today && cert.status !== 'APPROVED';
    });

    if (overdueCerts.length > 0) {
      alerts.push({
        id: 'overdue',
        type: 'error',
        title: 'Overdue Certifications',
        description: 'Certifications that have expired and need immediate attention',
        count: overdueCerts.length,
        action: 'Review Now'
      });
    }

    // Expiring soon certifications
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = certs.filter(cert => {
      const expiryDate = getExpirationDate(cert.effective_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate > today;
    });

    if (expiringSoon.length > 0) {
      alerts.push({
        id: 'expiring',
        type: 'warning',
        title: 'Certifications Expiring Soon',
        description: 'Certifications that will expire within 30 days',
        count: expiringSoon.length,
        action: 'Start Renewal'
      });
    }

    // Upcoming inspections
    const upcomingInspections = insp.filter(inspection => {
      const inspectionDate = new Date(inspection.inspection_date);
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return inspectionDate <= thirtyDaysFromNow && inspectionDate > today;
    });

    if (upcomingInspections.length > 0) {
      alerts.push({
        id: 'inspections',
        type: 'info',
        title: 'Upcoming Inspections',
        description: 'REAC inspections scheduled within 30 days',
        count: upcomingInspections.length,
        action: 'Prepare'
      });
    }

    return alerts;
  };

  // Generate certification summary
  const generateCertificationSummary = (certs: TenantIncomeCertification[]): CertificationSummary[] => {
    return certs.map(cert => {
      const today = new Date();
      const expiryDate = getExpirationDate(cert.effective_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        property: cert.property_name || 'Unknown Property',
        unit: cert.unit_number || 'N/A',
        tenant: cert.tenant_name || 'Unknown Tenant',
        type: cert.certification_type,
        status: cert.status,
        effectiveDate: cert.effective_date,
        expirationDate: expiryDate.toISOString(),
        daysUntilExpiry
      };
    });
  };

  // Generate inspection summary
  const generateInspectionSummary = (insp: REACInspection[]): InspectionSummary[] => {
    return insp.map(inspection => ({
      property: inspection.property_name || 'Unknown Property',
      inspectionDate: inspection.inspection_date,
      type: inspection.inspection_type,
      overallScore: inspection.overall_score,
      status: inspection.status,
      deficiencies: inspection.deficiencies_count || 0
    }));
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get certification type color
  const getCertificationTypeColor = (type: CertificationType): string => {
    switch (type) {
      case 'ANNUAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INTERIM':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'INITIAL':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get certification status color
  const getCertificationStatusColor = (status: CertificationStatus): string => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get inspection status color
  const getInspectionStatusColor = (status: InspectionStatus): string => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CONDITIONAL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get alert icon
  const getAlertIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={fetchDashboardData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HUD Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Manage 85 subsidized units and ensure HUD compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Certification
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Certifications */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-blue-600">Total Certifications</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-700">
              {metrics?.totalCertifications || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active income certifications
            </p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-red-600">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-red-700">
              {metrics?.expiringSoon || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>

        {/* Pending Submissions */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending 50059</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-yellow-700">
              {metrics?.pendingSubmissions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting submission
            </p>
          </CardContent>
        </Card>

        {/* Last REAC Score */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-green-600">Last REAC Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-2xl font-bold ${getScoreColor(metrics?.lastREACScore || 0)}`}>
              {metrics?.lastREACScore || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall inspection score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="inspections">REAC Inspections</TabsTrigger>
          <TabsTrigger value="alerts">Compliance Alerts</TabsTrigger>
        </TabsList>

        {/* Certifications Tab */}
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Income Certifications ({certificationSummary.length})
              </CardTitle>
              <CardDescription>
                All tenant income certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Expiration Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificationSummary.map((cert, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{cert.tenant}</TableCell>
                        <TableCell>{cert.property}</TableCell>
                        <TableCell className="font-mono">{cert.unit}</TableCell>
                        <TableCell>
                          <Badge className={getCertificationTypeColor(cert.type)}>
                            {cert.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCertificationStatusColor(cert.status)}>
                            {cert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(cert.effectiveDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {formatDate(cert.expirationDate)}
                            {cert.daysUntilExpiry < 30 && (
                              <Badge variant="outline" className="text-red-600 border-red-200">
                                {cert.daysUntilExpiry}d
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {cert.status === 'PENDING' && (
                              <Button variant="ghost" size="sm" className="text-green-600">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Certifications Expiring Soon ({certificationSummary.filter(c => c.daysUntilExpiry < 30).length})
              </CardTitle>
              <CardDescription>
                Certifications that need renewal within 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Days Until Expiry</TableHead>
                      <TableHead>Expiration Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificationSummary
                      .filter(cert => cert.daysUntilExpiry < 30)
                      .map((cert, index) => (
                        <TableRow 
                          key={index} 
                          className={`hover:bg-muted/50 ${cert.daysUntilExpiry < 0 ? 'bg-red-50' : 'bg-yellow-50'}`}
                        >
                          <TableCell className="font-medium">{cert.tenant}</TableCell>
                          <TableCell>{cert.property}</TableCell>
                          <TableCell className="font-mono">{cert.unit}</TableCell>
                          <TableCell>
                            <Badge className={getCertificationTypeColor(cert.type)}>
                              {cert.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cert.daysUntilExpiry < 0 ? 'text-red-600 border-red-200' : 'text-yellow-600 border-yellow-200'}
                            >
                              {cert.daysUntilExpiry < 0 ? 'Overdue' : `${cert.daysUntilExpiry} days`}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(cert.expirationDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Start Renewal
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REAC Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                REAC Inspections ({inspectionSummary.length})
              </CardTitle>
              <CardDescription>
                Inspection history and scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Inspection Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Overall Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deficiencies</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectionSummary.map((inspection, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{inspection.property}</TableCell>
                        <TableCell>{formatDate(inspection.inspectionDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inspection.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${getScoreColor(inspection.overallScore)}`}>
                              {inspection.overallScore}
                            </span>
                            <Progress 
                              value={inspection.overallScore} 
                              className="w-16 h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getInspectionStatusColor(inspection.status)}>
                            {inspection.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inspection.deficiencies}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Compliance Alerts ({alerts.length})
              </CardTitle>
              <CardDescription>
                Important compliance notices and actions required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <strong>{alert.title}</strong> - {alert.description}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{alert.count}</Badge>
                              {alert.action && (
                                <Button size="sm" variant="outline">
                                  {alert.action}
                                </Button>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">All Good!</p>
                    <p>No compliance alerts at this time.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common HUD compliance tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Certification
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Record Inspection
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Compliance Score Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Score</CardTitle>
            <CardDescription>
              Overall compliance rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Certifications</span>
                <span className="text-sm text-muted-foreground">
                  {metrics?.complianceRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics?.complianceRate || 0} className="h-3" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.complianceRate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Compliance Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
