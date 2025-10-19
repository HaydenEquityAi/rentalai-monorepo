// API client with all endpoints
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
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
    const response = await apiClient.post('/auth/login', { email, password });
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
    const response = await apiClient.post('/auth/register', userData);
    return response;
  },
  
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
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
    const response = await apiClient.get('/properties/');
    return response;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/properties/${id}`);
    return response;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/properties/', data);
    return response;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/properties/${id}`, data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/properties/${id}`);
    return response;
  }
};

// Analytics API
export const analyticsAPI = {
  getPortfolio: async () => {
    const response = await apiClient.get('/analytics/portfolio');
    return response;
  }
};

// AI API
export const aiAPI = {
  parseLease: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/ai/parse-lease', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  }
};
