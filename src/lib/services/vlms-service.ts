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
} from '@/types/database';
import { getBusinessDate, normalizePlateNumber } from '@/lib/utils';
import { evaluateAnomalies } from '@/lib/anomaly-engine';

// In-Memory store for development / demo mode when live DB is unconfigured
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

const store: DataStore = {
  offices: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Head Office',
      address: 'Corporate Headquarters, Victoria Island, Lagos State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Lagos Branch',
      address: 'Ikeja Commercial District, Lagos State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'South West Branch',
      address: 'Ibadan Zonal Office, Oyo State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'South South Branch',
      address: 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'South East Branch',
      address: 'Enugu Regional Center, Enugu State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'North Central Branch',
      address: 'Central Business District, Abuja FCT, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'North West Branch',
      address: 'Kano Commercial Hub, Kano State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      name: 'North East Branch',
      address: 'Maiduguri Office, Borno State, Nigeria',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],
  profiles: [
    {
      id: 'p-admin-01',
      auth_user_id: 'auth-admin-01',
      full_name: 'Babajide Adeleke',
      employee_id: 'EMP-ADM-01',
      office_id: '11111111-1111-1111-1111-111111111111',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'p-staff-01',
      auth_user_id: 'auth-staff-01',
      full_name: 'Chukwuma Eze',
      employee_id: 'EMP-DRV-042',
      office_id: '11111111-1111-1111-1111-111111111111',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  userRoles: [
    { userId: 'p-admin-01', role: 'administrator' },
    { userId: 'p-staff-01', role: 'staff' },
  ],
  vehicles: [
    {
      id: 'v-toyota-hilux',
      plate_number: 'KJA-842XA',
      make: 'Toyota',
      model: 'Hilux 4x4 Double Cabin',
      year: 2022,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'v-toyota-corolla',
      plate_number: 'ABJ-194LK',
      make: 'Toyota',
      model: 'Corolla 1.8L',
      year: 2021,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'v-ford-ranger',
      plate_number: 'PHC-552XY',
      make: 'Ford',
      model: 'Ranger XLT',
      year: 2023,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  assignments: [
    {
      id: 'asg-01',
      user_id: 'p-staff-01',
      vehicle_id: 'v-toyota-hilux',
      starts_at: '2026-01-01T08:00:00Z',
      ends_at: null,
      assigned_by: 'p-admin-01',
      created_at: '2026-01-01T08:00:00Z',
    },
  ],
  tomCards: [
    {
      id: 'tc-01',
      card_reference: 'TOM-LAG-001',
      masked_card_number: '7004 **** **** 1024',
      vehicle_id: 'v-toyota-hilux',
      user_id: 'p-staff-01',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  registrationRequests: [
    {
      id: 'reg-demo-pending',
      user_id: 'p-pending-01',
      requested_plate_number: 'ABJ-194LK',
      requested_tom_card: '7004 **** **** 3819',
      requested_office_id: '22222222-2222-2222-2222-222222222222',
      status: 'pending',
      reviewer_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
    },
  ],
  evidenceFiles: [
    {
      id: 'ev-seed-01',
      storage_bucket: 'vlms-evidence',
      storage_path: 'odometer/seed-hilux-01.jpg',
      evidence_type: 'daily_odometer',
      sha256_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      captured_at: new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      mime_type: 'image/jpeg',
      file_size_bytes: 450200,
      metadata: { reading: 45200 },
      verification_status: 'verified',
    },
  ],
  dailyLogs: [],
  fuelTransactions: [],
  anomalyAlerts: [],
  auditEvents: [
    {
      id: 'audit-01',
      actor_id: 'p-admin-01',
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SYSTEM',
      entity_id: '11111111-1111-1111-1111-111111111111',
      before_data: null,
      after_data: { version: '1.0.0' },
      created_at: new Date().toISOString(),
    },
  ],
};

// Insert a pending profile for the demo registration request
store.profiles.push({
  id: 'p-pending-01',
  auth_user_id: 'auth-pending-01',
  full_name: 'Fatima Garba',
  employee_id: 'EMP-ABJ-019',
  office_id: '22222222-2222-2222-2222-222222222222',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const VLMSService = {
  // Off-line / Demo / DB Hybrid Store Access
  async getOffices(): Promise<Office[]> {
    return store.offices;
  },

  async getVehicles(): Promise<Vehicle[]> {
    return store.vehicles;
  },

  async getVehicleByPlate(plateNumber: string): Promise<Vehicle | undefined> {
    const normalized = plateNumber.trim().toUpperCase();
    return store.vehicles.find((v) => v.plate_number === normalized);
  },

  async getStaffProfile(userId: string): Promise<Profile | undefined> {
    const profile = store.profiles.find((p) => p.id === userId);
    if (!profile) return undefined;

    const roles = store.userRoles.filter((r) => r.userId === userId).map((r) => r.role);
    const office = store.offices.find((o) => o.id === profile.office_id);
    return { ...profile, roles, office };
  },

  async getActiveAssignment(userId: string): Promise<VehicleAssignment | undefined> {
    const asg = store.assignments.find((a) => a.user_id === userId && a.ends_at === null);
    if (!asg) return undefined;
    const vehicle = store.vehicles.find((v) => v.id === asg.vehicle_id);
    return { ...asg, vehicle };
  },

  async getTomCardForVehicle(vehicleId: string): Promise<TomCard | undefined> {
    return store.tomCards.find((tc) => tc.vehicle_id === vehicleId && tc.status === 'active');
  },

  // Today's Daily Log lookup
  async getTodayLog(vehicleId: string): Promise<DailyLog | undefined> {
    const today = getBusinessDate();
    const log = store.dailyLogs.find((l) => l.vehicle_id === vehicleId && l.business_date === today);
    if (!log) return undefined;
    const evidence = store.evidenceFiles.find((e) => e.id === log.evidence_id);
    return { ...log, evidence };
  },

  async getLatestOdometer(vehicleId: string): Promise<number | undefined> {
    // Check daily logs and fuel transactions for this vehicle
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
    return logKm ?? fuelKm ?? 45000; // sensible initial baseline
  },

  // Submit Daily Log (With database-level unique constraint simulation)
  async submitDailyLog(input: {
    vehicleId: string;
    userId: string;
    odometerKm: number;
    ocrReadingKm?: number | null;
    ocrConfidence?: number | null;
    evidenceId: string;
    comment?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    gpsAccuracyM?: number | null;
  }): Promise<{ log: DailyLog; anomalies: AnomalyAlert[] }> {
    const today = getBusinessDate();

    // Enforce unique (vehicle_id, business_date)
    const existing = store.dailyLogs.find(
      (l) => l.vehicle_id === input.vehicleId && l.business_date === today
    );
    if (existing) {
      throw new Error(`A daily vehicle log has already been submitted for this vehicle today (${today}). Duplicate submissions are not permitted.`);
    }

    const previousKm = await this.getLatestOdometer(input.vehicleId);

    // Run Anomaly Detection Engine
    const detected = evaluateAnomalies({
      currentKm: input.odometerKm,
      previousKm,
      ocrProposedKm: input.ocrReadingKm,
      ocrConfidence: input.ocrConfidence,
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
        daily_log_id: input.dailyLogId ?? null,
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
        amount: input.amount,
        quantity_litres: input.quantityLitres,
        odometer_km: input.odometerKm,
      },
      created_at: new Date().toISOString(),
    });

    return { transaction: newTx, anomalies: generatedAlerts };
  },

  // Save Evidence File
  async saveEvidenceFile(fileData: {
    evidenceType: 'daily_odometer' | 'fuel_odometer' | 'fuel_receipt' | 'other';
    sha256Hash: string;
    mimeType: string;
    fileSizeBytes: number;
    metadata?: Record<string, unknown>;
  }): Promise<EvidenceFile> {
    const id = `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newEvidence: EvidenceFile = {
      id,
      storage_bucket: 'vlms-evidence',
      storage_path: `evidence/${fileData.evidenceType}/${id}.jpg`,
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
    return newEvidence;
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
    const normalizedPlate = normalizePlateNumber(input.plateNumber);

    // 1. Data Integrity: Enforce Unique constraint on vehicle plate number
    const existingVehicle = store.vehicles.find((v) => v.plate_number === normalizedPlate);
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

    // 3. Role Management: Privileged Role Key Check
    const assignedRole: UserRole = input.requestedRole || 'staff';
    if (assignedRole !== 'staff') {
      const validPasscode = process.env.ADMIN_REGISTRATION_PASSCODE || 'VLMS-ADMIN-2026';
      if (!input.adminPasscode || input.adminPasscode.trim() !== validPasscode) {
        throw new Error('Invalid administrative authorization key for privileged role registration.');
      }
    }

    const userId = `p-user-${Date.now()}`;
    const newProfile: Profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: input.fullName,
      phone_number: input.phoneNumber ?? null,
      employee_id: input.employeeId ?? null,
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
      requested_tom_card: input.tomCardNumber ?? null,
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

    return req;
  },

  async approveRegistration(requestId: string, adminId: string): Promise<RegistrationRequest> {
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

    // Assign vehicle if exists
    let vehicle = store.vehicles.find((v) => v.plate_number === req.requested_plate_number);
    if (!vehicle) {
      // Auto-register vehicle with requested car specifications
      vehicle = {
        id: `v-${Date.now()}`,
        plate_number: req.requested_plate_number,
        make: req.requested_car_name || 'Toyota',
        model: req.requested_car_model || 'Corolla',
        car_name: req.requested_car_name || 'Company Car',
        year: req.requested_car_year || 2023,
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

    // Audit event
    store.auditEvents.push({
      id: `audit-${Date.now()}`,
      actor_id: adminId,
      action: 'REGISTRATION_APPROVED',
      entity_type: 'REGISTRATION_REQUEST',
      entity_id: requestId,
      before_data: { status: 'pending' },
      after_data: { status: 'approved', vehicle_id: vehicle.id },
      created_at: new Date().toISOString(),
    });

    return req;
  },

  async rejectRegistration(requestId: string, adminId: string, reason: string): Promise<RegistrationRequest> {
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

    return req;
  },

  // Management Master Dashboard Metrics
  async getDashboardMetrics() {
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
    const openAnomalies = store.anomalyAlerts.filter((a) => a.status === 'open' || a.status === 'investigating').length;
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
    return store.dailyLogs.map((log) => {
      const vehicle = store.vehicles.find((v) => v.id === log.vehicle_id);
      const user = store.profiles.find((u) => u.id === log.user_id);
      const evidence = store.evidenceFiles.find((e) => e.id === log.evidence_id);
      return { ...log, vehicle, user, evidence };
    });
  },

  async getAllFuelTransactions(): Promise<FuelTransaction[]> {
    return store.fuelTransactions.map((tx) => {
      const vehicle = store.vehicles.find((v) => v.id === tx.vehicle_id);
      const user = store.profiles.find((u) => u.id === tx.user_id);
      const tom_card = store.tomCards.find((t) => t.id === tx.tom_card_id);
      const odometer_evidence = store.evidenceFiles.find((e) => e.id === tx.odometer_evidence_id);
      const receipt_evidence = store.evidenceFiles.find((e) => e.id === tx.receipt_evidence_id);
      return { ...tx, vehicle, user, tom_card, odometer_evidence, receipt_evidence };
    });
  },

  async getAllAnomalies(): Promise<AnomalyAlert[]> {
    return store.anomalyAlerts.map((alert) => {
      const vehicle = store.vehicles.find((v) => v.id === alert.vehicle_id);
      return { ...alert, vehicle };
    });
  },

  async resolveAnomaly(alertId: string, reviewerId: string, status: 'investigating' | 'resolved' | 'dismissed', note: string): Promise<AnomalyAlert> {
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

    return alert;
  },

  async getAuditEvents(): Promise<AuditEvent[]> {
    return store.auditEvents
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((ev) => {
        const actor = store.profiles.find((p) => p.id === ev.actor_id);
        return { ...ev, actor };
      });
  },

  async getRegistrationRequests(): Promise<RegistrationRequest[]> {
    return store.registrationRequests.map((req) => {
      const user = store.profiles.find((p) => p.id === req.user_id);
      const requested_office = store.offices.find((o) => o.id === req.requested_office_id);
      return { ...req, user, requested_office };
    });
  },
};
