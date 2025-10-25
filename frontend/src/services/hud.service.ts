/**
 * HUD Compliance Service
 * TypeScript API client for HUD compliance endpoints
 */
import {
  TenantIncomeCertification,
  HouseholdMember,
  IncomeSource,
  UtilityAllowance,
  REACInspection,
  CreateTenantIncomeCertificationRequest,
  UpdateTenantIncomeCertificationRequest,
  CreateHouseholdMemberRequest,
  UpdateHouseholdMemberRequest,
  CreateIncomeSourceRequest,
  UpdateIncomeSourceRequest,
  CreateUtilityAllowanceRequest,
  UpdateUtilityAllowanceRequest,
  CreateREACInspectionRequest,
  UpdateREACInspectionRequest,
  CalculateRentRequest,
  CalculateRentResponse,
  CertificationFilters,
  HouseholdMemberFilters,
  IncomeSourceFilters,
  UtilityAllowanceFilters,
  REACInspectionFilters,
  ExpiringCertificationsRequest,
  UpcomingInspectionsRequest,
  CurrentUtilityAllowanceRequest,
  ApiResponse,
  ApiListResponse
} from '@/types/hud';

class HUDServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HUDServiceError';
  }
}

export class HUDService {
  private baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;
  private basePath = '/hud';

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new HUDServiceError('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      throw new HUDServiceError(errorMessage, response.status);
    }

