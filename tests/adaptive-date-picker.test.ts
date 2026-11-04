import { describe, it, expect } from 'vitest';
import {
  getPresetDateRange,
  isDateInRange,
  isValidDateRange,
  formatDynamicRangeLabel,
  formatDateRangeLabel,
  shiftDateRange,
  getMonthCalendarDays,
  DateRangeSelection,
} from '../src/lib/date-utils';
import { getBusinessDate } from '../src/lib/utils';
import { subDays, startOfMonth, format, parseISO } from 'date-fns';

describe('Advanced Adaptive Date Picker & Range Utilities', () => {
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
    const range = getPresetDateRange('today');
    expect(range.preset).toBe('today');
    expect(range.startDate).toBe(getBusinessDate());
    expect(range.endDate).toBe(getBusinessDate());
    expect(range.label).toBe('Today');
  });

  it('should correctly compute "this_week", "this_month", and "this_year" presets', () => {
    const weekRange = getPresetDateRange('this_week', null, null, referenceDate);
    expect(weekRange.preset).toBe('this_week');
    expect(weekRange.startDate).toBe('2026-11-02'); // Monday Nov 2, 2026
    expect(weekRange.endDate).toBe('2026-11-08');   // Sunday Nov 8, 2026

    const monthRange = getPresetDateRange('this_month', null, null, referenceDate);
    expect(monthRange.preset).toBe('this_month');
    expect(monthRange.startDate).toBe('2026-11-01');
    expect(monthRange.endDate).toBe('2026-11-30');

    const yearRange = getPresetDateRange('this_year', null, null, referenceDate);
    expect(yearRange.preset).toBe('this_year');
    expect(yearRange.startDate).toBe('2026-01-01');
    expect(yearRange.endDate).toBe('2026-12-31');
  });

  it('should correctly compute "last_7_days" preset', () => {
    const range = getPresetDateRange('last_7_days', null, null, referenceDate);
    const expectedStart = format(subDays(referenceDate, 6), 'yyyy-MM-dd');
    expect(range.preset).toBe('last_7_days');
    expect(range.startDate).toBe(expectedStart);
    expect(range.endDate).toBe(todayYmd);
  });

  it('should correctly compute "last_30_days" and "month_to_date" presets', () => {
    const last30 = getPresetDateRange('last_30_days', null, null, referenceDate);
    expect(last30.preset).toBe('last_30_days');
    expect(last30.startDate).toBe(format(subDays(referenceDate, 29), 'yyyy-MM-dd'));

    const mtd = getPresetDateRange('month_to_date', null, null, referenceDate);
    expect(mtd.preset).toBe('month_to_date');
    expect(mtd.startDate).toBe('2026-11-01');
  });

  it('should correctly handle "custom" preset with user-supplied bounds', () => {
    const range = getPresetDateRange('custom', '2026-10-01', '2026-10-25', referenceDate);
    expect(range.preset).toBe('custom');
    expect(range.startDate).toBe('2026-10-01');
    expect(range.endDate).toBe('2026-10-25');
    expect(formatDynamicRangeLabel(range)).toBe('Oct 1 - 25, 2026');
  });

  it('should validate date ranges and reject start dates after end dates', () => {
    expect(isValidDateRange('2026-10-01', '2026-10-15')).toBe(true);
    expect(isValidDateRange('2026-10-15', '2026-10-15')).toBe(true);
    expect(isValidDateRange('2026-10-20', '2026-10-10')).toBe(false);
    expect(isValidDateRange(null, '2026-10-10')).toBe(true);
    expect(isValidDateRange('2026-10-10', null)).toBe(true);
    expect(isValidDateRange(null, null)).toBe(true);
  });

  describe('Period Shifting Logic (shiftDateRange)', () => {
    it('should step "today" backward and forward by 1 day', () => {
      const today = { preset: 'today' as const, startDate: '2026-11-02', endDate: '2026-11-02', label: 'Today' };
      const yesterday = shiftDateRange(today, 'prev');
      expect(yesterday.startDate).toBe('2026-11-01');
      expect(yesterday.endDate).toBe('2026-11-01');

      const tomorrow = shiftDateRange(today, 'next');
      expect(tomorrow.startDate).toBe('2026-11-03');
      expect(tomorrow.endDate).toBe('2026-11-03');
    });

    it('should step "this_week" backward and forward by 1 week', () => {
      const week = { preset: 'this_week' as const, startDate: '2026-11-02', endDate: '2026-11-08', label: 'This week' };
      const prevWeek = shiftDateRange(week, 'prev');
      expect(prevWeek.startDate).toBe('2026-10-26');
      expect(prevWeek.endDate).toBe('2026-11-01');

      const nextWeek = shiftDateRange(week, 'next');
      expect(nextWeek.startDate).toBe('2026-11-09');
      expect(nextWeek.endDate).toBe('2026-11-15');
    });

    it('should step "this_month" backward and forward by 1 month', () => {
      const month = { preset: 'this_month' as const, startDate: '2026-11-01', endDate: '2026-11-30', label: 'This month' };
      const prevMonth = shiftDateRange(month, 'prev');
      expect(prevMonth.startDate).toBe('2026-10-01');
      expect(prevMonth.endDate).toBe('2026-10-31');

      const nextMonth = shiftDateRange(month, 'next');
      expect(nextMonth.startDate).toBe('2026-12-01');
      expect(nextMonth.endDate).toBe('2026-12-31');
    });

    it('should step custom n-day span backward and forward by its span length', () => {
      // 3 days: Nov 1 to Nov 3 (span = 3 days)
      const custom = { preset: 'custom' as const, startDate: '2026-11-01', endDate: '2026-11-03', label: 'Nov 1 - 3, 2026' };
      const prev = shiftDateRange(custom, 'prev');
      expect(prev.startDate).toBe('2026-10-29');
      expect(prev.endDate).toBe('2026-10-31');

      const next = shiftDateRange(custom, 'next');
      expect(next.startDate).toBe('2026-11-04');
      expect(next.endDate).toBe('2026-11-06');
    });

    it('should not alter "all" preset when shift is triggered', () => {
      const all = { preset: 'all' as const, startDate: null, endDate: null, label: 'All Time' };
      expect(shiftDateRange(all, 'prev')).toEqual(all);
      expect(shiftDateRange(all, 'next')).toEqual(all);
    });
  });

  describe('Dynamic Range Formatting (formatDynamicRangeLabel)', () => {
    it('should format single day as "Nov 2, 2026"', () => {
      const single = { preset: 'today' as const, startDate: '2026-11-02', endDate: '2026-11-02', label: '' };
      expect(formatDynamicRangeLabel(single)).toBe('Nov 2, 2026');
    });

    it('should format same month range as "Nov 1 - 2, 2026"', () => {
      const range = { preset: 'custom' as const, startDate: '2026-11-01', endDate: '2026-11-02', label: '' };
      expect(formatDynamicRangeLabel(range)).toBe('Nov 1 - 2, 2026');
    });

    it('should format cross-month range as "Oct 27 - Nov 2, 2026"', () => {
      const range = { preset: 'custom' as const, startDate: '2026-10-27', endDate: '2026-11-02', label: '' };
      expect(formatDynamicRangeLabel(range)).toBe('Oct 27 - Nov 2, 2026');
    });

    it('should format cross-year range as "Dec 28, 2025 - Jan 3, 2026"', () => {
      const range = { preset: 'custom' as const, startDate: '2025-12-28', endDate: '2026-01-03', label: '' };
      expect(formatDynamicRangeLabel(range)).toBe('Dec 28, 2025 - Jan 3, 2026');
    });
  });

  describe('Calendar Grid Generation (getMonthCalendarDays)', () => {
    it('should generate complete month grid cells covering Sundays to Saturdays', () => {
      const monthDays = getMonthCalendarDays(referenceDate);
      expect(monthDays.length).toBeGreaterThanOrEqual(35);
      expect(monthDays.length % 7).toBe(0);

      // Verify that November days have isCurrentMonth = true
      const nov1 = monthDays.find((d) => d.dateStr === '2026-11-01');
      expect(nov1).toBeDefined();
      expect(nov1?.isCurrentMonth).toBe(true);

      // Verify padding days from October have isCurrentMonth = false
      const oct31 = monthDays.find((d) => d.dateStr === '2026-10-31');
      if (oct31) {
        expect(oct31.isCurrentMonth).toBe(false);
      }
    });
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
      expect(isDateInRange('2026-01-01', null, '2026-10-20')).toBe(true);
      expect(isDateInRange('2026-10-25', null, '2026-10-20')).toBe(false);
      expect(isDateInRange('2026-10-15', '2026-10-10', null)).toBe(true);
      expect(isDateInRange('2026-10-05', '2026-10-10', null)).toBe(false);
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
