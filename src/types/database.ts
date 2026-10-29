export type UserRole =
  | 'staff'
  | 'department_head'
  | 'fleet_manager'
  | 'auditor'
  | 'administrator';

export type UserStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'deactivated';

export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

export type TomCardStatus = 'active' | 'inactive' | 'blocked';

export type EvidenceType =
  | 'daily_odometer'
  | 'fuel_odometer'
  | 'fuel_receipt'
  | 'other';

export type VerificationStatus =
  | 'unverified'
  | 'verified'
  | 'flagged'
  | 'rejected';

export type PaymentMethod = 'tom_card' | 'personal_fund';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type AnomalyStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Office {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  employee_id?: string | null;
  office_id: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  office?: Office;
  roles?: UserRole[];
  assigned_vehicle?: Vehicle | null;
  tom_card?: TomCard | null;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  car_name?: string | null;
  year: number | null;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  assigned_user?: Profile | null;
  assigned_office?: Office | null;
  tom_card?: TomCard | null;
  latest_odometer_km?: number | null;
}

export interface VehicleAssignment {
  id: string;
  user_id: string;
  vehicle_id: string;
  starts_at: string;
  ends_at: string | null;
  assigned_by: string | null;
  created_at: string;
  vehicle?: Vehicle;
  user?: Profile;
}

export interface TomCard {
  id: string;
  card_reference: string;
  masked_card_number: string;
  encrypted_card_number?: string | null;
  vehicle_id: string | null;
  user_id: string | null;
  status: TomCardStatus;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle | null;
  user?: Profile | null;
}

export interface RegistrationRequest {
  id: string;
  user_id: string;
  requested_plate_number: string;
  requested_phone_number?: string | null;
  requested_car_name?: string | null;
  requested_car_model?: string | null;
  requested_car_year?: number | null;
  requested_tom_card: string | null;
  requested_office_id: string | null;
  requested_role?: UserRole | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user?: Profile;
  requested_office?: Office;
}

export interface EvidenceFile {
  id: string;
  storage_bucket: string;
  storage_path: string;
  data_url?: string | null;
  evidence_type: EvidenceType;
  sha256_hash: string;
  captured_at: string | null;
  uploaded_at: string;
  mime_type: string;
  file_size_bytes: number;
  metadata?: Record<string, unknown>;
  verification_status: VerificationStatus;
}

export type OdometerUnit = 'km' | 'mi';

export interface DailyLog {
  id: string;
  vehicle_id: string;
  user_id: string;
  business_date: string; // YYYY-MM-DD
  odometer_km: number;
  raw_odometer_text?: string | null;
  source_unit?: OdometerUnit;
  source_reading?: number | null;
  canonical_reading_km?: number | null;
  location_name?: string | null;
  ocr_reading_km: number | null;
  ocr_confidence: number | null;
  evidence_id: string;
  comment: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  status: 'submitted' | 'flagged' | 'verified' | 'amended';
  submitted_at: string;
  created_at: string;
  vehicle?: Vehicle;
  user?: Profile;
  evidence?: EvidenceFile;
}

export interface FuelTransaction {
  id: string;
  vehicle_id: string;
  user_id: string;
  daily_log_id: string | null;
  payment_method: PaymentMethod;
  tom_card_id: string | null;
  vendor_name: string;
  odometer_km: number;
  source_unit?: OdometerUnit;
  source_reading?: number | null;
  canonical_reading_km?: number | null;
  odometer_evidence_id: string;
  receipt_evidence_id: string;
  amount: number;
  currency: string;
  quantity_litres: number;
  purchased_at: string;
  submitted_at: string;
  status: 'submitted' | 'verified' | 'flagged' | 'rejected';
  idempotency_key: string;
  vehicle?: Vehicle;
  user?: Profile;
  tom_card?: TomCard;
  odometer_evidence?: EvidenceFile;
  receipt_evidence?: EvidenceFile;
}

export interface AnomalyAlert {
  id: string;
  vehicle_id: string;
  daily_log_id: string | null;
  fuel_transaction_id: string | null;
  rule_code: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  details: Record<string, unknown>;
  reviewer_id: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  vehicle?: Vehicle;
}

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  actor?: Profile;
}
