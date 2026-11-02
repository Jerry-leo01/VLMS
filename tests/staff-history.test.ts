import { describe, it, expect } from 'vitest';
import { isDateInRange, getPresetDateRange, shiftDateRange, formatDynamicRangeLabel } from '../src/lib/date-utils';
import { DailyLog, FuelTransaction } from '../src/types/database';

describe('Staff History Date Filtering & Range Logic', () => {
  const mockLogs: Partial<DailyLog>[] = [
    {
      id: 'log-1',
      vehicle_id: 'v-corolla-01',
      business_date: '2026-11-01',
      submitted_at: '2026-11-01T08:30:00.000Z',
      odometer_km: 45000,
      status: 'verified',
    },
    {
      id: 'log-2',
      vehicle_id: 'v-corolla-01',
      business_date: '2026-11-02',
      submitted_at: '2026-11-02T09:15:00.000Z',
      odometer_km: 45075,
      status: 'verified',
    },
    {
      id: 'log-3',
      vehicle_id: 'v-corolla-01',
      business_date: '2026-10-25',
      submitted_at: '2026-10-25T17:00:00.000Z',
      odometer_km: 44800,
      status: 'verified',
    },
  ];

  const mockFuelTx: Partial<FuelTransaction>[] = [
    {
      id: 'fuel-1',
      vehicle_id: 'v-corolla-01',
      purchased_at: '2026-11-02T14:20:00.000Z',
      submitted_at: '2026-11-02T14:25:00.000Z',
      amount: 32000,
      quantity_litres: 35,
    },
    {
      id: 'fuel-2',
      vehicle_id: 'v-corolla-01',
      purchased_at: '2026-10-20T11:00:00.000Z',
      submitted_at: '2026-10-20T11:05:00.000Z',
      amount: 28000,
      quantity_litres: 30,
    },
  ];

  it('should include all logs and fuel transactions when dateRange preset is "all"', () => {
    const range = getPresetDateRange('all');
    const filteredLogs = mockLogs.filter((l) =>
      isDateInRange(l.business_date || l.submitted_at, range.startDate, range.endDate)
    );
    const filteredFuel = mockFuelTx.filter((f) =>
      isDateInRange(f.purchased_at || f.submitted_at, range.startDate, range.endDate)
    );

    expect(filteredLogs.length).toBe(3);
    expect(filteredFuel.length).toBe(2);
  });

  it('should accurately filter logs and transactions for a specific single-day range', () => {
    const range = getPresetDateRange('custom', '2026-11-02', '2026-11-02');
    const filteredLogs = mockLogs.filter((l) =>
      isDateInRange(l.business_date || l.submitted_at, range.startDate, range.endDate)
    );
    const filteredFuel = mockFuelTx.filter((f) =>
      isDateInRange(f.purchased_at || f.submitted_at, range.startDate, range.endDate)
    );

    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].id).toBe('log-2');

    expect(filteredFuel.length).toBe(1);
    expect(filteredFuel[0].id).toBe('fuel-1');
  });

  it('should correctly step back and forward through periods for staff history navigation', () => {
    const refDate = new Date('2026-11-02T12:00:00Z');
    const todayRange = getPresetDateRange('today', null, null, refDate);
    expect(todayRange.startDate).toBe('2026-11-02');

    const yesterdayRange = shiftDateRange(todayRange, 'prev');
    expect(yesterdayRange.startDate).toBe('2026-11-01');
    expect(yesterdayRange.endDate).toBe('2026-11-01');

    const logsYesterday = mockLogs.filter((l) =>
      isDateInRange(l.business_date || l.submitted_at, yesterdayRange.startDate, yesterdayRange.endDate)
    );
    expect(logsYesterday.length).toBe(1);
    expect(logsYesterday[0].id).toBe('log-1');

    // Shift forward back to today
    const backToToday = shiftDateRange(yesterdayRange, 'next');
    expect(backToToday.startDate).toBe('2026-11-02');
  });

  it('should return empty list when no staff history falls in the selected date window', () => {
    const range = getPresetDateRange('custom', '2026-01-01', '2026-01-07');
    const filteredLogs = mockLogs.filter((l) =>
      isDateInRange(l.business_date || l.submitted_at, range.startDate, range.endDate)
    );
    const filteredFuel = mockFuelTx.filter((f) =>
      isDateInRange(f.purchased_at || f.submitted_at, range.startDate, range.endDate)
    );

    expect(filteredLogs.length).toBe(0);
    expect(filteredFuel.length).toBe(0);
  });
});
