import {
  Profile,
  Vehicle,
  VehicleAssignment,
  TomCard,
  DailyLog,
  FuelTransaction,
  AnomalyAlert,
  AuditEvent,
  EvidenceFile,
  RegistrationRequest,
  Office,
  UserRole,
  UserStatus,
  VehicleStatus,
  EvidenceType,
} from '@/types/database';
import { getBusinessDate, normalizePlateNumber } from '@/lib/utils';
import { evaluateAnomalies } from '@/lib/anomaly-engine';

export interface ActiveSession {
  userId: string;
  role: UserRole;
  vehicleId?: string | null;
  plateNumber?: string | null;
  fullName: string;
  email?: string | null;
}

export interface EvidenceGalleryItem {
  id: string;
  evidenceId: string;
  evidenceType: EvidenceType;
  title: string;
  dataUrl: string | null;
  sha256Hash: string;
  vehiclePlate: string;
  vehicleId: string;
  staffName: string;
  userId: string;
  odometerKm: number;
  amount?: number | null;
  quantityLitres?: number | null;
  vendorName?: string | null;
  submittedAt: string;
  businessDate: string;
  sourceRecordId: string;
  sourceType: 'daily_log' | 'fuel_transaction';
  status: string;
  metadata?: Record<string, unknown> | null;
}

interface DataStore {
  offices: Office[];
  profiles: Profile[];
  userRoles: { userId: string; role: UserRole }[];
  vehicles: Vehicle[];
  assignments: VehicleAssignment[];
  tomCards: TomCard[];
  registrationRequests: RegistrationRequest[];
  evidenceFiles: EvidenceFile[];
  dailyLogs: DailyLog[];
  fuelTransactions: FuelTransaction[];
  anomalyAlerts: AnomalyAlert[];
  auditEvents: AuditEvent[];
}

const DEFAULT_OFFICES: Office[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Head Office',
    address: 'Corporate Headquarters, Victoria Island, Lagos State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Lagos Branch',
    address: 'Ikeja Commercial District, Lagos State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'South West Branch',
    address: 'Ibadan Zonal Office, Oyo State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'South South Branch',
    address: 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'South East Branch',
    address: 'Enugu Regional Center, Enugu State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'North Central Branch',
    address: 'Central Business District, Abuja FCT, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'North West Branch',
    address: 'Kano Commercial Hub, Kano State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    name: 'North East Branch',
    address: 'Maiduguri Office, Borno State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const STORAGE_KEY = 'vlms_production_store_v2';
const SESSION_KEY = 'vlms_active_session_v2';

// Clean production store — all mock/demo profiles, vehicles, and transactions purged
const store: DataStore = {
  offices: [...DEFAULT_OFFICES],
  profiles: [],
  userRoles: [],
  vehicles: [],
  assignments: [],
  tomCards: [],
  registrationRequests: [],
  evidenceFiles: [],
  dailyLogs: [],
  fuelTransactions: [],
  anomalyAlerts: [],
  auditEvents: [],
};

let isHydratedFromStorage = false;

function syncFromLocalStorage(): void {
  if (typeof window === 'undefined' || isHydratedFromStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DataStore>;
      if (Array.isArray(parsed.profiles)) store.profiles = parsed.profiles;
      if (Array.isArray(parsed.userRoles)) store.userRoles = parsed.userRoles;
      if (Array.isArray(parsed.vehicles)) store.vehicles = parsed.vehicles;
      if (Array.isArray(parsed.assignments)) store.assignments = parsed.assignments;
      if (Array.isArray(parsed.tomCards)) store.tomCards = parsed.tomCards;
      if (Array.isArray(parsed.registrationRequests)) store.registrationRequests = parsed.registrationRequests;
      if (Array.isArray(parsed.evidenceFiles)) store.evidenceFiles = parsed.evidenceFiles;
      if (Array.isArray(parsed.dailyLogs)) store.dailyLogs = parsed.dailyLogs;
      if (Array.isArray(parsed.fuelTransactions)) store.fuelTransactions = parsed.fuelTransactions;
      if (Array.isArray(parsed.anomalyAlerts)) store.anomalyAlerts = parsed.anomalyAlerts;
      if (Array.isArray(parsed.auditEvents)) store.auditEvents = parsed.auditEvents;
    }
    isHydratedFromStorage = true;
  } catch {
    isHydratedFromStorage = true;
  }
}

function persistToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Handle storage quota gracefully
  }
}

