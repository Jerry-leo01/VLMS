import { describe, it, expect } from 'vitest';
import { buildStaffHistoryCsvContent } from '../src/lib/export-utils';
import { getPresetDateRange, isDateInRange } from '../src/lib/date-utils';
import { DailyLog, FuelTransaction, Profile, VehicleAssignment } from '../src/types/database';

describe('Staff History Export & Date Range Synchronization', () => {
  const mockDriver: Profile = {
    id: 'p-test-driver',
    auth_user_id: 'auth-test',
    full_name: 'Babatunde Raji',
    email: 'babatunde@fleetcorp.com',
    phone_number: '+234 802 334 5566',
    employee_id: 'EMP-LAG-5021',
    office_id: '11111111-1111-1111-1111-111111111111',
    status: 'active',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  };

  const mockAssignment: VehicleAssignment = {
    id: 'asg-test',
    user_id: 'p-test-driver',
    vehicle_id: 'v-hilux-01',
    starts_at: '2026-10-01T08:00:00Z',
    ends_at: null,
    assigned_by: 'admin',
    created_at: '2026-10-01T08:00:00Z',
    vehicle: {
      id: 'v-hilux-01',
      plate_number: 'APP-402-JJ',
      make: 'Toyota',
      model: 'Hilux',
      car_name: 'Toyota Hilux 4x4',
      year: 2024,
      status: 'active',
      created_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-01T08:00:00Z',
    },
  };

  const allLogs = [
    {
      id: 'log-oct-31',
      vehicle_id: 'v-hilux-01',
      user_id: 'p-test-driver',
      business_date: '2026-10-31',
      odometer_km: 15100,
      mileage_difference_km: 45,
      evidence_id: 'ev-1',
      status: 'verified',
      submitted_at: '2026-10-31T07:30:00Z',
      created_at: '2026-10-31T07:30:00Z',
    },
    {
      id: 'log-nov-02',
      vehicle_id: 'v-hilux-01',
      user_id: 'p-test-driver',
      business_date: '2026-11-02',
      odometer_km: 15160,
      mileage_difference_km: 60,
      evidence_id: 'ev-2',
      status: 'verified',
      submitted_at: '2026-11-02T07:30:00Z',
      created_at: '2026-11-02T07:30:00Z',
    },
  ] as unknown as DailyLog[];

  const allFuel = [
    {
      id: 'fuel-nov-02',
      vehicle_id: 'v-hilux-01',
      user_id: 'p-test-driver',
      payment_method: 'tom_card',
      vendor_name: 'TotalEnergies Victoria Island',
      odometer_km: 15165,
      amount: 42000,
      quantity_litres: 45.5,
      odometer_evidence_id: 'ev-2',
      receipt_evidence_id: 'ev-rec-1',
      status: 'verified',
      purchased_at: '2026-11-02T11:00:00Z',
      submitted_at: '2026-11-02T11:05:00Z',
    },
  ] as unknown as FuelTransaction[];

  it('generates CSV strictly containing records within selected date range', () => {
    // Custom single-day range for 2026-11-02
    const singleDayRange = getPresetDateRange('custom', '2026-11-02', '2026-11-02');

    const filteredLogs = allLogs.filter((l) =>
      isDateInRange(l.business_date, singleDayRange.startDate, singleDayRange.endDate)
    );
    const filteredFuel = allFuel.filter((f) =>
      isDateInRange(f.purchased_at || f.submitted_at, singleDayRange.startDate, singleDayRange.endDate)
    );

    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].id).toBe('log-nov-02');

    const csv = buildStaffHistoryCsvContent({
      activeTab: 'logs',
      logs: filteredLogs,
      fuel: filteredFuel,
      dateRange: singleDayRange,
      driver: mockDriver,
      assignment: mockAssignment,
    });

    // Contains metadata block
    expect(csv).toContain('Babatunde Raji');
    expect(csv).toContain('EMP-LAG-5021');
    expect(csv).toContain('APP-402-JJ');

    // Contains the single matching log
    expect(csv).toContain('log-nov-02');
    expect(csv).toContain('15160');

    // Must NOT contain the out-of-range log from Oct 31
    expect(csv).not.toContain('log-oct-31');
  });

  it('correctly exports fuel transactions tab with currency amounts and stations', () => {
    const allTimeRange = getPresetDateRange('all');

    const csv = buildStaffHistoryCsvContent({
      activeTab: 'fuel',
      logs: allLogs,
      fuel: allFuel,
      dateRange: allTimeRange,
      driver: mockDriver,
      assignment: mockAssignment,
    });

    expect(csv).toContain('TotalEnergies Victoria Island');
    expect(csv).toContain('42000');
    expect(csv).toContain('45.5');
    expect(csv).toContain('tom_card');
  });
});
