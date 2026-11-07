import {
  Office,
  Profile,
  UserRole,
  Vehicle,
  VehicleAssignment,
  TomCard,
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

export const BASELINE_PROFILES: Profile[] = [];

export const BASELINE_USER_ROLES: { userId: string; role: UserRole }[] = [];

export const BASELINE_VEHICLES: Vehicle[] = [];

export const BASELINE_ASSIGNMENTS: VehicleAssignment[] = [];

export const BASELINE_TOM_CARDS: TomCard[] = [];

export function getBaselineStore() {
  return {
    offices: [...DEFAULT_OFFICES],
    profiles: [...BASELINE_PROFILES],
    userRoles: [...BASELINE_USER_ROLES],
    vehicles: [...BASELINE_VEHICLES],
    assignments: [...BASELINE_ASSIGNMENTS],
    tomCards: [...BASELINE_TOM_CARDS],
    evidenceFiles: [],
    dailyLogs: [],
    fuelTransactions: [],
    anomalyAlerts: [],
    auditEvents: [],
    resetTokens: [],
  };
}
