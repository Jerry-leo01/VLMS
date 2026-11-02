import { describe, it, expect } from 'vitest';
import {
  getPresetDateRange,
  isDateInRange,
  isValidDateRange,
  formatDateRangeLabel,
  DateRangeSelection,
} from '../src/lib/date-utils';
import { getBusinessDate } from '../src/lib/utils';
import { subDays, startOfMonth, format } from 'date-fns';

describe('Adaptive Date Picker & Date Range Utilities', () => {
  const referenceDate = new Date('2026-11-02T10:00:00.000Z');
  const todayYmd = format(referenceDate, 'yyyy-MM-dd');

  it('should correctly compute "all" preset as unbounded null range', () => {
    const range = getPresetDateRange('all', null, null, referenceDate);
    expect(range.preset).toBe('all');
    expect(range.startDate).toBeNull();
    expect(range.endDate).toBeNull();
    expect(range.label).toBe('All Time');
    expect(formatDateRangeLabel(range)).toBe('All Time');
  });

  it('should correctly compute "today" preset', () => {
    const range = getPresetDateRange('today', null, null, referenceDate);
    expect(range.preset).toBe('today');
    expect(range.startDate).toBe(getBusinessDate());
    expect(range.endDate).toBe(getBusinessDate());
    expect(range.label).toBe('Today');
    expect(formatDateRangeLabel(range)).toBe('Today');
  });

  it('should correctly compute "last_7_days" preset (7 calendar days inclusive)', () => {
    const range = getPresetDateRange('last_7_days', null, null, referenceDate);
    const expectedStart = format(subDays(referenceDate, 6), 'yyyy-MM-dd');
    expect(range.preset).toBe('last_7_days');
    expect(range.startDate).toBe(expectedStart);
    expect(range.endDate).toBe(todayYmd);
    expect(range.label).toBe('Last 7 Days');
    expect(formatDateRangeLabel(range)).toBe('Last 7 Days');
  });

  it('should correctly compute "last_30_days" preset (30 calendar days inclusive)', () => {
    const range = getPresetDateRange('last_30_days', null, null, referenceDate);
    const expectedStart = format(subDays(referenceDate, 29), 'yyyy-MM-dd');
    expect(range.preset).toBe('last_30_days');
    expect(range.startDate).toBe(expectedStart);
    expect(range.endDate).toBe(todayYmd);
    expect(range.label).toBe('Last 30 Days');
    expect(formatDateRangeLabel(range)).toBe('Last 30 Days');
  });

  it('should correctly compute "month_to_date" preset from 1st of month', () => {
    const range = getPresetDateRange('month_to_date', null, null, referenceDate);
    const expectedStart = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
    expect(range.preset).toBe('month_to_date');
    expect(range.startDate).toBe(expectedStart);
    expect(range.endDate).toBe(todayYmd);
    expect(range.label).toBe('Month to Date');
    expect(formatDateRangeLabel(range)).toBe('Month to Date');
  });

  it('should correctly handle "custom" preset with user-supplied bounds', () => {
    const range = getPresetDateRange('custom', '2026-10-01', '2026-10-25', referenceDate);
    expect(range.preset).toBe('custom');
    expect(range.startDate).toBe('2026-10-01');
    expect(range.endDate).toBe('2026-10-25');
    expect(range.label).toBe('2026-10-01 to 2026-10-25');
    expect(formatDateRangeLabel(range)).toBe('2026-10-01 - 2026-10-25');
  });

  it('should validate date ranges and reject start dates after end dates', () => {
    expect(isValidDateRange('2026-10-01', '2026-10-15')).toBe(true);
    expect(isValidDateRange('2026-10-15', '2026-10-15')).toBe(true);
    expect(isValidDateRange('2026-10-20', '2026-10-10')).toBe(false);
    expect(isValidDateRange(null, '2026-10-10')).toBe(true);
    expect(isValidDateRange('2026-10-10', null)).toBe(true);
    expect(isValidDateRange(null, null)).toBe(true);
  });

  describe('isDateInRange Filtering Logic', () => {
    const start = '2026-10-10';
    const end = '2026-10-20';

    it('should include dates strictly inside the window', () => {
      expect(isDateInRange('2026-10-15', start, end)).toBe(true);
      expect(isDateInRange('2026-10-15T14:30:00.000Z', start, end)).toBe(true);
      expect(isDateInRange(new Date('2026-10-15T08:00:00.000Z'), start, end)).toBe(true);
    });

    it('should include exact boundary start and end dates (inclusive)', () => {
      expect(isDateInRange('2026-10-10', start, end)).toBe(true);
      expect(isDateInRange('2026-10-10T00:00:00.000Z', start, end)).toBe(true);
      expect(isDateInRange('2026-10-20', start, end)).toBe(true);
      expect(isDateInRange('2026-10-20T23:59:59.000Z', start, end)).toBe(true);
    });

    it('should exclude dates outside the window', () => {
      expect(isDateInRange('2026-10-09', start, end)).toBe(false);
      expect(isDateInRange('2026-10-09T23:59:59.000Z', start, end)).toBe(false);
      expect(isDateInRange('2026-10-21', start, end)).toBe(false);
      expect(isDateInRange('2026-10-21T00:00:00.000Z', start, end)).toBe(false);
    });

    it('should handle unbounded start (open-ended past) or unbounded end', () => {
      // Unbounded past: everything <= end is true
      expect(isDateInRange('2026-01-01', null, '2026-10-20')).toBe(true);
      expect(isDateInRange('2026-10-25', null, '2026-10-20')).toBe(false);

      // Unbounded future: everything >= start is true
      expect(isDateInRange('2026-10-15', '2026-10-10', null)).toBe(true);
      expect(isDateInRange('2026-10-05', '2026-10-10', null)).toBe(false);

      // Unbounded both: all dates true
      expect(isDateInRange('2020-05-12', null, null)).toBe(true);
      expect(isDateInRange('2030-12-31', null, null)).toBe(true);
    });

    it('should return false for null, undefined, or empty date strings', () => {
      expect(isDateInRange(null, start, end)).toBe(false);
      expect(isDateInRange(undefined, start, end)).toBe(false);
      expect(isDateInRange('', start, end)).toBe(false);
    });
  });
});
