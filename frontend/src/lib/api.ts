// API client with all endpoints
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

// Types
export interface PortfolioMetrics {
  total_properties: number;
  total_units: number;
  occupancy_rate: number;
  total_rent_roll: number;
}

export interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  description?: string;
  total_units: number;
  amenities: string[];
}

export interface LeaseParseResult {
  monthly_rent: number;
  security_deposit: number;
  lease_start_date: string;
  lease_end_date: string;
  lease_term_months: number;
  tenant_names: string[];
  property_address: string;
  pet_policy: string;
  confidence_score: number;
  warnings: string[];
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/v1/auth/login', { email, password });
    return response;
  },
  
  register: async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    org_name?: string;
    phone: string;
  }) => {
    const response = await apiClient.post('/api/v1/auth/register', userData);
    return response;
  },
  
  getMe: async () => {
    const response = await apiClient.get('/api/v1/auth/me');
    return response;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

// Properties API
export const propertiesAPI = {
  list: async () => {
    const response = await apiClient.get('/api/v1/properties/');
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/properties/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/v1/properties/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/v1/properties/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/properties/${id}`);
    return response;
  }
};

// Units API
export const unitsAPI = {
  list: async (propertyId?: string) => {
    const url = propertyId ? `/api/v1/units/?property_id=${propertyId}` : '/api/v1/units/';
    const response = await apiClient.get(url);
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/units/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/v1/units/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/v1/units/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/units/${id}`);
    return response;
  }
};

// Tenants API (via leases)
export const tenantsAPI = {
  getAll: async () => {
    // Get all leases to extract tenant info
    const response = await apiClient.get('/api/v1/leases/');
    const data = response.data;
    const leases = data.items || data || [];
    
    // Extract unique tenants from leases
    const tenantMap = new Map();
    leases.forEach((lease: any) => {
      if (lease.tenant_id && lease.tenant_name && lease.tenant_email) {
        if (!tenantMap.has(lease.tenant_id)) {
          tenantMap.set(lease.tenant_id, {
            id: lease.tenant_id,
            name: lease.tenant_name,
            email: lease.tenant_email,
            phone: lease.tenant_phone || ''
          });
        }
      }
    });
    
    return Array.from(tenantMap.values());
  }
};

// Leads API
export const leadsAPI = {
  list: async () => {
    const response = await apiClient.get('/api/v1/leads/');
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/leads/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/v1/leads/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/v1/leads/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/leads/${id}`);
    return response;
  }
};

// Leases API
export const leasesAPI = {
  list: async () => {
    const response = await apiClient.get('/api/v1/leases/');
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/leases/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/v1/leases/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/v1/leases/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/leases/${id}`);
    return response;
  }
};

// Maintenance API
export const maintenanceAPI = {
  list: async () => {
    const response = await apiClient.get('/api/v1/maintenance/');
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/maintenance/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/api/v1/maintenance/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/v1/maintenance/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/maintenance/${id}`);
    return response;
  }
};

// Users API
export const usersAPI = {
  getMe: async () => {
    const response = await apiClient.get('/api/v1/users/me');
    return response;
  },
  
  updateMe: async (data: any) => {
    const response = await apiClient.put('/api/v1/users/me', data);
    return response;
  },
  
  updatePassword: async (data: { current_password: string; new_password: string }) => {
    const response = await apiClient.put('/api/v1/users/me/password', data);
    return response;
  },
  
  updateNotifications: async (data: any) => {
    const response = await apiClient.put('/api/v1/users/me/notifications', data);
    return response;
  }
};

// Analytics API
export const analyticsAPI = {
  getPortfolio: async () => {
    const response = await apiClient.get('/api/v1/analytics/portfolio');
    return response;
  }
};

// AI API
export const aiAPI = {
  parseLease: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/v1/ai/parse-lease', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  }
};

// Accounting API
export const accountingApi = {
  getAccounts: () => apiClient.get('/api/v1/accounting/accounts'),
  createAccount: (data: any) => apiClient.post('/api/v1/accounting/accounts', data),
  getTransactions: () => apiClient.get('/api/v1/accounting/transactions'),
  createTransaction: (data: any) => apiClient.post('/api/v1/accounting/transactions', data),
  getProfitLoss: (startDate: string, endDate: string, propertyId?: string) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (propertyId) params.append('property_id', propertyId);
    return apiClient.get(`/api/v1/accounting/reports/profit-loss?${params}`);
  },
  getBalanceSheet: (asOfDate: string) => {
    return apiClient.get(`/api/v1/accounting/reports/balance-sheet?as_of_date=${asOfDate}`);
  },
};