/**
 * HUD Compliance TypeScript Interfaces
 * Type definitions for HUD PRAC compliance models matching backend structure
 */

// Enums
export type CertificationType = 'initial' | 'annual' | 'interim' | 'other';
export type CertificationStatus = 'pending' | 'approved' | 'rejected' | 'submitted';
export type RelationshipType = 'head' | 'spouse' | 'child' | 'other_dependent' | 'live_in_aide' | 'other';
export type IncomeType = 'wages' | 'self_employment' | 'social_security' | 'ssi' | 'pension' | 'child_support' | 'alimony' | 'unemployment' | 'tanf' | 'other';
export type VerificationType = 'pay_stub' | 'tax_return' | 'award_letter' | 'employer_statement' | 'bank_statement' | 'self_certification';
export type InspectionType = 'initial' | 'annual' | 'complaint' | 'special';
export type InspectionStatus = 'passed' | 'failed' | 'conditional' | 'pending';

// Base interfaces
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface BaseOrgEntity extends BaseEntity {
  org_id: string;
}

// Tenant Income Certification interface
export interface TenantIncomeCertification extends BaseOrgEntity {
  tenant_id: string;
  property_id: string;
  unit_id?: string;
  certification_date: string;
  effective_date: string;
  cert_type: CertificationType;
  household_size: number;
  annual_income: string; // Decimal as string
  adjusted_income: string; // Decimal as string
  tenant_rent_portion: string; // Decimal as string
  utility_allowance: string; // Decimal as string
  subsidy_amount: string; // Decimal as string
  certification_status: CertificationStatus;
  hud_50059_submitted: boolean;
  hud_50059_submission_date?: string;
  created_by: string;
}

// Household Member interface
export interface HouseholdMember extends BaseEntity {
  tic_id: string;
  full_name: string;
  ssn_last_4?: string;
  date_of_birth: string;
  relationship_type: RelationshipType;
  is_student: boolean;
  is_disabled: boolean;
  annual_income: string; // Decimal as string
}

// Income Source interface
export interface IncomeSource extends BaseEntity {
  household_member_id: string;
  income_type: IncomeType;
  employer_name?: string;
  monthly_amount: string; // Decimal as string
  annual_amount: string; // Decimal as string
  verification_type: VerificationType;
  verification_date: string;
}

// Utility Allowance interface
export interface UtilityAllowance extends BaseOrgEntity {
  property_id: string;
  bedroom_count: number;
  heating: string; // Decimal as string
  cooking: string; // Decimal as string
  lighting: string; // Decimal as string
  water_sewer: string; // Decimal as string
  trash: string; // Decimal as string
  total_allowance: string; // Decimal as string
  effective_date: string;
}

// REAC Inspection interface
export interface REACInspection extends BaseEntity {
  property_id: string;
  inspection_date: string;
  inspection_type: InspectionType;
  overall_score?: number;
  inspection_status: InspectionStatus;
  deficiencies_count: number;
  critical_deficiencies: number;
  report_url?: string;
  next_inspection_date?: string;
}

// Extended interfaces with relationships
export interface TenantIncomeCertificationWithMembers extends TenantIncomeCertification {
  household_members: HouseholdMember[];
}

export interface HouseholdMemberWithIncomeSources extends HouseholdMember {
  income_sources: IncomeSource[];
}

export interface TenantIncomeCertificationComplete extends TenantIncomeCertification {
  household_members: HouseholdMemberWithIncomeSources[];
}

// API Response interfaces
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
}

// Request interfaces for creating/updating entities
export interface CreateTenantIncomeCertificationRequest {
  tenant_id: string;
  property_id: string;
  unit_id?: string;
  certification_date: string;
  effective_date: string;
  cert_type: CertificationType;
  household_size: number;
  annual_income: string;
  adjusted_income: string;
  tenant_rent_portion: string;
  utility_allowance: string;
  subsidy_amount: string;
  certification_status?: CertificationStatus;
}

export interface UpdateTenantIncomeCertificationRequest {
  tenant_id?: string;
  property_id?: string;
  unit_id?: string;
  certification_date?: string;
  effective_date?: string;
  cert_type?: CertificationType;
  household_size?: number;
  annual_income?: string;
  adjusted_income?: string;
  tenant_rent_portion?: string;
  utility_allowance?: string;
  subsidy_amount?: string;
  certification_status?: CertificationStatus;
}

export interface CreateHouseholdMemberRequest {
  full_name: string;
  ssn_last_4?: string;
  date_of_birth: string;
  relationship_type: RelationshipType;
  is_student?: boolean;
  is_disabled?: boolean;
  annual_income?: string;
}

export interface UpdateHouseholdMemberRequest {
  full_name?: string;
  ssn_last_4?: string;
  date_of_birth?: string;
  relationship_type?: RelationshipType;
  is_student?: boolean;
  is_disabled?: boolean;
  annual_income?: string;
}

export interface CreateIncomeSourceRequest {
  income_type: IncomeType;
  employer_name?: string;
  monthly_amount: string;
  annual_amount: string;
  verification_type: VerificationType;
  verification_date: string;
}

export interface UpdateIncomeSourceRequest {
  income_type?: IncomeType;
  employer_name?: string;
  monthly_amount?: string;
  annual_amount?: string;
  verification_type?: VerificationType;
  verification_date?: string;
}

export interface CreateUtilityAllowanceRequest {
  property_id: string;
  bedroom_count: number;
  heating?: string;
  cooking?: string;
  lighting?: string;
  water_sewer?: string;
  trash?: string;
  total_allowance: string;
  effective_date: string;
}

