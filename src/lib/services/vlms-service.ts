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
  UpdateProfileInput,
  PasswordResetToken,
} from '@/types/database';
import {
  getBusinessDate,
  normalizePlateNumber,
  toCanonicalKm,
  formatMileageTravelNotification,
  formatFuelVarianceNotification,
} from '@/lib/utils';
import { isDateInRange } from '@/lib/date-utils';
import { evaluateAnomalies } from '@/lib/anomaly-engine';
import { hashPassword, verifyPassword } from '@/lib/security/password';

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

export interface DashboardMetrics {
  totalUsers: number;
  activeStaff: number;
  totalVehicles: number;
  activeVehicles: number;
  submittedLogs: number;
  submittedToday: number;
  missingDailyLogs: number;
  uniqueVehiclesLogged: number;
  fuelTransactionsCount: number;
  fuelTransactionsToday: number;
  totalFuelExpenditure: number;
  totalFuelExpenditureAllTime: number;
  totalLitres: number;
  openAnomalies: number;
  totalAnomaliesInRange: number;
  resolvedAnomaliesInRange: number;
  vehiclesActiveInRange: number;
  driversActiveInRange: number;
  pendingApprovals: number;
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
  resetTokens: PasswordResetToken[];
}

import {
  DEFAULT_OFFICES,
  getBaselineStore,
} from './baseline-store';

const STORAGE_KEY = 'vlms_production_store_v2';
const SESSION_KEY = 'vlms_active_session_v2';

// Canonical production baseline store with durable system accounts and fleet assets
const store: DataStore = getBaselineStore();

let isHydratedFromStorage = false;

function mergeStoreFromData(parsed: Partial<DataStore>): void {
  if (Array.isArray(parsed.profiles)) {
    const map = new Map(store.profiles.map((p) => [p.id, p]));
    for (const p of parsed.profiles) map.set(p.id, p);
    store.profiles = Array.from(map.values());
  }
  if (Array.isArray(parsed.userRoles)) {
    const map = new Map(store.userRoles.map((r) => [r.userId, r]));
    for (const r of parsed.userRoles) map.set(r.userId, r);
    store.userRoles = Array.from(map.values());
  }
  if (Array.isArray(parsed.vehicles)) {
    const map = new Map(store.vehicles.map((v) => [v.id, v]));
    for (const v of parsed.vehicles) map.set(v.id, v);
    store.vehicles = Array.from(map.values());
  }
  if (Array.isArray(parsed.assignments)) {
    const map = new Map(store.assignments.map((a) => [a.id, a]));
    for (const a of parsed.assignments) map.set(a.id, a);
    store.assignments = Array.from(map.values());
  }
  if (Array.isArray(parsed.tomCards)) {
    const map = new Map(store.tomCards.map((t) => [t.id, t]));
    for (const t of parsed.tomCards) map.set(t.id, t);
    store.tomCards = Array.from(map.values());
  }
  if (Array.isArray(parsed.registrationRequests)) {
    const map = new Map(store.registrationRequests.map((r) => [r.id, r]));
    for (const r of parsed.registrationRequests) map.set(r.id, r);
    store.registrationRequests = Array.from(map.values());
  }
  if (Array.isArray(parsed.evidenceFiles)) {
    const map = new Map(store.evidenceFiles.map((e) => [e.id, e]));
    for (const e of parsed.evidenceFiles) map.set(e.id, e);
    store.evidenceFiles = Array.from(map.values());
  }
  if (Array.isArray(parsed.dailyLogs)) {
    const map = new Map(store.dailyLogs.map((l) => [l.id, l]));
    for (const l of parsed.dailyLogs) map.set(l.id, l);
    store.dailyLogs = Array.from(map.values());
  }
  if (Array.isArray(parsed.fuelTransactions)) {
    const map = new Map(store.fuelTransactions.map((f) => [f.id, f]));
    for (const f of parsed.fuelTransactions) map.set(f.id, f);
    store.fuelTransactions = Array.from(fuelTransactionsToMap(parsed.fuelTransactions).values());
  }
  if (Array.isArray(parsed.anomalyAlerts)) {
    const map = new Map(store.anomalyAlerts.map((a) => [a.id, a]));
    for (const a of parsed.anomalyAlerts) map.set(a.id, a);
    store.anomalyAlerts = Array.from(map.values());
  }
  if (Array.isArray(parsed.auditEvents)) {
    const map = new Map(store.auditEvents.map((a) => [a.id, a]));
    for (const a of parsed.auditEvents) map.set(a.id, a);
    store.auditEvents = Array.from(map.values());
  }
  if (Array.isArray(parsed.resetTokens)) {
    const map = new Map((store.resetTokens || []).map((t) => [t.id, t]));
    for (const t of parsed.resetTokens) map.set(t.id, t);
    store.resetTokens = Array.from(map.values());
  }
}

