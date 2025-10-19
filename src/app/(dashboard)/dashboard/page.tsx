'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI, PortfolioMetrics } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Home, TrendingUp, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await analyticsAPI.getPortfolio();
        setMetrics(response.data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here's what's happening with your properties.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Properties"
          value={metrics?.total_properties || 0}
          icon={Building2}
          color="blue"
        />
        <MetricCard
          title="Total Units"
          value={metrics?.total_units || 0}
          icon={Home}
          color="green"
        />
        <MetricCard
          title="Occupancy Rate"
          value={`${metrics?.occupancy_rate.toFixed(1) || 0}%`}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Monthly Rent Roll"
          value={`$${metrics?.total_rent_roll.toLocaleString() || 0}`}
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Trend</CardTitle>
            <CardDescription>Monthly occupancy rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { month: 'Jan', rate: 92 },
                { month: 'Feb', rate: 94 },
                { month: 'Mar', rate: 93 },
                { month: 'Apr', rate: 95 },
                { month: 'May', rate: 96 },
                { month: 'Jun', rate: metrics?.occupancy_rate || 95 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Property</CardTitle>
            <CardDescription>Monthly revenue breakdown by property</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Property A', revenue: 45000 },
                { name: 'Property B', revenue: 38000 },
                { name: 'Property C', revenue: 52000 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: 'New Lead', message: 'John Doe submitted application for Unit 205', time: '5 minutes ago' },
              { type: 'Work Order', message: 'Plumbing issue reported in Building A', time: '1 hour ago' },
              { type: 'Payment', message: 'Rent payment received from Unit 104', time: '2 hours ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.type}</p>
                  <p className="text-sm text-gray-500">{item.message}</p>
                </div>
                <div className="text-sm text-gray-400">{item.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {title.toLowerCase().includes('rate') ? 'occupancy rate' : 
           title.toLowerCase().includes('rent') ? 'monthly revenue' :
           title.toLowerCase().includes('units') ? 'total units' : 'properties in portfolio'}
        </p>
      </CardContent>
    </Card>
  );
}