export const VLMSService = {
  // Active Session Management
  getActiveSession(): ActiveSession | null {
    syncFromLocalStorage();
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw) as ActiveSession;
      }
    } catch {
      // Ignore parse error
    }
    return null;
  },

  setActiveSession(session: ActiveSession): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage error
    }
  },

  clearActiveSession(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
  },

  async getCurrentStaffContext(): Promise<{
    profile: Profile | null;
    assignment: VehicleAssignment | null;
  }> {
    syncFromLocalStorage();
    const session = this.getActiveSession();

    if (session?.userId) {
      const profile = await this.getStaffProfile(session.userId);
      const assignment = await this.getActiveAssignment(session.userId);
      if (profile || assignment) {
        return { profile: profile ?? null, assignment: assignment ?? null };
      }
    }

    // Fallback to most recently active staff member if available
    const activeStaffRole = store.userRoles.find((r) => r.role === 'staff');
    if (activeStaffRole) {
      const profile = await this.getStaffProfile(activeStaffRole.userId);
      const assignment = await this.getActiveAssignment(activeStaffRole.userId);
      return { profile: profile ?? null, assignment: assignment ?? null };
    }

    return { profile: null, assignment: null };
  },

  async getCurrentAdminProfile(): Promise<Profile | null> {
    syncFromLocalStorage();
    const session = this.getActiveSession();
    if (session?.userId) {
      const profile = await this.getStaffProfile(session.userId);
      if (profile) return profile;
    }

    const adminRole = store.userRoles.find((r) =>
      ['administrator', 'fleet_manager', 'department_head', 'auditor'].includes(r.role)
    );
    if (adminRole) {
      const profile = await this.getStaffProfile(adminRole.userId);
      if (profile) return profile;
    }

    return null;
  },

  async getOffices(): Promise<Office[]> {
    syncFromLocalStorage();
    return store.offices;
  },

  async getVehicles(): Promise<Vehicle[]> {
    syncFromLocalStorage();
    const results: Vehicle[] = [];
    for (const v of store.vehicles) {
      const asg = store.assignments.find((a) => a.vehicle_id === v.id && a.ends_at === null);
      const assignedUser = asg ? store.profiles.find((p) => p.id === asg.user_id) || null : null;
      const assignedOffice = assignedUser
        ? store.offices.find((o) => o.id === assignedUser.office_id) || null
        : null;
      const tomCard =
        store.tomCards.find((tc) => tc.vehicle_id === v.id && tc.status === 'active') || null;
      const latestKm = await this.getLatestOdometer(v.id);
      results.push({
        ...v,
        assigned_user: assignedUser,
        assigned_office: assignedOffice,
        tom_card: tomCard,
        latest_odometer_km: latestKm ?? null,
      });
    }
    return results;
  },

  async getVehicleByPlate(plateNumber: string): Promise<Vehicle | undefined> {
    syncFromLocalStorage();
    const normalized = normalizePlateNumber(plateNumber);
    return store.vehicles.find((v) => normalizePlateNumber(v.plate_number) === normalized);
  },

  async getAllProfiles(): Promise<Profile[]> {
    syncFromLocalStorage();
    return store.profiles.map((p) => {
      const roles = store.userRoles.filter((r) => r.userId === p.id).map((r) => r.role);
      const office = store.offices.find((o) => o.id === p.office_id);
      const asg = store.assignments.find((a) => a.user_id === p.id && a.ends_at === null);
      const assignedVehicle = asg
        ? store.vehicles.find((v) => v.id === asg.vehicle_id) || null
        : null;
      const tomCard =
        store.tomCards.find(
          (tc) =>
            (tc.user_id === p.id || (assignedVehicle && tc.vehicle_id === assignedVehicle.id)) &&
            tc.status === 'active'
        ) || null;
      return {
        ...p,
        roles,
        office,
        assigned_vehicle: assignedVehicle,
        tom_card: tomCard,
      };
    });
  },

  async getAllTomCards(): Promise<TomCard[]> {
    syncFromLocalStorage();
    return store.tomCards.map((tc) => {
      const vehicle = store.vehicles.find((v) => v.id === tc.vehicle_id) || null;
      const user = store.profiles.find((p) => p.id === tc.user_id) || null;
      return { ...tc, vehicle, user };
    });
  },

  async getStaffProfile(userId: string): Promise<Profile | undefined> {
    syncFromLocalStorage();
    const profile = store.profiles.find((p) => p.id === userId);
    if (!profile) return undefined;

    const roles = store.userRoles.filter((r) => r.userId === userId).map((r) => r.role);
    const office = store.offices.find((o) => o.id === profile.office_id);
    const asg = store.assignments.find((a) => a.user_id === profile.id && a.ends_at === null);
    const assignedVehicle = asg
      ? store.vehicles.find((v) => v.id === asg.vehicle_id) || null
      : null;
    const tomCard =
      store.tomCards.find(
        (tc) =>
          (tc.user_id === profile.id || (assignedVehicle && tc.vehicle_id === assignedVehicle.id)) &&
          tc.status === 'active'
      ) || null;

    return {
      ...profile,
      roles,
      office,
      assigned_vehicle: assignedVehicle,
      tom_card: tomCard,
    };
  },

  async getActiveAssignment(userId: string): Promise<VehicleAssignment | undefined> {
    syncFromLocalStorage();
    const asg = store.assignments.find((a) => a.user_id === userId && a.ends_at === null);
    if (!asg) return undefined;
    const vehicle = store.vehicles.find((v) => v.id === asg.vehicle_id);
    const user = store.profiles.find((p) => p.id === asg.user_id);
    return { ...asg, vehicle, user };
  },

  async getActiveAssignmentByVehicle(vehicleId: string): Promise<VehicleAssignment | undefined> {
    syncFromLocalStorage();
    const asg = store.assignments.find((a) => a.vehicle_id === vehicleId && a.ends_at === null);
    if (!asg) return undefined;
    const vehicle = store.vehicles.find((v) => v.id === asg.vehicle_id);
    const user = store.profiles.find((p) => p.id === asg.user_id);
    return { ...asg, vehicle, user };
  },

  async getPendingRegistrationByPlate(plateNumber: string): Promise<RegistrationRequest | undefined> {
    syncFromLocalStorage();
    const normalized = normalizePlateNumber(plateNumber);
    return store.registrationRequests.find(
      (r) => r.status === 'pending' && normalizePlateNumber(r.requested_plate_number) === normalized
    );
  },

  async getUserRole(userId: string): Promise<UserRole | undefined> {
    syncFromLocalStorage();
    const roleRecord = store.userRoles.find((r) => r.userId === userId);
    return roleRecord?.role;
  },

  async getStaffProfileByAuthId(authUserId: string): Promise<Profile | undefined> {
    syncFromLocalStorage();
    const profile = store.profiles.find((p) => p.auth_user_id === authUserId);
    if (!profile) return undefined;
    return this.getStaffProfile(profile.id);
  },

  async getStaffProfileByEmail(email: string): Promise<Profile | undefined> {
    syncFromLocalStorage();
    const normalized = email.trim().toLowerCase();
    const profile = store.profiles.find((p) => p.email?.toLowerCase() === normalized);
    if (!profile) return undefined;
    return this.getStaffProfile(profile.id);
  },

  async getUserRoleByEmail(email: string): Promise<UserRole | undefined> {
    syncFromLocalStorage();
    const profile = store.profiles.find((p) => p.email?.toLowerCase() === email.trim().toLowerCase());
    if (!profile) return undefined;
    return this.getUserRole(profile.id);
  },

  /**
   * Administrator Registration & Provisioning
   * Allows initial Super-Admin setup or authorized management onboarding.
   */
  async registerAdminAccount(input: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    employeeId?: string;
    officeId: string;
    role?: 'administrator' | 'fleet_manager' | 'department_head' | 'auditor';
  }): Promise<{ profile: Profile; role: UserRole }> {
    syncFromLocalStorage();
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid corporate email address is required for administrator access.');
    }

    const existing = store.profiles.find((p) => p.email?.toLowerCase() === normalizedEmail);
    if (existing) {
      const existingRole = (await this.getUserRole(existing.id)) || 'administrator';
      const hydrated = (await this.getStaffProfile(existing.id)) || existing;
      return { profile: hydrated, role: existingRole };
    }

    const assignedRole: UserRole = input.role || 'administrator';
    const userId = `p-adm-${Date.now()}`;
    const now = new Date().toISOString();

    const newProfile: Profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: input.fullName.trim(),
      email: normalizedEmail,
      phone_number: input.phoneNumber?.trim() || null,
      employee_id: input.employeeId?.trim() || `ADM-${Date.now().toString().slice(-4)}`,
      office_id: input.officeId || DEFAULT_OFFICES[0].id,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    store.profiles.push(newProfile);
    store.userRoles.push({ userId, role: assignedRole });

    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: userId,
      action: 'ADMIN_REGISTERED',
      entity_type: 'USER',
      entity_id: userId,
      before_data: null,
      after_data: {
        fullName: newProfile.full_name,
        email: normalizedEmail,
        role: assignedRole,
      },
      created_at: now,
    });

    persistToLocalStorage();
    const hydrated = (await this.getStaffProfile(userId)) || newProfile;
    return { profile: hydrated, role: assignedRole };
  },

  /**
   * Secure Admin / Manager Provisioning from Management Console
   */
  async provisionAdminUser(input: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    employeeId?: string;
    officeId: string;
    role: 'administrator' | 'fleet_manager' | 'department_head' | 'auditor';
    requesterAdminId?: string;
  }): Promise<{ profile: Profile; role: UserRole }> {
    syncFromLocalStorage();
    // If admins already exist and a requester ID is specified, check authorization
    const existingAdmins = store.userRoles.filter((r) => r.role === 'administrator');
    if (existingAdmins.length > 0 && input.requesterAdminId) {
      const requesterRole = await this.getUserRole(input.requesterAdminId);
      if (requesterRole && requesterRole !== 'administrator' && requesterRole !== 'fleet_manager') {
        throw new Error('Unauthorized: Only administrators can provision management accounts.');
      }
    }

    return this.registerAdminAccount({
      fullName: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      employeeId: input.employeeId,
      officeId: input.officeId,
      role: input.role,
    });
  },

  async updateUserRoleAndStatus(input: {
    userId: string;
    role?: UserRole;
    status?: UserStatus;
    actorId?: string;
  }): Promise<Profile> {
    syncFromLocalStorage();
    const profile = store.profiles.find((p) => p.id === input.userId);
    if (!profile) throw new Error('User profile not found.');

    const beforeRole = store.userRoles.find((r) => r.userId === input.userId)?.role;
    const beforeStatus = profile.status;

    if (input.status) {
      profile.status = input.status;
      profile.updated_at = new Date().toISOString();
    }

    if (input.role) {
      store.userRoles = store.userRoles.filter((r) => r.userId !== input.userId);
      store.userRoles.push({ userId: input.userId, role: input.role });
    }

    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: input.actorId || null,
      action: 'USER_PROFILE_UPDATED',
      entity_type: 'USER',
      entity_id: input.userId,
      before_data: { role: beforeRole, status: beforeStatus },
      after_data: { role: input.role || beforeRole, status: profile.status },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return (await this.getStaffProfile(input.userId)) || profile;
  },

  async registerVehicle(input: {
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    status?: VehicleStatus;
    tomCardNumber?: string;
    assignedUserId?: string;
    actorId?: string;
  }): Promise<Vehicle> {
    syncFromLocalStorage();
    const normalizedPlate = normalizePlateNumber(input.plateNumber);
    const existing = store.vehicles.find(
      (v) => normalizePlateNumber(v.plate_number) === normalizedPlate
    );
    if (existing) {
      throw new Error(`Vehicle with plate number ${normalizedPlate} is already registered.`);
    }

    if (input.tomCardNumber && input.tomCardNumber.trim()) {
      if (!/^\d{6}$/.test(input.tomCardNumber.trim())) {
        throw new Error('TOM Card number must be exactly 6 numeric digits.');
      }
    }

    const now = new Date().toISOString();
    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      plate_number: normalizedPlate,
      make: input.make.trim(),
      model: input.model.trim(),
      car_name: `${input.make.trim()} ${input.model.trim()}`,
      year: input.year,
      status: input.status || 'active',
      created_at: now,
      updated_at: now,
    };

    store.vehicles.push(newVehicle);

    if (input.assignedUserId) {
      // Close any existing active assignment for this vehicle
      store.assignments.forEach((a) => {
        if (a.vehicle_id === newVehicle.id && a.ends_at === null) {
          a.ends_at = now;
        }
      });
      store.assignments.push({
        id: `asg-${Date.now()}`,
        user_id: input.assignedUserId,
        vehicle_id: newVehicle.id,
        starts_at: now,
        ends_at: null,
        assigned_by: input.actorId || null,
        created_at: now,
      });
    }

    if (input.tomCardNumber && input.tomCardNumber.trim()) {
      const trimmedCard = input.tomCardNumber.trim();
      store.tomCards.push({
        id: `tc-${Date.now()}`,
        card_reference: trimmedCard,
        masked_card_number: trimmedCard,
        vehicle_id: newVehicle.id,
        user_id: input.assignedUserId || null,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
    }

    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: input.actorId || null,
      action: 'VEHICLE_REGISTERED',
      entity_type: 'VEHICLE',
      entity_id: newVehicle.id,
      before_data: null,
      after_data: {
        plateNumber: normalizedPlate,
        make: newVehicle.make,
        model: newVehicle.model,
        year: newVehicle.year,
      },
      created_at: now,
    });

    persistToLocalStorage();
    return newVehicle;
  },

  async getTomCardForVehicle(vehicleId: string): Promise<TomCard | undefined> {
    syncFromLocalStorage();
    return store.tomCards.find((tc) => tc.vehicle_id === vehicleId && tc.status === 'active');
  },

  // Today's Daily Log lookup
  async getTodayLog(vehicleId: string): Promise<DailyLog | undefined> {
    syncFromLocalStorage();
    const today = getBusinessDate();
    const log = store.dailyLogs.find((l) => l.vehicle_id === vehicleId && l.business_date === today);
    if (!log) return undefined;
    const evidence = store.evidenceFiles.find((e) => e.id === log.evidence_id);
    const vehicle = store.vehicles.find((v) => v.id === log.vehicle_id);
    const user = store.profiles.find((u) => u.id === log.user_id);
    return { ...log, evidence, vehicle, user };
  },

  async getLatestOdometer(vehicleId: string): Promise<number | undefined> {
    syncFromLocalStorage();
    const vehicleLogs = store.dailyLogs
      .filter((l) => l.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    const vehicleFuel = store.fuelTransactions
      .filter((f) => f.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    const logKm = vehicleLogs[0]?.odometer_km;
    const fuelKm = vehicleFuel[0]?.odometer_km;

    if (logKm !== undefined && fuelKm !== undefined) {
      return Math.max(logKm, fuelKm);
    }
    return logKm ?? fuelKm;
  },

  // Submit Daily Log (With database-level unique constraint simulation)
  async submitDailyLog(input: {
    vehicleId: string;
    userId: string;
    odometerKm: number;
    rawOdometerText?: string | null;
    sourceUnit?: 'km' | 'mi';
    sourceReading?: number | null;
    locationName?: string | null;
    ocrReadingKm?: number | null;
    ocrConfidence?: number | null;
    evidenceId: string;
    comment?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    gpsAccuracyM?: number | null;
  }): Promise<{ log: DailyLog; anomalies: AnomalyAlert[] }> {
    syncFromLocalStorage();
    const today = getBusinessDate();

    // Enforce unique (vehicle_id, business_date)
    const existing = store.dailyLogs.find(
      (l) => l.vehicle_id === input.vehicleId && l.business_date === today
    );
    if (existing) {
      throw new Error(
        `A daily vehicle log has already been submitted for this vehicle today (${today}). Duplicate submissions are not permitted.`
      );
    }

    const previousKm = await this.getLatestOdometer(input.vehicleId);

    // Check if evidence SHA256 hash is duplicated across previous evidence files
    const currentEv = store.evidenceFiles.find((e) => e.id === input.evidenceId);
    const existingEvidenceHashes = store.evidenceFiles
      .filter((e) => e.id !== input.evidenceId)
      .map((e) => e.sha256_hash);

    // Run Anomaly Detection Engine
    const detected = evaluateAnomalies({
      currentKm: input.odometerKm,
      previousKm,
      ocrProposedKm: input.ocrReadingKm,
      ocrConfidence: input.ocrConfidence,
      evidenceHash: currentEv?.sha256_hash,
      existingEvidenceHashes,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    const newLogId = `log-${Date.now()}`;
    const newLog: DailyLog = {
      id: newLogId,
      vehicle_id: input.vehicleId,
      user_id: input.userId,
      business_date: today,
      odometer_km: input.odometerKm,
      raw_odometer_text: input.rawOdometerText ?? null,
      source_unit: input.sourceUnit ?? 'km',
      source_reading: input.sourceReading ?? input.odometerKm,
      canonical_reading_km: input.odometerKm,
      location_name: input.locationName ?? null,
      ocr_reading_km: input.ocrReadingKm ?? null,
      ocr_confidence: input.ocrConfidence ?? null,
      evidence_id: input.evidenceId,
      comment: input.comment ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      gps_accuracy_m: input.gpsAccuracyM ?? null,
      status: detected.length > 0 ? 'flagged' : 'submitted',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    store.dailyLogs.push(newLog);

    // Save generated anomalies
    const generatedAlerts: AnomalyAlert[] = [];
    for (const d of detected) {
      const alert: AnomalyAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        vehicle_id: input.vehicleId,
        daily_log_id: newLogId,
        fuel_transaction_id: null,
        rule_code: d.ruleCode,
        severity: d.severity,
        status: 'open',
        details: d.details,
        reviewer_id: null,
        resolution_note: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
      store.anomalyAlerts.push(alert);
      generatedAlerts.push(alert);
    }

    // Append-only Audit Trail
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: input.userId,
      action: 'DAILY_LOG_SUBMITTED',
      entity_type: 'DAILY_LOG',
      entity_id: newLogId,
      before_data: null,
      after_data: {
        vehicle_id: input.vehicleId,
        odometer_km: input.odometerKm,
        business_date: today,
        anomalies_count: detected.length,
      },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return { log: newLog, anomalies: generatedAlerts };
  },

  // Submit Fuel Transaction
  async submitFuelTransaction(input: {
    vehicleId: string;
    userId: string;
    dailyLogId?: string | null;
    paymentMethod: 'tom_card' | 'personal_fund';
    tomCardId?: string | null;
    vendorName: string;
    odometerKm: number;
    odometerEvidenceId: string;
    receiptEvidenceId: string;
    amount: number;
    currency?: string;
    quantityLitres: number;
    purchasedAt: string;
    idempotencyKey: string;
  }): Promise<{ transaction: FuelTransaction; anomalies: AnomalyAlert[] }> {
    syncFromLocalStorage();
    // Check idempotency key to prevent accidental duplicate submission
    const existing = store.fuelTransactions.find((f) => f.idempotency_key === input.idempotencyKey);
    if (existing) {
      return { transaction: existing, anomalies: [] };
    }

    // Verify odometer strictly against today's staff daily log recorded on the same day
    const today = getBusinessDate();
    const todayLog = store.dailyLogs.find(
      (l) => l.vehicle_id === input.vehicleId && l.business_date === today
    );

    if (!todayLog) {
      throw new Error(
        `No verified daily log found for today (${today}). You must submit your daily vehicle log before recording fuel purchases.`
      );
    }

    if (input.odometerKm < todayLog.odometer_km) {
      throw new Error(
        `Fuel purchase odometer reading (${input.odometerKm} km) cannot be lower than today's verified daily log reading (${todayLog.odometer_km} km).`
      );
    }

    const previousKm = todayLog.odometer_km;

    // Anomaly evaluation
    const detected = evaluateAnomalies({
      currentKm: input.odometerKm,
      previousKm,
      paymentMethod: input.paymentMethod,
      hasReceiptEvidence: Boolean(input.receiptEvidenceId),
    });

    const newTxId = `fuel-${Date.now()}`;
    const newTx: FuelTransaction = {
      id: newTxId,
      vehicle_id: input.vehicleId,
      user_id: input.userId,
      daily_log_id: todayLog.id,
      payment_method: input.paymentMethod,
      tom_card_id: input.tomCardId ?? null,
      vendor_name: input.vendorName,
      odometer_km: input.odometerKm,
      odometer_evidence_id: input.odometerEvidenceId,
      receipt_evidence_id: input.receiptEvidenceId,
      amount: input.amount,
      currency: input.currency ?? 'NGN',
      quantity_litres: input.quantityLitres,
      purchased_at: input.purchasedAt,
      submitted_at: new Date().toISOString(),
      status: detected.length > 0 ? 'flagged' : 'submitted',
      idempotency_key: input.idempotencyKey,
    };

    store.fuelTransactions.push(newTx);

    // Record anomalies if any
    const generatedAlerts: AnomalyAlert[] = [];
    for (const d of detected) {
      const alert: AnomalyAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        vehicle_id: input.vehicleId,
        daily_log_id: input.dailyLogId ?? todayLog.id,
        fuel_transaction_id: newTxId,
        rule_code: d.ruleCode,
        severity: d.severity,
        status: 'open',
        details: d.details,
        reviewer_id: null,
        resolution_note: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
      store.anomalyAlerts.push(alert);
      generatedAlerts.push(alert);
    }

    // Append-only Audit Trail
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: input.userId,
      action: 'FUEL_TRANSACTION_SUBMITTED',
      entity_type: 'FUEL_TRANSACTION',
      entity_id: newTxId,
      before_data: null,
      after_data: {
        payment_method: input.paymentMethod,
        vendor_name: input.vendorName,
        amount: input.amount,
        quantity_litres: input.quantityLitres,
        odometer_km: input.odometerKm,
      },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return { transaction: newTx, anomalies: generatedAlerts };
  },

  // Save Evidence File (including captured base64 dataUrl so photos render on Admin Dashboard)
  async saveEvidenceFile(fileData: {
    evidenceType: 'daily_odometer' | 'fuel_odometer' | 'fuel_receipt' | 'other';
    sha256Hash: string;
    mimeType: string;
    fileSizeBytes: number;
    dataUrl?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<EvidenceFile> {
    syncFromLocalStorage();
    const id = `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newEvidence: EvidenceFile = {
      id,
      storage_bucket: 'vlms-evidence',
      storage_path: `evidence/${fileData.evidenceType}/${id}.jpg`,
      data_url: fileData.dataUrl ?? null,
      evidence_type: fileData.evidenceType,
      sha256_hash: fileData.sha256Hash,
      captured_at: new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      mime_type: fileData.mimeType,
      file_size_bytes: fileData.fileSizeBytes,
      metadata: fileData.metadata,
      verification_status: 'verified',
    };
    store.evidenceFiles.push(newEvidence);
    persistToLocalStorage();
    return newEvidence;
  },

  async getEvidenceById(evidenceId: string): Promise<EvidenceFile | undefined> {
    syncFromLocalStorage();
    return store.evidenceFiles.find((e) => e.id === evidenceId);
  },

  /**
   * Unified Photographic Evidence Gallery combining Daily Odometer Logs and Fuel Receipts/Odometers
   */
  async getEvidenceGallery(): Promise<EvidenceGalleryItem[]> {
    syncFromLocalStorage();
    const gallery: EvidenceGalleryItem[] = [];

    // 1. Evidence from Daily Odometer Logs
    for (const log of store.dailyLogs) {
      const ev = store.evidenceFiles.find((e) => e.id === log.evidence_id);
      const vehicle = store.vehicles.find((v) => v.id === log.vehicle_id);
      const user = store.profiles.find((p) => p.id === log.user_id);

      gallery.push({
        id: `gal-log-${log.id}`,
        evidenceId: ev?.id ?? log.evidence_id,
        evidenceType: 'daily_odometer',
        title: 'Daily Odometer Photograph',
        dataUrl: ev?.data_url ?? null,
        sha256Hash: ev?.sha256_hash ?? 'hash-verified',
        vehiclePlate: vehicle?.plate_number ?? log.vehicle_id,
        vehicleId: log.vehicle_id,
        staffName: user?.full_name ?? 'Assigned Driver',
        userId: log.user_id,
        odometerKm: log.odometer_km,
        submittedAt: log.submitted_at,
        businessDate: log.business_date,
        sourceRecordId: log.id,
        sourceType: 'daily_log',
        status: log.status,
        metadata: {
          ...(ev?.metadata || {}),
          reading: log.odometer_km,
          ocrProposal: log.ocr_reading_km,
          ocrConfidence: log.ocr_confidence,
        },
      });
    }

    // 2. Evidence from Fuel Transactions (Receipts and New Odometer Photos)
    for (const tx of store.fuelTransactions) {
      const vehicle = store.vehicles.find((v) => v.id === tx.vehicle_id);
      const user = store.profiles.find((p) => p.id === tx.user_id);
      const recEv = store.evidenceFiles.find((e) => e.id === tx.receipt_evidence_id);
      const odoEv = store.evidenceFiles.find((e) => e.id === tx.odometer_evidence_id);

      // Add Fuel Receipt / Transaction Evidence
      gallery.push({
        id: `gal-fuel-rec-${tx.id}`,
        evidenceId: recEv?.id ?? tx.receipt_evidence_id,
        evidenceType: tx.payment_method === 'personal_fund' ? 'fuel_receipt' : 'fuel_odometer',
        title:
          tx.payment_method === 'personal_fund'
            ? `Fuel Receipt (${tx.vendor_name})`
            : `TOM Card Fuel Record (${tx.vendor_name})`,
        dataUrl: recEv?.data_url ?? odoEv?.data_url ?? null,
        sha256Hash: recEv?.sha256_hash ?? odoEv?.sha256_hash ?? 'hash-verified',
        vehiclePlate: vehicle?.plate_number ?? tx.vehicle_id,
        vehicleId: tx.vehicle_id,
        staffName: user?.full_name ?? 'Assigned Driver',
        userId: tx.user_id,
        odometerKm: tx.odometer_km,
        amount: tx.amount,
        quantityLitres: tx.quantity_litres,
        vendorName: tx.vendor_name,
        submittedAt: tx.submitted_at,
        businessDate: tx.purchased_at.slice(0, 10),
        sourceRecordId: tx.id,
        sourceType: 'fuel_transaction',
        status: tx.status,
        metadata: {
          ...(recEv?.metadata || {}),
          vendor: tx.vendor_name,
          amount: tx.amount,
          quantityLitres: tx.quantity_litres,
          reading: tx.odometer_km,
        },
      });
    }

    return gallery.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  // Registration Request & Approval
  async submitRegistration(input: {
    fullName: string;
    phoneNumber?: string;
    employeeId?: string;
    plateNumber: string;
    tomCardNumber?: string;
    officeId: string;
    carName?: string;
    carModel?: string;
    carYear?: number;
    requestedRole?: UserRole;
    adminPasscode?: string;
  }): Promise<RegistrationRequest> {
    syncFromLocalStorage();
    const normalizedPlate = normalizePlateNumber(input.plateNumber);

    // 1. Data Integrity: Enforce Unique constraint on vehicle plate number
    const existingVehicle = store.vehicles.find(
      (v) => normalizePlateNumber(v.plate_number) === normalizedPlate
    );
    const existingPending = store.registrationRequests.find(
      (r) => r.status === 'pending' && normalizePlateNumber(r.requested_plate_number) === normalizedPlate
    );
    if (existingVehicle || existingPending) {
      throw new Error('Plate number already exists in the database. Kindly sign in.');
    }

    // 2. Validate TOM Card 6-digit numeric format
    if (input.tomCardNumber && input.tomCardNumber.trim()) {
      const trimmed = input.tomCardNumber.trim();
      if (!/^\d{6}$/.test(trimmed)) {
        throw new Error('TOM Card number must be exactly 6 numeric digits (e.g. 804689).');
      }
    }

    // 3. Role Management: Public Registration is strictly restricted to Staff
    const assignedRole: UserRole = 'staff';

    const userId = `p-user-${Date.now()}`;
    const newProfile: Profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: input.fullName.trim(),
      phone_number: input.phoneNumber?.trim() ?? null,
      employee_id: input.employeeId?.trim() ?? `DRV-${Date.now().toString().slice(-4)}`,
      office_id: input.officeId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.profiles.push(newProfile);
    store.userRoles.push({ userId, role: assignedRole });

    const reqId = `reg-${Date.now()}`;
    const req: RegistrationRequest = {
      id: reqId,
      user_id: userId,
      requested_plate_number: normalizedPlate,
      requested_phone_number: input.phoneNumber ?? null,
      requested_car_name: input.carName ?? null,
      requested_car_model: input.carModel ?? null,
      requested_car_year: input.carYear ?? null,
      requested_tom_card: input.tomCardNumber?.trim() || null,
      requested_office_id: input.officeId,
      requested_role: assignedRole,
      status: 'pending',
      reviewer_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
    };
    store.registrationRequests.push(req);

    // Audit Event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: userId,
      action: 'REGISTRATION_SUBMITTED',
      entity_type: 'REGISTRATION_REQUEST',
      entity_id: reqId,
      before_data: null,
      after_data: {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        plateNumber: normalizedPlate,
        carName: input.carName,
        carModel: input.carModel,
        carYear: input.carYear,
        role: assignedRole,
      },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return req;
  },

  async approveRegistration(requestId: string, adminId: string): Promise<RegistrationRequest> {
    syncFromLocalStorage();
    const req = store.registrationRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Registration request not found');

    req.status = 'approved';
    req.reviewer_id = adminId;
    req.reviewed_at = new Date().toISOString();

    const profile = store.profiles.find((p) => p.id === req.user_id);
    if (profile) {
      profile.status = 'active';
      profile.updated_at = new Date().toISOString();
    }

    // Assign vehicle if exists or create new vehicle record
    let vehicle = store.vehicles.find(
      (v) => normalizePlateNumber(v.plate_number) === normalizePlateNumber(req.requested_plate_number)
    );
    if (!vehicle) {
      vehicle = {
        id: `v-${Date.now()}`,
        plate_number: req.requested_plate_number,
        make: req.requested_car_name || 'Company Vehicle',
        model: req.requested_car_model || 'Standard Fleet',
        car_name: req.requested_car_name || 'Company Vehicle',
        year: req.requested_car_year || new Date().getFullYear(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.vehicles.push(vehicle);
    }

    store.assignments.push({
      id: `asg-${Date.now()}`,
      user_id: req.user_id,
      vehicle_id: vehicle.id,
      starts_at: new Date().toISOString(),
      ends_at: null,
      assigned_by: adminId,
      created_at: new Date().toISOString(),
    });

    // Provision TOM Card if requested during registration
    if (req.requested_tom_card) {
      const existingCard = store.tomCards.find(
        (tc) => tc.card_reference === req.requested_tom_card
      );
      if (!existingCard) {
        store.tomCards.push({
          id: `tc-${Date.now()}`,
          card_reference: req.requested_tom_card,
          masked_card_number: req.requested_tom_card,
          vehicle_id: vehicle.id,
          user_id: req.user_id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Audit event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: adminId,
      action: 'REGISTRATION_APPROVED',
      entity_type: 'REGISTRATION_REQUEST',
      entity_id: requestId,
      before_data: { status: 'pending' },
      after_data: { status: 'approved', vehicle_id: vehicle.id, plate_number: vehicle.plate_number },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return req;
  },

  async rejectRegistration(
    requestId: string,
    adminId: string,
    reason: string
  ): Promise<RegistrationRequest> {
    syncFromLocalStorage();
    const req = store.registrationRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Registration request not found');

    req.status = 'rejected';
    req.reviewer_id = adminId;
    req.reviewed_at = new Date().toISOString();
    req.rejection_reason = reason;

    const profile = store.profiles.find((p) => p.id === req.user_id);
    if (profile) {
      profile.status = 'rejected';
    }

    // Audit event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: adminId,
      action: 'REGISTRATION_REJECTED',
      entity_type: 'REGISTRATION_REQUEST',
      entity_id: requestId,
      before_data: { status: 'pending' },
      after_data: { status: 'rejected', reason },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return req;
  },

  // Management Master Dashboard Metrics
  async getDashboardMetrics() {
    syncFromLocalStorage();
    const today = getBusinessDate();
    const totalUsers = store.profiles.length;
    const activeStaff = store.profiles.filter((p) => p.status === 'active').length;
    const totalVehicles = store.vehicles.length;
    const activeVehicles = store.vehicles.filter((v) => v.status === 'active').length;
    const submittedToday = store.dailyLogs.filter((l) => l.business_date === today).length;
    const missingDailyLogs = Math.max(0, activeVehicles - submittedToday);
    const fuelTransactionsToday = store.fuelTransactions.filter(
      (f) => f.purchased_at.startsWith(today) || f.submitted_at.startsWith(today)
    ).length;
    const totalFuelExpenditure = store.fuelTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    const openAnomalies = store.anomalyAlerts.filter(
      (a) => a.status === 'open' || a.status === 'investigating'
    ).length;
    const pendingApprovals = store.registrationRequests.filter((r) => r.status === 'pending').length;

    return {
      totalUsers,
      activeStaff,
      totalVehicles,
      activeVehicles,
      submittedToday,
      missingDailyLogs,
      fuelTransactionsToday,
      totalFuelExpenditure,
      openAnomalies,
      pendingApprovals,
    };
  },

  async getAllDailyLogs(): Promise<DailyLog[]> {
    syncFromLocalStorage();
    return store.dailyLogs
      .slice()
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .map((log) => {
        const vehicle = store.vehicles.find((v) => v.id === log.vehicle_id);
        const user = store.profiles.find((u) => u.id === log.user_id);
        const evidence = store.evidenceFiles.find((e) => e.id === log.evidence_id);
        return { ...log, vehicle, user, evidence };
      });
  },

  async getAllFuelTransactions(): Promise<FuelTransaction[]> {
    syncFromLocalStorage();
    return store.fuelTransactions
      .slice()
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .map((tx) => {
        const vehicle = store.vehicles.find((v) => v.id === tx.vehicle_id);
        const user = store.profiles.find((u) => u.id === tx.user_id);
        const tom_card = store.tomCards.find((t) => t.id === tx.tom_card_id);
        const odometer_evidence = store.evidenceFiles.find((e) => e.id === tx.odometer_evidence_id);
        const receipt_evidence = store.evidenceFiles.find((e) => e.id === tx.receipt_evidence_id);
        return { ...tx, vehicle, user, tom_card, odometer_evidence, receipt_evidence };
      });
  },

  async getAllAnomalies(): Promise<AnomalyAlert[]> {
    syncFromLocalStorage();
    return store.anomalyAlerts
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((alert) => {
        const vehicle = store.vehicles.find((v) => v.id === alert.vehicle_id);
        return { ...alert, vehicle };
      });
  },

  async resolveAnomaly(
    alertId: string,
    reviewerId: string,
    status: 'investigating' | 'resolved' | 'dismissed',
    note: string
  ): Promise<AnomalyAlert> {
    syncFromLocalStorage();
    const alert = store.anomalyAlerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Anomaly alert not found');

    const previousStatus = alert.status;
    alert.status = status;
    alert.reviewer_id = reviewerId;
    alert.resolution_note = note;
    alert.resolved_at = new Date().toISOString();

    // Audit event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: reviewerId,
      action: 'ANOMALY_STATUS_UPDATED',
      entity_type: 'ANOMALY_ALERT',
      entity_id: alertId,
      before_data: { status: previousStatus },
      after_data: { status, resolution_note: note },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return alert;
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    syncFromLocalStorage();
    return store.auditEvents
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((ev) => {
        const actor = store.profiles.find((p) => p.id === ev.actor_id);
        return { ...ev, actor };
      });
  },

  async getRegistrationRequests(): Promise<RegistrationRequest[]> {
    syncFromLocalStorage();
    return store.registrationRequests
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((req) => {
        const user = store.profiles.find((p) => p.id === req.user_id);
        const requested_office = store.offices.find((o) => o.id === req.requested_office_id);
        return { ...req, user, requested_office };
      });
  },
};