function fuelTransactionsToMap(txs: FuelTransaction[]) {
  const map = new Map(store.fuelTransactions.map((f) => [f.id, f]));
  for (const f of txs) map.set(f.id, f);
  return map;
}

function isBrowserRuntime(): boolean {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
  if (typeof process !== 'undefined' && process.env?.VITEST) return false;
  return true;
}

function syncFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  if (!isHydratedFromStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DataStore>;
        mergeStoreFromData(parsed);
      }
      isHydratedFromStorage = true;
    } catch {
      isHydratedFromStorage = true;
    }
  }

  // Trigger non-blocking background server sync
  if (isBrowserRuntime()) {
    VLMSService.syncWithServer().catch(() => {});
  }
}

function persistToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    // Asynchronously dispatch to server API route for cross-device persistence
    if (isBrowserRuntime()) {
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store),
      }).catch(() => {});
    }
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

  async syncWithServer(): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    try {
      const res = await fetch('/api/store', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data) {
        mergeStoreFromData(json.data);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        }
      }
    } catch {
      // Non-blocking server sync
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
    officeId?: string;
    role?: 'administrator' | 'fleet_manager' | 'department_head' | 'auditor';
    password?: string;
  }): Promise<{ profile: Profile; role: UserRole }> {
    syncFromLocalStorage();
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid corporate email address is required for administrator access.');
    }

    if (input.employeeId && input.employeeId.trim()) {
      const cleanEmpId = input.employeeId.trim().toUpperCase();
      const existingProfileWithEmpId = store.profiles.find(
        (p) => p.employee_id && p.employee_id.trim().toUpperCase() === cleanEmpId
      );
      if (existingProfileWithEmpId && existingProfileWithEmpId.email?.toLowerCase() !== normalizedEmail) {
        throw new Error(`Staff ID "${cleanEmpId}" is already registered to another user account.`);
      }
    }

    const existing = store.profiles.find((p) => p.email?.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('Email is already registered to another user account.');
    }

    // Attempt centralized server registration for cross-device persistence
    if (isBrowserRuntime()) {
      try {
        const res = await fetch('/api/auth/register-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: input.fullName,
            employeeId: input.employeeId,
            email: normalizedEmail,
            phoneNumber: input.phoneNumber,
            officeId: input.officeId,
            role: input.role,
            password: input.password,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Administrator registration failed.');
        }

        const json = await res.json();
        if (json?.data) {
          const { profile, role } = json.data;
          if (profile) {
            const existingIdx = store.profiles.findIndex((p) => p.id === profile.id);
            if (existingIdx >= 0) store.profiles[existingIdx] = profile;
            else store.profiles.push(profile);
          }
          store.userRoles.push({ userId: profile.id, role });
          persistToLocalStorage();
          return { profile, role };
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        if (errorObj.message && !errorObj.message.includes('fetch failed')) {
          throw errorObj;
        }
      }
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;

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
      password_hash: passwordHash,
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

  /**
   * Self-Service Profile Update (for staff/drivers/admins editing their own profile)
   * Strictly enforces allowlisted fields: fullName, phoneNumber, email.
   * Protects role, status, vehicle assignment, tomCard, and officeId from self-escalation.
   */
  async updateUserProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    syncFromLocalStorage();
    const profile = store.profiles.find((p) => p.id === userId);
    if (!profile) throw new Error('User profile not found.');

    const beforeData = {
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      email: profile.email,
    };

    if (input.fullName !== undefined) {
      const trimmedName = input.fullName.trim();
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        throw new Error('Full name must be between 3 and 100 characters.');
      }
      profile.full_name = trimmedName;
    }

    if (input.phoneNumber !== undefined) {
      const trimmedPhone = input.phoneNumber.trim();
      if (trimmedPhone) {
        // Validate Nigerian or international phone format
        const phoneRegex = /^(\+?234|0)?[789][01]\d{8}$|^(\+[1-9]\d{6,14})$/;
        const sanitizedPhone = trimmedPhone.replace(/[\s\-()]/g, '');
        if (!phoneRegex.test(sanitizedPhone)) {
          throw new Error('Please provide a valid phone number (e.g. +2348012345678 or 08012345678).');
        }
        profile.phone_number = trimmedPhone;
      } else {
        profile.phone_number = null;
      }
    }

    if (input.email !== undefined) {
      const trimmedEmail = input.email.trim();
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw new Error('Please provide a valid email address.');
        }
        profile.email = trimmedEmail.toLowerCase();
      } else {
        profile.email = null;
      }
    }

    profile.updated_at = new Date().toISOString();

    // Immutable audit trail event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: userId,
      action: 'PROFILE_SELF_EDITED',
      entity_type: 'USER',
      entity_id: userId,
      before_data: beforeData,
      after_data: {
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        email: profile.email,
      },
      created_at: new Date().toISOString(),
    });

    // Synchronize active session if active session belongs to this user
    const session = this.getActiveSession();
    if (session && session.userId === userId) {
      session.fullName = profile.full_name;
      if (profile.email) session.email = profile.email;
      this.setActiveSession(session);
    }

    persistToLocalStorage();
    return (await this.getStaffProfile(userId)) || profile;
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
      const activeAsgForUser = store.assignments.find(
        (a) => a.user_id === input.assignedUserId && a.ends_at === null
      );
      if (activeAsgForUser) {
        const assignedVehicle = store.vehicles.find((v) => v.id === activeAsgForUser.vehicle_id);
        throw new Error(
          `Staff member is already assigned to active vehicle ${assignedVehicle?.plate_number || activeAsgForUser.vehicle_id}. Unassign them first before reassigning.`
        );
      }

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

    const sourceUnit = input.sourceUnit ?? 'km';
    const rawSourceReading = input.sourceReading ?? input.odometerKm;
    // Step 1: Pre-calculation unit conversion layer (1 mi = 1.60934 km) before daily difference calculation
    const canonicalKm =
      sourceUnit === 'mi'
        ? toCanonicalKm(rawSourceReading, 'mi')
        : Math.round(input.odometerKm * 100) / 100;

    // Step 2: Retrieve previous recorded reading and calculate daily mileage difference
    const previousKm = await this.getLatestOdometer(input.vehicleId);
    const deltaKm =
      previousKm !== undefined
        ? Math.max(0, Math.round((canonicalKm - previousKm) * 100) / 100)
        : 0;

    // Step 3: Retrieve user and vehicle to construct standardized travel notification string
    const user =
      (await this.getStaffProfile(input.userId)) ||
      store.profiles.find((p) => p.id === input.userId);
    const vehicle = store.vehicles.find((v) => v.id === input.vehicleId);
    const userFullName = user?.full_name || 'Staff Member';
    const plateNumber = vehicle?.plate_number || 'Unknown Vehicle';
    const travelNotification = formatMileageTravelNotification(userFullName, plateNumber, deltaKm);

    // Check if evidence SHA256 hash is duplicated across previous evidence files
    const currentEv = store.evidenceFiles.find((e) => e.id === input.evidenceId);
    const existingEvidenceHashes = store.evidenceFiles
      .filter((e) => e.id !== input.evidenceId)
      .map((e) => e.sha256_hash);

    // Run Anomaly Detection Engine (with pre-converted canonical KM)
    const detected = evaluateAnomalies({
      currentKm: canonicalKm,
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
      odometer_km: canonicalKm,
      raw_odometer_text: input.rawOdometerText ?? null,
      source_unit: sourceUnit,
      source_reading: rawSourceReading,
      canonical_reading_km: canonicalKm,
      mileage_difference_km: deltaKm,
      travel_notification: travelNotification,
      location_name: input.locationName ?? null,
      ocr_reading_km: input.ocrReadingKm ?? null,
      ocr_confidence: input.ocrConfidence ?? null,
      evidence_id: input.evidenceId,
      comment: input.comment ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      gps_accuracy_m: input.gpsAccuracyM ?? null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    store.dailyLogs.push(newLog);

    // Standardized Administrative Alerts: DAILY_MILEAGE_DIFF is the exclusive daily log alert
    const generatedAlerts: AnomalyAlert[] = [];
    const mileageAlert: AnomalyAlert = {
      id: `alert-${Date.now()}-mileage-${Math.random().toString(36).substring(7)}`,
      vehicle_id: input.vehicleId,
      daily_log_id: newLogId,
      fuel_transaction_id: null,
      rule_code: 'DAILY_MILEAGE_DIFF',
      severity: 'low',
      status: 'open',
      details: {
        userFullName,
        plateNumber,
        previousKm: previousKm ?? canonicalKm,
        currentKm: canonicalKm,
        deltaKm,
        notification: travelNotification,
        sourceUnit,
        sourceReading: rawSourceReading,
      },
      reviewer_id: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    store.anomalyAlerts.unshift(mileageAlert);
    generatedAlerts.push(mileageAlert);

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
    sourceUnit?: 'km' | 'mi';
    sourceReading?: number | null;
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

    const sourceUnit = input.sourceUnit ?? 'km';
    const rawSourceReading = input.sourceReading ?? input.odometerKm;
    // Pre-calculate canonical KM using standard factor 1.60934 if submitted in miles
    const canonicalFuelKm =
      sourceUnit === 'mi'
        ? toCanonicalKm(rawSourceReading, 'mi')
        : Math.round(input.odometerKm * 100) / 100;

    if (canonicalFuelKm < todayLog.odometer_km) {
      throw new Error(
        `Fuel purchase odometer reading (${canonicalFuelKm} km) cannot be lower than today's verified daily log reading (${todayLog.odometer_km} km).`
      );
    }

    // Calculate variance from last submitted daily log to fuel purchase point
    const deltaKm = Math.max(0, Math.round((canonicalFuelKm - todayLog.odometer_km) * 100) / 100);

    const user =
      (await this.getStaffProfile(input.userId)) ||
      store.profiles.find((p) => p.id === input.userId);
    const vehicle = store.vehicles.find((v) => v.id === input.vehicleId);
    const userFullName = user?.full_name || 'Staff Member';
    const plateNumber = vehicle?.plate_number || 'Unknown Vehicle';
    const varianceNotification = formatFuelVarianceNotification(userFullName, plateNumber, deltaKm);

    const newTxId = `fuel-${Date.now()}`;
    const newTx: FuelTransaction = {
      id: newTxId,
      vehicle_id: input.vehicleId,
      user_id: input.userId,
      daily_log_id: todayLog.id,
      payment_method: input.paymentMethod,
      tom_card_id: input.tomCardId ?? null,
      vendor_name: input.vendorName,
      odometer_km: canonicalFuelKm,
      source_unit: sourceUnit,
      source_reading: rawSourceReading,
      canonical_reading_km: canonicalFuelKm,
      odometer_evidence_id: input.odometerEvidenceId,
      receipt_evidence_id: input.receiptEvidenceId,
      amount: input.amount,
      currency: input.currency ?? 'NGN',
      quantity_litres: input.quantityLitres,
      purchased_at: input.purchasedAt,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      idempotency_key: input.idempotencyKey,
    };

    store.fuelTransactions.push(newTx);

    // Standardized Administrative Alerts: FUEL_PURCHASE_VARIANCE is the exclusive fuel alert
    const generatedAlerts: AnomalyAlert[] = [];
    const fuelAlert: AnomalyAlert = {
      id: `alert-${Date.now()}-fuel-${Math.random().toString(36).substring(7)}`,
      vehicle_id: input.vehicleId,
      daily_log_id: input.dailyLogId ?? todayLog.id,
      fuel_transaction_id: newTxId,
      rule_code: 'FUEL_PURCHASE_VARIANCE',
      severity: 'low',
      status: 'open',
      details: {
        userFullName,
        plateNumber,
        lastLogKm: todayLog.odometer_km,
        fuelKm: canonicalFuelKm,
        deltaKm,
        notification: varianceNotification,
        sourceUnit,
        sourceReading: rawSourceReading,
      },
      reviewer_id: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    store.anomalyAlerts.unshift(fuelAlert);
    generatedAlerts.push(fuelAlert);

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
    email?: string;
    phoneNumber?: string;
    employeeId?: string;
    plateNumber: string;
    tomCardNumber?: string;
    officeId?: string;
    carName?: string;
    carModel?: string;
    carYear?: number;
    make?: string;
    model?: string;
    year?: number;
    odometerKm?: number;
    vin?: string;
    department?: string;
    role?: string;
    password?: string;
    requestedRole?: UserRole;
    adminPasscode?: string;
  }): Promise<RegistrationRequest> {
    syncFromLocalStorage();
    const normalizedPlate = normalizePlateNumber(input.plateNumber);
    const now = new Date().toISOString();

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
    if (input.employeeId && input.employeeId.trim()) {
      const cleanEmpId = input.employeeId.trim().toUpperCase();
      const existingProfileWithEmpId = store.profiles.find(
        (p) => p.employee_id && p.employee_id.trim().toUpperCase() === cleanEmpId
      );
      if (existingProfileWithEmpId) {
        throw new Error(`Staff ID "${cleanEmpId}" is already registered to another user account. Kindly sign in.`);
      }
    }

    if (input.email && input.email.trim()) {
      const cleanEmail = input.email.trim().toLowerCase();
      const existingProfileWithEmail = store.profiles.find(
        (p) => p.email && p.email.trim().toLowerCase() === cleanEmail
      );
      if (existingProfileWithEmail) {
        throw new Error('Email is already registered to another user account. Kindly sign in.');
      }
    }

    // Attempt centralized server registration for cross-device persistence
    if (isBrowserRuntime()) {
      try {
        const res = await fetch('/api/auth/register-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: input.fullName,
            employeeId: input.employeeId,
            email: input.email,
            phoneNumber: input.phoneNumber,
            plateNumber: normalizedPlate,
            password: input.password,
            officeId: input.officeId,
            carName: input.carName,
            carModel: input.carModel,
            carYear: input.carYear || input.year,
            tomCardNumber: input.tomCardNumber,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Registration failed.');
        }

        const json = await res.json();
        if (json?.data) {
          const { profile, vehicle, assignment, tomCard, registrationRequest } = json.data;
          if (profile) store.profiles.push(profile);
          if (vehicle) store.vehicles.push(vehicle);
          if (assignment) store.assignments.push(assignment);
          if (tomCard) store.tomCards.push(tomCard);
          if (registrationRequest) store.registrationRequests.push(registrationRequest);
          store.userRoles.push({ userId: profile.id, role: 'staff' });
          persistToLocalStorage();
          return registrationRequest;
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        if (errorObj.message && !errorObj.message.includes('fetch failed')) {
          throw errorObj;
        }
      }
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const newProfile: Profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: input.fullName.trim(),
      email: input.email?.trim().toLowerCase() || null,
      phone_number: input.phoneNumber?.trim() ?? null,
      employee_id: input.employeeId?.trim() ?? `DRV-${Date.now().toString().slice(-4)}`,
      office_id: input.officeId || DEFAULT_OFFICES[0].id,
      status: 'active', // Auto-authorized immediately
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };
    store.profiles.push(newProfile);
    store.userRoles.push({ userId, role: assignedRole });

    // 4. Automatically provision vehicle with active status
    const vehicleId = `v-${Date.now()}`;
    const vehicleMake = input.make?.trim() || input.carName?.trim() || 'Company Vehicle';
    const vehicleModel = input.model?.trim() || input.carModel?.trim() || 'Standard Fleet';
    const vehicle: Vehicle = {
      id: vehicleId,
      plate_number: normalizedPlate,
      make: vehicleMake,
      model: vehicleModel,
      car_name: input.carName?.trim() || `${vehicleMake} ${vehicleModel}`,
      year: input.year || input.carYear || new Date().getFullYear(),
      current_odometer_km: input.odometerKm || 0,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    store.vehicles.push(vehicle);

    // 5. Automatically provision vehicle assignment
    store.assignments.push({
      id: `asg-${Date.now()}`,
      user_id: userId,
      vehicle_id: vehicleId,
      starts_at: now,
      ends_at: null,
      assigned_by: 'SYSTEM_AUTO',
      created_at: now,
    });

    // 6. Automatically provision TOM Card if provided
    if (input.tomCardNumber && input.tomCardNumber.trim()) {
      store.tomCards.push({
        id: `tc-${Date.now()}`,
        card_reference: input.tomCardNumber.trim(),
        masked_card_number: input.tomCardNumber.trim(),
        vehicle_id: vehicleId,
        user_id: userId,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
    }

    // 7. Auto-approve registration request record
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
      requested_office_id: input.officeId || DEFAULT_OFFICES[0].id,
      requested_role: assignedRole,
      status: 'approved',
      reviewer_id: 'SYSTEM_AUTO',
      reviewed_at: now,
      rejection_reason: null,
      created_at: now,
    };
    store.registrationRequests.push(req);

    // Audit Events
    store.auditEvents.push({
      id: `audit-${Date.now()}-1`,
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
      created_at: now,
    });

    store.auditEvents.push({
      id: `audit-${Date.now()}-2`,
      actor_id: 'SYSTEM_AUTO',
      action: 'REGISTRATION_AUTO_APPROVED',
      entity_type: 'REGISTRATION_REQUEST',
      entity_id: reqId,
      before_data: { status: 'pending' },
      after_data: { status: 'approved', vehicle_id: vehicleId, plate_number: normalizedPlate },
      created_at: now,
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
  async getDashboardMetrics(filter?: {
    startDate?: string | null;
    endDate?: string | null;
  }): Promise<DashboardMetrics> {
    syncFromLocalStorage();
    const today = getBusinessDate();
    const totalUsers = store.profiles.length;
    const activeStaff = store.profiles.filter((p) => p.status === 'active').length;
    const totalVehicles = store.vehicles.length;
    const activeVehicles = store.vehicles.filter((v) => v.status === 'active').length;

    const hasFilter = Boolean(filter?.startDate || filter?.endDate);
    const isSingleDay =
      Boolean(filter?.startDate) &&
      Boolean(filter?.endDate) &&
      filter?.startDate === filter?.endDate;
    const isTodayFilter = filter?.startDate === today && filter?.endDate === today;

    // Daily logs filtering
    const submittedToday = store.dailyLogs.filter((l) => l.business_date === today).length;
    const logsInRange = hasFilter
      ? store.dailyLogs.filter((l) =>
          isDateInRange(l.business_date || l.submitted_at, filter?.startDate ?? null, filter?.endDate ?? null)
        )
      : store.dailyLogs;

    const submittedLogs = logsInRange.length;
    const uniqueVehiclesLogged = new Set(logsInRange.map((l) => l.vehicle_id)).size;

    const missingDailyLogs = isTodayFilter || (!hasFilter)
      ? Math.max(0, activeVehicles - submittedToday)
      : isSingleDay
      ? Math.max(0, activeVehicles - submittedLogs)
      : Math.max(0, activeVehicles - uniqueVehiclesLogged);

    // Fuel transactions filtering
    const fuelTransactionsToday = store.fuelTransactions.filter(
      (f) => f.purchased_at.startsWith(today) || f.submitted_at.startsWith(today)
    ).length;
    const fuelInRange = hasFilter
      ? store.fuelTransactions.filter((f) =>
          isDateInRange(f.purchased_at || f.submitted_at, filter?.startDate ?? null, filter?.endDate ?? null)
        )
      : store.fuelTransactions;

    const fuelTransactionsCount = fuelInRange.length;
    const totalFuelExpenditure = fuelInRange.reduce((acc, curr) => acc + curr.amount, 0);
    const totalFuelExpenditureAllTime = store.fuelTransactions.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    const totalLitres = fuelInRange.reduce((acc, curr) => acc + (curr.quantity_litres || 0), 0);

    // Anomalies filtering (standardized rules only: DAILY_MILEAGE_DIFF, FUEL_PURCHASE_VARIANCE)
    const ALLOWED_NOTIFICATION_RULES = new Set(['DAILY_MILEAGE_DIFF', 'FUEL_PURCHASE_VARIANCE']);
    const allowedAlerts = store.anomalyAlerts.filter((a) =>
      ALLOWED_NOTIFICATION_RULES.has(a.rule_code)
    );

    const alertsInRange = hasFilter
      ? allowedAlerts.filter((a) =>
          isDateInRange(a.created_at, filter?.startDate ?? null, filter?.endDate ?? null)
        )
      : allowedAlerts;

    const openAnomalies = hasFilter
      ? alertsInRange.filter((a) => a.status === 'open' || a.status === 'investigating').length
      : allowedAlerts.filter((a) => a.status === 'open' || a.status === 'investigating').length;

    const totalAnomaliesInRange = alertsInRange.length;
    const resolvedAnomaliesInRange = alertsInRange.filter((a) => a.status === 'resolved').length;

    // Active fleet utilization in range
    const vehiclesActiveInRange = new Set([
      ...logsInRange.map((l) => l.vehicle_id),
      ...fuelInRange.map((f) => f.vehicle_id),
    ]).size;

    const driversActiveInRange = new Set([
      ...logsInRange.map((l) => l.user_id),
      ...fuelInRange.map((f) => f.user_id),
    ]).size;

    const pendingApprovals = store.registrationRequests.filter((r) => r.status === 'pending').length;

    return {
      totalUsers,
      activeStaff,
      totalVehicles,
      activeVehicles,
      submittedLogs,
      submittedToday,
      missingDailyLogs,
      uniqueVehiclesLogged,
      fuelTransactionsCount,
      fuelTransactionsToday,
      totalFuelExpenditure,
      totalFuelExpenditureAllTime,
      totalLitres,
      openAnomalies,
      totalAnomaliesInRange,
      resolvedAnomaliesInRange,
      vehiclesActiveInRange,
      driversActiveInRange,
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
    const ALLOWED_NOTIFICATION_RULES = new Set(['DAILY_MILEAGE_DIFF', 'FUEL_PURCHASE_VARIANCE']);
    return store.anomalyAlerts
      .filter((alert) => ALLOWED_NOTIFICATION_RULES.has(alert.rule_code))
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

  /**
   * Secure Forgot Password Engine: Initiates recovery by looking up user via plate number, phone, or email.
   * Generates a 6-digit numeric recovery code valid for 10 minutes.
   */
  async initiatePasswordReset(identifier: string): Promise<{
    success: boolean;
    message: string;
    maskedContact: string;
    recoveryCode: string;
    expiresAt: string;
  }> {
    syncFromLocalStorage();
    await this.syncWithServer();
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new Error('Please enter your plate number or corporate email address.');
    }
    const isEmail = trimmed.includes('@');

    let matchedUser: Profile | null = null;
    let contactInfo = '';

    if (isEmail) {
      const emailLower = trimmed.toLowerCase();
      matchedUser = store.profiles.find((p) => p.email?.toLowerCase() === emailLower) || null;
      contactInfo = matchedUser?.email || trimmed;
    } else {
      const normalizedPlate = normalizePlateNumber(trimmed);
      const vehicle = store.vehicles.find((v) => normalizePlateNumber(v.plate_number) === normalizedPlate);
      if (vehicle) {
        const asg = store.assignments.find((a) => a.vehicle_id === vehicle.id && a.ends_at === null);
        if (asg) {
          matchedUser = store.profiles.find((p) => p.id === asg.user_id) || null;
        }
      }
      if (!matchedUser) {
        // Also check by phone number
        const cleanPhone = trimmed.replace(/\D/g, '');
        if (cleanPhone.length >= 7) {
          matchedUser = store.profiles.find((p) => p.phone_number?.replace(/\D/g, '') === cleanPhone) || null;
        }
      }
      contactInfo = matchedUser?.phone_number || matchedUser?.email || normalizedPlate;
    }

    if (!matchedUser) {
      throw new Error(
        isEmail
          ? 'No account found matching this corporate email address.'
          : 'No active staff assignment found matching this vehicle plate number.'
      );
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const resetToken: PasswordResetToken = {
      id: `prt-${Date.now()}`,
      user_id: matchedUser.id,
      identifier: trimmed,
      token_code: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
      created_at: new Date().toISOString(),
    };

    if (!store.resetTokens) store.resetTokens = [];
    store.resetTokens.push(resetToken);
    persistToLocalStorage();

    // Mask contact for privacy display
    let masked = contactInfo;
    if (contactInfo.includes('@')) {
      const [local, domain] = contactInfo.split('@');
      masked = `${local.slice(0, 1)}***@${domain}`;
    } else if (contactInfo.length >= 6) {
      masked = `${contactInfo.slice(0, 3)}***${contactInfo.slice(-2)}`;
    }

    return {
      success: true,
      message: 'Security recovery code generated successfully.',
      maskedContact: masked,
      recoveryCode: otpCode,
      expiresAt,
    };
  },

  /**
   * Verifies the 6-digit recovery code and updates the user's password.
   */
  async verifyAndResetPassword(input: {
    identifier: string;
    code: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    syncFromLocalStorage();
    await this.syncWithServer();

    if (!input.newPassword || input.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters in length.');
    }

    const trimmedIdentifier = input.identifier.trim();
    const trimmedCode = input.code.trim();

    if (!store.resetTokens) store.resetTokens = [];

    // Find the latest active token for this identifier or matching user
    const token = store.resetTokens
      .slice()
      .reverse()
      .find((t) => {
        if (t.used) return false;
        if (t.identifier.toLowerCase() === trimmedIdentifier.toLowerCase()) return true;
        const normalized = normalizePlateNumber(trimmedIdentifier);
        if (normalizePlateNumber(t.identifier) === normalized) return true;
        return false;
      });

    if (!token) {
      throw new Error('No active password reset request found. Please request a new recovery code.');
    }

    if (new Date(token.expires_at).getTime() < Date.now()) {
      throw new Error('The recovery code has expired. Please request a new one.');
    }

    if (token.attempts >= 5) {
      token.used = true;
      persistToLocalStorage();
      throw new Error('Maximum verification attempts exceeded. Please initiate a new recovery request.');
    }

    if (token.token_code !== trimmedCode) {
      token.attempts += 1;
      persistToLocalStorage();
      throw new Error(`Invalid recovery code. ${5 - token.attempts} attempts remaining.`);
    }

    // Code matches! Update user password
    const user = store.profiles.find((p) => p.id === token.user_id);
    if (!user) {
      throw new Error('Associated user profile could not be found.');
    }

    user.password_hash = await hashPassword(input.newPassword);
    user.updated_at = new Date().toISOString();
    token.used = true;

    // Audit event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity_type: 'USER',
      entity_id: user.id,
      before_data: null,
      after_data: { user_id: user.id, reset_at: user.updated_at },
      created_at: new Date().toISOString(),
    });

    persistToLocalStorage();
    return {
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new credentials.',
    };
  },

  /**
   * Verifies user password credentials during login.
   * Supports seamless backward-compatible onboarding if user has not yet set a password hash.
   */
  async verifyUserPassword(userId: string, passwordInput: string): Promise<boolean> {
    syncFromLocalStorage();
    const user = store.profiles.find((p) => p.id === userId);
    if (!user) return false;

    // If account was created prior to password requirement, bootstrap on first valid password entry
    if (!user.password_hash) {
      if (passwordInput && passwordInput.length >= 6) {
        user.password_hash = await hashPassword(passwordInput);
        persistToLocalStorage();
        return true;
      }
      return true;
    }

    return verifyPassword(passwordInput, user.password_hash);
  },
};
