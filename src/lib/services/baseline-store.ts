import {
  Office,
  Profile,
  UserRole,
  Vehicle,
  VehicleAssignment,
  TomCard,
  RegistrationRequest,
} from '../../types/database';

export const DEFAULT_OFFICES: Office[] = [
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

export const BASELINE_PROFILES: Profile[] = [
  {
    id: 'p-admin-01',
    auth_user_id: 'auth-admin-01',
    full_name: 'Babajide Adeleke',
    email: 'admin@vlms.ng',
    phone_number: '+234 803 123 4567',
    employee_id: 'EMP-ADM-01',
    office_id: '11111111-1111-1111-1111-111111111111',
    status: 'active',
    password_hash: 'vlmsseed01:b78162719a4179f6ede62badeed795270860c6e0a6b6cfb255b77fad50d53e3b', // AdminPassword123!
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'p-fleet-02',
    auth_user_id: 'auth-fleet-02',
    full_name: 'Oluwaseun Adeleke',
    email: 'fleet@vlms.ng',
    phone_number: '+234 802 987 6543',
    employee_id: 'EMP-MGT-02',
    office_id: '11111111-1111-1111-1111-111111111111',
    status: 'active',
    password_hash: 'vlmsseed01:dcc49d5f78d2c56f718ae6f7df114ba7995b042931cea06bf4e777402ef60a26', // FleetPassword123!
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'p-staff-01',
    auth_user_id: 'auth-staff-01',
    full_name: 'Chukwuma Eze',
    email: 'chukwuma@vlms.ng',
    phone_number: '+234 805 555 1212',
    employee_id: 'EMP-DRV-042',
    office_id: '11111111-1111-1111-1111-111111111111',
    status: 'active',
    password_hash: 'vlmsseed01:b161e6acc2b83bc9a12ac0140c570dd2b3ede8515038a7bde849fd397b503898', // DriverPassword123!
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'p-staff-02',
    auth_user_id: 'auth-staff-02',
    full_name: 'Chinedu Okeke',
    email: 'chinedu@vlms.ng',
    phone_number: '+234 807 444 3322',
    employee_id: 'EMP-DRV-043',
    office_id: '22222222-2222-2222-2222-222222222222',
    status: 'active',
    password_hash: 'vlmsseed01:b161e6acc2b83bc9a12ac0140c570dd2b3ede8515038a7bde849fd397b503898', // DriverPassword123!
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const BASELINE_USER_ROLES: { userId: string; role: UserRole }[] = [
  { userId: 'p-admin-01', role: 'administrator' },
  { userId: 'p-fleet-02', role: 'fleet_manager' },
  { userId: 'p-staff-01', role: 'staff' },
  { userId: 'p-staff-02', role: 'staff' },
];

export const BASELINE_VEHICLES: Vehicle[] = [
  {
    id: 'v-toyota-hilux',
    plate_number: 'KJA-842XA',
    make: 'Toyota',
    model: 'Hilux 4x4 Double Cabin',
    car_name: 'Toyota Hilux 4x4',
    year: 2022,
    current_odometer_km: 42150,
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'v-toyota-corolla',
    plate_number: 'ABJ-194LK',
    make: 'Toyota',
    model: 'Corolla 1.8L',
    car_name: 'Toyota Corolla',
    year: 2021,
    current_odometer_km: 28400,
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'v-ford-ranger',
    plate_number: 'PHC-552XY',
    make: 'Ford',
    model: 'Ranger XLT',
    car_name: 'Ford Ranger XLT',
    year: 2023,
    current_odometer_km: 15300,
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'v-toyota-hiace',
    plate_number: 'EKY-772TN',
    make: 'Toyota',
    model: 'HiAce Commuter Bus',
    car_name: 'Toyota HiAce Bus',
    year: 2020,
    current_odometer_km: 89500,
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'v-nissan-navara',
    plate_number: 'APP-902BG',
    make: 'Nissan',
    model: 'Navara PRO-4X',
    car_name: 'Nissan Navara PRO-4X',
    year: 2022,
    current_odometer_km: 36200,
    status: 'maintenance',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const BASELINE_ASSIGNMENTS: VehicleAssignment[] = [
  {
    id: 'asg-01',
    user_id: 'p-staff-01',
    vehicle_id: 'v-toyota-hilux',
    starts_at: '2026-01-01T08:00:00.000Z',
    ends_at: null,
    assigned_by: 'p-admin-01',
    created_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'asg-02',
    user_id: 'p-staff-02',
    vehicle_id: 'v-toyota-corolla',
    starts_at: '2026-01-01T08:00:00.000Z',
    ends_at: null,
    assigned_by: 'p-admin-01',
    created_at: '2026-01-01T08:00:00.000Z',
  },
];

export const BASELINE_TOM_CARDS: TomCard[] = [
  {
    id: 'tc-01',
    card_reference: '804689',
    masked_card_number: '7004 **** **** 1024',
    vehicle_id: 'v-toyota-hilux',
    user_id: 'p-staff-01',
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'tc-02',
    card_reference: '700438',
    masked_card_number: '7004 **** **** 3819',
    vehicle_id: 'v-toyota-corolla',
    user_id: 'p-staff-02',
    status: 'active',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const BASELINE_REGISTRATION_REQUESTS: RegistrationRequest[] = [
  {
    id: 'reg-01',
    user_id: 'p-staff-01',
    requested_plate_number: 'KJA-842XA',
    requested_tom_card: '804689',
    requested_office_id: '11111111-1111-1111-1111-111111111111',
    requested_role: 'staff',
    status: 'approved',
    reviewer_id: 'p-admin-01',
    reviewed_at: '2026-01-01T08:00:00.000Z',
    rejection_reason: null,
    created_at: '2026-01-01T08:00:00.000Z',
  },
];

export function getBaselineStore() {
  return {
    offices: [...DEFAULT_OFFICES],
    profiles: [...BASELINE_PROFILES],
    userRoles: [...BASELINE_USER_ROLES],
    vehicles: [...BASELINE_VEHICLES],
    assignments: [...BASELINE_ASSIGNMENTS],
    tomCards: [...BASELINE_TOM_CARDS],
    registrationRequests: [...BASELINE_REGISTRATION_REQUESTS],
    evidenceFiles: [],
    dailyLogs: [],
    fuelTransactions: [],
    anomalyAlerts: [],
    auditEvents: [],
    resetTokens: [],
  };
}