    const data = await response.json();
    return data.data;
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    return searchParams.toString();
  }

  // Tenant Income Certifications
  async getCertifications(filters?: CertificationFilters): Promise<TenantIncomeCertification[]> {
    const queryString = filters ? `?${this.buildQueryString(filters)}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<TenantIncomeCertification[]>(response);
  }

  async createCertification(data: CreateTenantIncomeCertificationRequest): Promise<TenantIncomeCertification> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<TenantIncomeCertification>(response);
  }

  async getCertification(id: string): Promise<TenantIncomeCertification> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<TenantIncomeCertification>(response);
  }

  async updateCertification(id: string, data: UpdateTenantIncomeCertificationRequest): Promise<TenantIncomeCertification> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<TenantIncomeCertification>(response);
  }

  async submitHUD50059(id: string): Promise<TenantIncomeCertification> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications/${id}/submit`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<TenantIncomeCertification>(response);
  }

  async getExpiringCertifications(days: number = 30): Promise<TenantIncomeCertification[]> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications/expiring?days=${days}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<TenantIncomeCertification[]>(response);
  }

  // Household Members
  async addHouseholdMember(certId: string, data: CreateHouseholdMemberRequest): Promise<HouseholdMember> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/certifications/${certId}/members`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<HouseholdMember>(response);
  }

  async updateHouseholdMember(id: string, data: UpdateHouseholdMemberRequest): Promise<HouseholdMember> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/members/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<HouseholdMember>(response);
  }

  async removeHouseholdMember(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/members/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new HUDServiceError(`Failed to remove household member: ${response.statusText}`, response.status);
    }
  }

  // Income Sources
  async addIncomeSource(memberId: string, data: CreateIncomeSourceRequest): Promise<IncomeSource> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/members/${memberId}/income`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<IncomeSource>(response);
  }

  async updateIncomeSource(id: string, data: UpdateIncomeSourceRequest): Promise<IncomeSource> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/income/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<IncomeSource>(response);
  }

  async removeIncomeSource(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/income/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new HUDServiceError(`Failed to remove income source: ${response.statusText}`, response.status);
    }
  }

  // Utility Allowances
  async getUtilityAllowances(propertyId?: string): Promise<UtilityAllowance[]> {
    const queryString = propertyId ? `?property_id=${propertyId}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/utility-allowances${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<UtilityAllowance[]>(response);
  }

  async createUtilityAllowance(data: CreateUtilityAllowanceRequest): Promise<UtilityAllowance> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/utility-allowances`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UtilityAllowance>(response);
  }

  async getCurrentAllowance(propertyId: string, bedroomCount: number): Promise<UtilityAllowance> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/utility-allowances/current?property_id=${propertyId}&bedroom_count=${bedroomCount}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<UtilityAllowance>(response);
  }

  // REAC Inspections
  async getInspections(propertyId?: string): Promise<REACInspection[]> {
    const queryString = propertyId ? `?property_id=${propertyId}` : '';
    const response = await fetch(`${this.baseUrl}${this.basePath}/inspections${queryString}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<REACInspection[]>(response);
  }

  async createInspection(data: CreateREACInspectionRequest): Promise<REACInspection> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/inspections`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<REACInspection>(response);
  }

  async updateInspection(id: string, data: UpdateREACInspectionRequest): Promise<REACInspection> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/inspections/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<REACInspection>(response);
  }

  async getUpcomingInspections(days: number = 60): Promise<REACInspection[]> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/inspections/upcoming?days=${days}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<REACInspection[]>(response);
  }

  // Rent Calculations
  async calculateRent(data: CalculateRentRequest): Promise<CalculateRentResponse> {
    const response = await fetch(`${this.baseUrl}${this.basePath}/calculate-rent`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<CalculateRentResponse>(response);
  }

  // Utility methods for common operations
  async getCertificationWithMembers(id: string): Promise<TenantIncomeCertification> {
    const certification = await this.getCertification(id);
    // The API already returns household members with the certification
    return certification;
  }

  async getCompleteCertification(id: string): Promise<TenantIncomeCertification> {
    const certification = await this.getCertification(id);
    // The API returns complete certification with all nested data
    return certification;
  }

  // Batch operations for efficiency
  async createCertificationWithMembers(certificationData: CreateTenantIncomeCertificationRequest, membersData: CreateHouseholdMemberRequest[]): Promise<TenantIncomeCertification> {
    // Create certification first
    const certification = await this.createCertification(certificationData);
    
    // Add all household members
    const members = await Promise.all(
      membersData.map(memberData => 
        this.addHouseholdMember(certification.id, memberData)
      )
    );
    
    // Return certification with members
    return {
      ...certification,
      household_members: members
    } as TenantIncomeCertification;
  }

  async addMemberWithIncomeSources(certId: string, memberData: CreateHouseholdMemberRequest, incomeSourcesData: CreateIncomeSourceRequest[]): Promise<HouseholdMember> {
    // Add household member first
    const member = await this.addHouseholdMember(certId, memberData);
    
    // Add all income sources for this member
    const incomeSources = await Promise.all(
      incomeSourcesData.map(incomeData => 
        this.addIncomeSource(member.id, incomeData)
      )
    );
    
    // Return member with income sources
    return {
      ...member,
      income_sources: incomeSources
    } as HouseholdMember;
  }

  // Dashboard and summary methods
  async getCertificationSummary(): Promise<{
    total: number;
    pending: number;
    approved: number;
    expiring: number;
  }> {
    const [allCertifications, expiringCertifications] = await Promise.all([
      this.getCertifications(),
      this.getExpiringCertifications(30)
    ]);

    const pending = allCertifications.filter(c => c.certification_status === 'pending').length;
    const approved = allCertifications.filter(c => c.certification_status === 'approved').length;

    return {
      total: allCertifications.length,
      pending,
      approved,
      expiring: expiringCertifications.length
    };
  }

  async getInspectionSummary(): Promise<{
    total: number;
    passed: number;
    failed: number;
    conditional: number;
    upcoming: number;
    averageScore: number;
  }> {
    const [allInspections, upcomingInspections] = await Promise.all([
      this.getInspections(),
      this.getUpcomingInspections(60)
    ]);

    const passed = allInspections.filter(i => i.inspection_status === 'passed').length;
    const failed = allInspections.filter(i => i.inspection_status === 'failed').length;
    const conditional = allInspections.filter(i => i.inspection_status === 'conditional').length;
    
    const scoresWithValues = allInspections.filter(i => i.overall_score !== null && i.overall_score !== undefined);
    const averageScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((sum, i) => sum + (i.overall_score || 0), 0) / scoresWithValues.length
      : 0;

    return {
      total: allInspections.length,
      passed,
      failed,
      conditional,
      upcoming: upcomingInspections.length,
      averageScore: Math.round(averageScore * 100) / 100
    };
  }

  // Validation helpers
  validateCertificationData(data: CreateTenantIncomeCertificationRequest): string[] {
    const errors: string[] = [];
    
    if (!data.tenant_id) errors.push('Tenant ID is required');
    if (!data.property_id) errors.push('Property ID is required');
    if (!data.certification_date) errors.push('Certification date is required');
    if (!data.effective_date) errors.push('Effective date is required');
    if (!data.cert_type) errors.push('Certification type is required');
    if (!data.household_size || data.household_size < 1) errors.push('Household size must be at least 1');
    if (!data.annual_income || parseFloat(data.annual_income) < 0) errors.push('Annual income must be non-negative');
    if (!data.adjusted_income || parseFloat(data.adjusted_income) < 0) errors.push('Adjusted income must be non-negative');
    if (!data.tenant_rent_portion || parseFloat(data.tenant_rent_portion) < 0) errors.push('Tenant rent portion must be non-negative');
    if (!data.utility_allowance || parseFloat(data.utility_allowance) < 0) errors.push('Utility allowance must be non-negative');
    if (!data.subsidy_amount || parseFloat(data.subsidy_amount) < 0) errors.push('Subsidy amount must be non-negative');
    
    return errors;
  }

  validateHouseholdMemberData(data: CreateHouseholdMemberRequest): string[] {
    const errors: string[] = [];
    
    if (!data.full_name?.trim()) errors.push('Full name is required');
    if (!data.date_of_birth) errors.push('Date of birth is required');
    if (!data.relationship_type) errors.push('Relationship type is required');
    
    // Validate date of birth
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const today = new Date();
      if (dob >= today) errors.push('Date of birth must be in the past');
    }
    
    return errors;
  }

  validateIncomeSourceData(data: CreateIncomeSourceRequest): string[] {
    const errors: string[] = [];
    
    if (!data.income_type) errors.push('Income type is required');
    if (!data.monthly_amount || parseFloat(data.monthly_amount) < 0) errors.push('Monthly amount must be non-negative');
    if (!data.annual_amount || parseFloat(data.annual_amount) < 0) errors.push('Annual amount must be non-negative');
    if (!data.verification_type) errors.push('Verification type is required');
    if (!data.verification_date) errors.push('Verification date is required');
    
    return errors;
  }

  validateUtilityAllowanceData(data: CreateUtilityAllowanceRequest): string[] {
    const errors: string[] = [];
    
    if (!data.property_id) errors.push('Property ID is required');
    if (!data.bedroom_count || data.bedroom_count < 0) errors.push('Bedroom count must be non-negative');
    if (!data.total_allowance || parseFloat(data.total_allowance) < 0) errors.push('Total allowance must be non-negative');
    if (!data.effective_date) errors.push('Effective date is required');
    
    return errors;
  }

  validateInspectionData(data: CreateREACInspectionRequest): string[] {
    const errors: string[] = [];
    
    if (!data.property_id) errors.push('Property ID is required');
    if (!data.inspection_date) errors.push('Inspection date is required');
    if (!data.inspection_type) errors.push('Inspection type is required');
    if (!data.inspection_status) errors.push('Inspection status is required');
    
    if (data.overall_score !== undefined && (data.overall_score < 0 || data.overall_score > 100)) {
      errors.push('Overall score must be between 0 and 100');
    }
    
    return errors;
  }
}

// Export singleton instance
export const hudService = new HUDService();
export default hudService;
