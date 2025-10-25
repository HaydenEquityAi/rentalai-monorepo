"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  ClipboardCheck,
  Download,
  MoreHorizontal
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
import { Modal } from '@/components/ui/modal';
import { DataTable, Column } from '@/components/ui/data-table';
import { MetricCard, AlertCard, QuickActionCard } from '@/components/ui/metrics';
import { ReportDropdown, ActionButton, TableActionMenu } from '@/components/ui/actions';
import { useToast } from '@/components/ui/toast';
import { NewCertificationForm } from '@/components/hud/NewCertificationForm';
import { NewInspectionForm } from '@/components/hud/NewInspectionForm';

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
  
  // Modal states
  const [showNewCertification, setShowNewCertification] = useState(false);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  
  const { success, error: showError } = useToast();

  // Define table columns
  const certificationColumns: Column<CertificationSummary>[] = [
    {
      key: 'tenant',
      label: 'Tenant',
      sortable: true,
      filterable: true
    },
    {
      key: 'property',
      label: 'Property',
      sortable: true,
      filterable: true
    },
    {
      key: 'unit',
      label: 'Unit',
      sortable: true,
      filterable: true
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: CertificationType) => (
        <Badge className={getCertificationTypeColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (value: CertificationStatus) => (
        <Badge className={getCertificationStatusColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'effectiveDate',
      label: 'Effective Date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'expirationDate',
      label: 'Expiration Date',
      sortable: true,
      render: (value: string, row: CertificationSummary) => (
        <div className="flex items-center gap-2">
          {formatDate(value)}
          {row.daysUntilExpiry < 30 && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              {row.daysUntilExpiry}d
            </Badge>
          )}
        </div>
      )
    }
  ];

  const inspectionColumns: Column<InspectionSummary>[] = [
    {
      key: 'property',
      label: 'Property',
      sortable: true,
      filterable: true
    },
    {
      key: 'inspectionDate',
      label: 'Inspection Date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: InspectionType) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    {
      key: 'overallScore',
      label: 'Overall Score',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${getScoreColor(value)}`}>
            {value}
          </span>
          <Progress value={value} className="w-16 h-2" />
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (value: InspectionStatus) => (
        <Badge className={getInspectionStatusColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'deficiencies',
      label: 'Deficiencies',
      sortable: true,
      render: (value: number) => (
        <Badge variant="outline">{value}</Badge>
      )
    }
  ];

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
      showError('Failed to load compliance data', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form success
  const handleCertificationSuccess = () => {
    setShowNewCertification(false);
    success('Certification Created', 'New income certification has been created successfully.');
    fetchDashboardData();
  };

  const handleInspectionSuccess = () => {
    setShowNewInspection(false);
    success('Inspection Recorded', 'New REAC inspection has been recorded successfully.');
    fetchDashboardData();
  };

  // Handle report generation
  const handleGenerateReport = async (reportType: string) => {
    try {
      setReportLoading(reportType);
      
      // Mock report generation - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      success('Report Generated', `${reportType} report has been generated and downloaded.`);
    } catch (err) {
      showError('Report Generation Failed', 'Failed to generate report. Please try again.');
    } finally {
      setReportLoading(null);
    }
  };

  // Handle table actions
  const handleViewCertification = (cert: CertificationSummary) => {
    // Implement view certification logic
    console.log('View certification:', cert);
  };

  const handleEditCertification = (cert: CertificationSummary) => {
    // Implement edit certification logic
    console.log('Edit certification:', cert);
  };

  const handleSubmitCertification = async (cert: CertificationSummary) => {
    try {
      // Implement submit certification logic
      await hudService.submitHUD50059(cert.property);
      success('Certification Submitted', 'HUD 50059 form has been submitted successfully.');
      fetchDashboardData();
    } catch (err) {
      showError('Submission Failed', 'Failed to submit certification. Please try again.');
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

    const pendingSubmissions = certs.filter(cert => cert.certification_status === 'pending').length;
    
    const lastInspection = insp.sort((a, b) => 
      new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime()
    )[0];
    
    const lastREACScore = lastInspection ? (lastInspection.overall_score ?? 0) : 0;
    
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
      return expiryDate < today && cert.certification_status !== 'approved';
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
        property: `Property ${cert.property_id}`,
        unit: cert.unit_id ? `Unit ${cert.unit_id}` : 'N/A',
        tenant: `Tenant ${cert.tenant_id}`,
        type: cert.cert_type,
        status: cert.certification_status,
        effectiveDate: cert.effective_date,
        expirationDate: expiryDate.toISOString(),
        daysUntilExpiry
      };
    });
  };

  // Generate inspection summary
  const generateInspectionSummary = (insp: REACInspection[]): InspectionSummary[] => {
    return insp.map(inspection => ({
      property: `Property ${inspection.property_id}`,
      inspectionDate: inspection.inspection_date,
      type: inspection.inspection_type,
      overallScore: inspection.overall_score ?? 0,
      status: inspection.inspection_status,
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
      case 'annual':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'interim':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'initial':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get certification status color
  const getCertificationStatusColor = (status: CertificationStatus): string => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get inspection status color
  const getInspectionStatusColor = (status: InspectionStatus): string => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
          <ActionButton
            label="Refresh"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchDashboardData}
            variant="outline"
          />
          <ActionButton
            label="New Certification"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowNewCertification(true)}
          />
          <ActionButton
            label="Record Inspection"
            icon={<ClipboardCheck className="h-4 w-4" />}
            onClick={() => setShowNewInspection(true)}
            variant="outline"
          />
          <ReportDropdown
            reports={[
              {
                label: 'All Certifications',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('All Certifications'),
                loading: reportLoading === 'All Certifications'
              },
              {
                label: 'Expiring Certifications',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Expiring Certifications'),
                loading: reportLoading === 'Expiring Certifications'
              },
              {
                label: 'REAC Inspection History',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('REAC Inspection History'),
                loading: reportLoading === 'REAC Inspection History'
              },
              {
                label: 'Compliance Summary',
                type: 'pdf',
                onGenerate: () => handleGenerateReport('Compliance Summary'),
                loading: reportLoading === 'Compliance Summary'
              }
            ]}
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Certifications"
          value={metrics?.totalCertifications || 0}
          description="Active income certifications"
          icon={<Users className="h-4 w-4" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Expiring Soon"
          value={metrics?.expiringSoon || 0}
          description="Within 30 days"
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
          loading={loading}
        />
        
        <MetricCard
          title="Pending 50059"
          value={metrics?.pendingSubmissions || 0}
          description="Awaiting submission"
          icon={<FileText className="h-4 w-4" />}
          color="yellow"
          loading={loading}
        />
        
        <MetricCard
          title="Last REAC Score"
          value={metrics?.lastREACScore || 0}
          description="Overall inspection score"
          icon={<Shield className="h-4 w-4" />}
          color="green"
          loading={loading}
        />
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
          <DataTable
            data={certificationSummary}
            columns={certificationColumns}
            searchable={true}
            filterable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            onExport={() => handleGenerateReport('Certifications Export')}
            actions={{
              view: handleViewCertification,
              edit: handleEditCertification,
              delete: (cert) => {
                if (cert.status === 'pending') {
                  handleSubmitCertification(cert);
                }
              }
            }}
            loading={loading}
            emptyMessage="No certifications found"
          />
        </TabsContent>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring" className="space-y-4">
          <DataTable
            data={certificationSummary.filter(c => c.daysUntilExpiry < 30)}
            columns={certificationColumns}
            searchable={true}
            filterable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            onExport={() => handleGenerateReport('Expiring Certifications Export')}
            actions={{
              view: handleViewCertification,
              edit: handleEditCertification
            }}
            loading={loading}
            emptyMessage="No certifications expiring soon"
          />
        </TabsContent>

        {/* REAC Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <DataTable
            data={inspectionSummary}
            columns={inspectionColumns}
            searchable={true}
            filterable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            onExport={() => handleGenerateReport('Inspections Export')}
            actions={{
              view: (inspection) => console.log('View inspection:', inspection),
              edit: (inspection) => console.log('Edit inspection:', inspection)
            }}
            loading={loading}
            emptyMessage="No inspections found"
          />
        </TabsContent>

        {/* Compliance Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                type={alert.type}
                title={alert.title}
                description={alert.description}
                count={alert.count}
                action={alert.action}
                onAction={() => {
                  if (alert.id === 'overdue') {
                    setActiveTab('certifications');
                  } else if (alert.id === 'expiring') {
                    setActiveTab('expiring');
                  } else if (alert.id === 'inspections') {
                    setActiveTab('inspections');
                  }
                }}
              />
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All Good!</p>
                <p>No compliance alerts at this time.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActionCard
          title="Quick Actions"
          description="Common HUD compliance tasks"
          actions={[
            {
              label: 'New Certification',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowNewCertification(true)
            },
            {
              label: 'Record Inspection',
              icon: <ClipboardCheck className="h-4 w-4" />,
              onClick: () => setShowNewInspection(true)
            },
            {
              label: 'Generate Report',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => handleGenerateReport('Compliance Report')
            }
          ]}
        />

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

      {/* Modals */}
      <Modal
        open={showNewCertification}
        onOpenChange={setShowNewCertification}
        title="New Income Certification"
        description="Create a new tenant income certification"
        size="xl"
      >
        <NewCertificationForm
          onSuccess={handleCertificationSuccess}
          onCancel={() => setShowNewCertification(false)}
        />
      </Modal>

      <Modal
        open={showNewInspection}
        onOpenChange={setShowNewInspection}
        title="Record REAC Inspection"
        description="Record a new REAC inspection"
        size="lg"
      >
        <NewInspectionForm
          onSuccess={handleInspectionSuccess}
          onCancel={() => setShowNewInspection(false)}
        />
      </Modal>
    </div>
  );
}