export interface UpdateUtilityAllowanceRequest {
  property_id?: string;
  bedroom_count?: number;
  heating?: string;
  cooking?: string;
  lighting?: string;
  water_sewer?: string;
  trash?: string;
  total_allowance?: string;
  effective_date?: string;
}

export interface CreateREACInspectionRequest {
  property_id: string;
  inspection_date: string;
  inspection_type: InspectionType;
  overall_score?: number;
  inspection_status: InspectionStatus;
  deficiencies_count?: number;
  critical_deficiencies?: number;
  report_url?: string;
  next_inspection_date?: string;
}

export interface UpdateREACInspectionRequest {
  property_id?: string;
  inspection_date?: string;
  inspection_type?: InspectionType;
  overall_score?: number;
  inspection_status?: InspectionStatus;
  deficiencies_count?: number;
  critical_deficiencies?: number;
  report_url?: string;
  next_inspection_date?: string;
}

// Filter interfaces for API queries
export interface CertificationFilters {
  property_id?: string;
  tenant_id?: string;
  status?: CertificationStatus;
  cert_type?: CertificationType;
}

export interface HouseholdMemberFilters {
  tic_id?: string;
  relationship_type?: RelationshipType;
}

export interface IncomeSourceFilters {
  household_member_id?: string;
  income_type?: IncomeType;
  verification_type?: VerificationType;
}

export interface UtilityAllowanceFilters {
  property_id?: string;
  bedroom_count?: number;
}

export interface REACInspectionFilters {
  property_id?: string;
  inspection_type?: InspectionType;
  inspection_status?: InspectionStatus;
}

// Special request interfaces
export interface SubmitHUD50059Request {
  // No additional fields needed - just the cert_id in URL
}

export interface CalculateRentRequest {
  household_income: string;
  household_size: number;
  utility_allowance: string;
  contract_rent: string;
}

export interface CalculateRentResponse {
  tenant_rent: string;
  subsidy_amount: string;
  total_contract_rent: string;
  utility_allowance: string;
  monthly_income: string;
  rent_to_income_ratio: string;
}

// Expiring/Upcoming query interfaces
export interface ExpiringCertificationsRequest {
  days?: number; // Default 30
}

export interface UpcomingInspectionsRequest {
  days?: number; // Default 60
}

// Current allowance request
export interface CurrentUtilityAllowanceRequest {
  property_id: string;
  bedroom_count: number;
}

// Dashboard/Summary interfaces
export interface CertificationSummary {
  total_certifications: number;
  pending_certifications: number;
  approved_certifications: number;
  expiring_soon: number;
  overdue_certifications: number;
}

export interface InspectionSummary {
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  conditional_inspections: number;
  upcoming_inspections: number;
  average_score: number;
}

export interface ComplianceDashboard {
  certification_summary: CertificationSummary;
  inspection_summary: InspectionSummary;
  recent_certifications: TenantIncomeCertification[];
  upcoming_inspections: REACInspection[];
  expiring_certifications: TenantIncomeCertification[];
}

// Report interfaces
export interface CertificationReport {
  certification_id: string;
  tenant_name: string;
  property_name: string;
  unit_number?: string;
  certification_date: string;
  effective_date: string;
  cert_type: CertificationType;
  household_size: number;
  annual_income: string;
  adjusted_income: string;
  tenant_rent_portion: string;
  utility_allowance: string;
  subsidy_amount: string;
  certification_status: CertificationStatus;
  hud_50059_submitted: boolean;
  hud_50059_submission_date?: string;
  days_until_expiry: number;
}

export interface InspectionReport {
  inspection_id: string;
  property_name: string;
  inspection_date: string;
  inspection_type: InspectionType;
  overall_score?: number;
  inspection_status: InspectionStatus;
  deficiencies_count: number;
  critical_deficiencies: number;
  report_url?: string;
  next_inspection_date?: string;
  days_until_next: number;
}

export interface UtilityAllowanceReport {
  property_name: string;
  bedroom_count: number;
  heating: string;
  cooking: string;
  lighting: string;
  water_sewer: string;
  trash: string;
  total_allowance: string;
  effective_date: string;
  units_affected: number;
}

// Form validation interfaces
export interface CertificationFormData {
  tenant_id: string;
  property_id: string;
  unit_id?: string;
  certification_date: string;
  effective_date: string;
  cert_type: CertificationType;
  household_size: number;
  annual_income: string;
  adjusted_income: string;
  tenant_rent_portion: string;
  utility_allowance: string;
  subsidy_amount: string;
  household_members: HouseholdMemberFormData[];
}

export interface HouseholdMemberFormData {
  full_name: string;
  ssn_last_4?: string;
  date_of_birth: string;
  relationship_type: RelationshipType;
  is_student: boolean;
  is_disabled: boolean;
  annual_income: string;
  income_sources: IncomeSourceFormData[];
}

export interface IncomeSourceFormData {
  income_type: IncomeType;
  employer_name?: string;
  monthly_amount: string;
  annual_amount: string;
  verification_type: VerificationType;
  verification_date: string;
}

export interface UtilityAllowanceFormData {
  property_id: string;
  bedroom_count: number;
  heating: string;
  cooking: string;
  lighting: string;
  water_sewer: string;
  trash: string;
  total_allowance: string;
  effective_date: string;
}

export interface REACInspectionFormData {
  property_id: string;
  inspection_date: string;
  inspection_type: InspectionType;
  overall_score?: number;
  inspection_status: InspectionStatus;
  deficiencies_count: number;
  critical_deficiencies: number;
  report_url?: string;
  next_inspection_date?: string;
}
