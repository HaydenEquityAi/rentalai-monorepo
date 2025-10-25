// Billing API functions
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Subscription {
  id: string;
  plan: 'starter' | 'growth' | 'professional';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  properties_count: number;
  properties_limit: number;
  amount: number;
  currency: string;
}

export interface CheckoutSession {
  url: string;
  session_id: string;
}

export const billingAPI = {
  /**
   * Create a Stripe checkout session for subscription
   */
  createCheckoutSession: async (plan: 'starter' | 'growth' | 'professional'): Promise<CheckoutSession> => {
    const response = await apiClient.post('/billing/create-checkout-session', {
      plan,
      success_url: `${window.location.origin}/dashboard?subscription=success`,
      cancel_url: `${window.location.origin}/pricing?subscription=canceled`,
    });
    return response.data;
  },

  /**
   * Get current subscription details
   */
  getSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get('/billing/subscription');
    return response.data;
  },

  /**
   * Open Stripe customer portal for subscription management
   */
  openCustomerPortal: async (): Promise<{ url: string }> => {
    const response = await apiClient.post('/billing/customer-portal', {
      return_url: `${window.location.origin}/dashboard/settings`,
    });
    return response.data;
  },

  /**
   * Cancel subscription at period end
   */
  cancelSubscription: async (): Promise<void> => {
    await apiClient.post('/billing/cancel-subscription');
  },

  /**
   * Reactivate a canceled subscription
   */
  reactivateSubscription: async (): Promise<void> => {
    await apiClient.post('/billing/reactivate-subscription');
  },

  /**
   * Update subscription plan
   */
  updateSubscription: async (plan: 'starter' | 'growth' | 'professional'): Promise<void> => {
    await apiClient.post('/billing/update-subscription', { plan });
  },

  /**
   * Get billing history
   */
  getBillingHistory: async (): Promise<any[]> => {
    const response = await apiClient.get('/billing/history');
    return response.data;
  },
};
