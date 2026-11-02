import { format, subDays, startOfMonth, parseISO, isValid } from 'date-fns';
import { getBusinessDate } from './utils';

export type DatePreset =
  | 'all'
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'month_to_date'
  | 'custom';

export interface DateRangeSelection {
  preset: DatePreset;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
  label: string;
}

/**
 * Calculates start and end dates (YYYY-MM-DD) for a given preset.
 */
export function getPresetDateRange(
  preset: DatePreset,
  customStart?: string | null,
  customEnd?: string | null,
  referenceDate: Date = new Date()
): DateRangeSelection {
  const todayStr = getBusinessDate(); // YYYY-MM-DD in Africa/Lagos timezone
  const todayDate = referenceDate;

  switch (preset) {
    case 'today':
      return {
        preset: 'today',
        startDate: todayStr,
        endDate: todayStr,
        label: 'Today',
      };

    case 'last_7_days': {
      const past7 = subDays(todayDate, 6);
      const startStr = format(past7, 'yyyy-MM-dd');
      return {
        preset: 'last_7_days',
        startDate: startStr,
        endDate: todayStr,
        label: 'Last 7 Days',
      };
    }

    case 'last_30_days': {
      const past30 = subDays(todayDate, 29);
      const startStr = format(past30, 'yyyy-MM-dd');
      return {
        preset: 'last_30_days',
        startDate: startStr,
        endDate: todayStr,
        label: 'Last 30 Days',
      };
    }

    case 'month_to_date': {
      const startMonth = startOfMonth(todayDate);
      const startStr = format(startMonth, 'yyyy-MM-dd');
      return {
        preset: 'month_to_date',
        startDate: startStr,
        endDate: todayStr,
        label: 'Month to Date',
      };
    }

    case 'custom': {
      const start = customStart && customStart.trim().length > 0 ? customStart.trim() : null;
      const end = customEnd && customEnd.trim().length > 0 ? customEnd.trim() : null;
      let label = 'Custom Range';
      if (start && end) {
        label = `${start} to ${end}`;
      } else if (start) {
        label = `From ${start}`;
      } else if (end) {
        label = `Until ${end}`;
      }
      return {
        preset: 'custom',
        startDate: start,
        endDate: end,
        label,
      };
    }

    case 'all':
    default:
      return {
        preset: 'all',
        startDate: null,
        endDate: null,
        label: 'All Time',
      };
  }
}

/**
 * Checks if a target date (ISO timestamp, YYYY-MM-DD, or Date instance) falls within [startDate, endDate].
 * If startDate is null, open from the past.
 * If endDate is null, open to the future.
 * If both are null, returns true (all time).
 */
export function isDateInRange(
  targetDate: string | Date | null | undefined,
  startDate: string | null,
  endDate: string | null
): boolean {
  if (!targetDate) return false;
  if (!startDate && !endDate) return true;

  let targetYmd = '';
  if (typeof targetDate === 'string') {
    // If it's an ISO timestamp e.g. "2026-10-24T17:24:42.000Z", extract YYYY-MM-DD
    if (targetDate.includes('T')) {
      targetYmd = targetDate.split('T')[0];
    } else {
      targetYmd = targetDate.slice(0, 10);
    }
  } else if (targetDate instanceof Date && isValid(targetDate)) {
    targetYmd = format(targetDate, 'yyyy-MM-dd');
  }

  if (!targetYmd || targetYmd.length < 10) return false;

  if (startDate && targetYmd < startDate) {
    return false;
  }
  if (endDate && targetYmd > endDate) {
    return false;
  }
  return true;
}

/**
 * Validates whether startDate is logically before or equal to endDate.
 */
export function isValidDateRange(startDate: string | null, endDate: string | null): boolean {
  if (!startDate || !endDate) return true;
  return startDate <= endDate;
}

/**
 * Formats a display label for the date range selector button.
 */
export function formatDateRangeLabel(selection: DateRangeSelection): string {
  if (selection.preset === 'all') return 'All Time';
  if (selection.preset === 'today') return 'Today';
  if (selection.preset === 'last_7_days') return 'Last 7 Days';
  if (selection.preset === 'last_30_days') return 'Last 30 Days';
  if (selection.preset === 'month_to_date') return 'Month to Date';
  if (selection.startDate && selection.endDate) {
    if (selection.startDate === selection.endDate) return selection.startDate;
    return `${selection.startDate} - ${selection.endDate}`;
  }
  if (selection.startDate) return `From ${selection.startDate}`;
  if (selection.endDate) return `Until ${selection.endDate}`;
  return 'Custom Range';
}
