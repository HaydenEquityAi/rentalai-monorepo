'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Zap, Crown, CreditCard, Calendar, Building2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { billingAPI, Subscription } from '@/lib/billing';
import { toast } from 'sonner';

interface SubscriptionCardProps {
  className?: string;
}

const planIcons = {
  starter: Star,
  growth: Zap,
  professional: Crown,
};

const planColors = {
  starter: 'text-yellow-600 bg-yellow-100',
  growth: 'text-blue-600 bg-blue-100',
  professional: 'text-purple-600 bg-purple-100',
};

const statusColors = {
  active: 'text-green-600 bg-green-100',
  canceled: 'text-red-600 bg-red-100',
  past_due: 'text-orange-600 bg-orange-100',
  incomplete: 'text-gray-600 bg-gray-100',
};

const statusIcons = {
  active: CheckCircle,
  canceled: XCircle,
  past_due: AlertCircle,
  incomplete: AlertCircle,
};

export default function SubscriptionCard({ className }: SubscriptionCardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'professional'>('growth');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingAPI.getSubscription();
      setSubscription(data);
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsManagingBilling(true);
    try {
      const { url } = await billingAPI.openCustomerPortal();
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error('Failed to open billing portal');
    } finally {
      setIsManagingBilling(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { url } = await billingAPI.createCheckoutSession(selectedPlan);
      window.location.href = url;
    } catch (err: any) {
      toast.error('Failed to start upgrade process');
    } finally {
      setIsUpgrading(false);
      setShowUpgradeDialog(false);
    }
  };

  const getPlanDisplayName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getPlanPrice = (plan: string) => {
    const prices = { starter: 99, growth: 199, professional: 349 };
    return prices[plan as keyof typeof prices] || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error || 'No subscription found'}</p>
            <Button onClick={fetchSubscription} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PlanIcon = planIcons[subscription.plan];
  const StatusIcon = statusIcons[subscription.status];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${planColors[subscription.plan]}`}>
              <PlanIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{getPlanDisplayName(subscription.plan)} Plan</CardTitle>
              <CardDescription>${getPlanPrice(subscription.plan)}/month</CardDescription>
            </div>
          </div>
          <Badge className={`${statusColors[subscription.status]} border-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subscription Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-500">Renewal Date</p>
              <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-500">Properties</p>
              <p className="font-medium">
                {subscription.properties_count} / {subscription.properties_limit}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Property Usage</span>
            <span className="text-gray-900 font-medium">
              {Math.round((subscription.properties_count / subscription.properties_limit) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                subscription.properties_count / subscription.properties_limit > 0.8
                  ? 'bg-red-500'
                  : subscription.properties_count / subscription.properties_limit > 0.6
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min((subscription.properties_count / subscription.properties_limit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={isManagingBilling}
            className="flex-1"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isManagingBilling ? 'Opening...' : 'Manage Billing'}
          </Button>

          {subscription.plan !== 'professional' && (
            <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  Upgrade Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upgrade Your Plan</DialogTitle>
                  <DialogDescription>
                    Choose a plan that better fits your growing business needs.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Plan
                    </label>
                    <Select value={selectedPlan} onValueChange={(value: any) => setSelectedPlan(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter - $99/month</SelectItem>
                        <SelectItem value="growth">Growth - $199/month</SelectItem>
                        <SelectItem value="professional">Professional - $349/month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> You'll be redirected to our secure checkout page to complete the upgrade.
                      Changes take effect immediately and billing will be prorated.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpgrade} disabled={isUpgrading}>
                    {isUpgrading ? 'Processing...' : 'Upgrade Now'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Cancel Notice */}
        {subscription.cancel_at_period_end && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-orange-600 mr-2" />
              <p className="text-sm text-orange-800">
                Your subscription will cancel on {formatDate(subscription.current_period_end)}.
                You can reactivate it anytime before then.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
