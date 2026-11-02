import {
  format,
  subDays,
  addDays,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  subYears,
  addYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isValid,
  differenceInCalendarDays,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { getBusinessDate } from './utils';

export type DatePreset =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_year'
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

    case 'this_week': {
      // Week starting Monday (weekStartsOn: 1)
      const startW = startOfWeek(todayDate, { weekStartsOn: 1 });
      const endW = endOfWeek(todayDate, { weekStartsOn: 1 });
      return {
        preset: 'this_week',
        startDate: format(startW, 'yyyy-MM-dd'),
        endDate: format(endW, 'yyyy-MM-dd'),
        label: 'This week',
      };
    }

    case 'this_month': {
      const startM = startOfMonth(todayDate);
      const endM = endOfMonth(todayDate);
      return {
        preset: 'this_month',
        startDate: format(startM, 'yyyy-MM-dd'),
        endDate: format(endM, 'yyyy-MM-dd'),
        label: 'This month',
      };
    }

    case 'this_year': {
      const startY = startOfYear(todayDate);
      const endY = endOfYear(todayDate);
      return {
        preset: 'this_year',
        startDate: format(startY, 'yyyy-MM-dd'),
        endDate: format(endY, 'yyyy-MM-dd'),
        label: 'This year',
      };
    }

    case 'last_7_days': {
      const past7 = subDays(todayDate, 6);
      return {
        preset: 'last_7_days',
        startDate: format(past7, 'yyyy-MM-dd'),
        endDate: todayStr,
        label: 'Last 7 Days',
      };
    }

    case 'last_30_days': {
      const past30 = subDays(todayDate, 29);
      return {
        preset: 'last_30_days',
        startDate: format(past30, 'yyyy-MM-dd'),
        endDate: todayStr,
        label: 'Last 30 Days',
      };
    }

    case 'month_to_date': {
      const startMonth = startOfMonth(todayDate);
      return {
        preset: 'month_to_date',
        startDate: format(startMonth, 'yyyy-MM-dd'),
        endDate: todayStr,
        label: 'Month to Date',
      };
    }

    case 'custom': {
      const start = customStart && customStart.trim().length > 0 ? customStart.trim() : null;
      const end = customEnd && customEnd.trim().length > 0 ? customEnd.trim() : null;
      let label = 'Custom Range';
      if (start && end) {
        label = formatDynamicRangeLabel({ preset: 'custom', startDate: start, endDate: end, label: '' });
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
 * Shifts an active date range backward or forward according to its period.
 */
export function shiftDateRange(
  current: DateRangeSelection,
  direction: 'prev' | 'next'
): DateRangeSelection {
  if (current.preset === 'all' || !current.startDate || !current.endDate) {
    return current;
  }

  const s = parseISO(current.startDate);
  const e = parseISO(current.endDate);
  if (!isValid(s) || !isValid(e)) return current;

  let newStart = s;
  let newEnd = e;

  if (current.preset === 'today') {
    newStart = direction === 'next' ? addDays(s, 1) : subDays(s, 1);
    newEnd = newStart;
  } else if (current.preset === 'this_week') {
    newStart = direction === 'next' ? addWeeks(s, 1) : subWeeks(s, 1);
    newEnd = direction === 'next' ? addWeeks(e, 1) : subWeeks(e, 1);
  } else if (current.preset === 'this_month') {
    const moved = direction === 'next' ? addMonths(s, 1) : subMonths(s, 1);
    newStart = startOfMonth(moved);
    newEnd = endOfMonth(moved);
  } else if (current.preset === 'this_year') {
    const moved = direction === 'next' ? addYears(s, 1) : subYears(s, 1);
    newStart = startOfYear(moved);
    newEnd = endOfYear(moved);
  } else {
    // Custom range or n-day span
    const spanDays = differenceInCalendarDays(e, s) + 1;
    newStart = direction === 'next' ? addDays(s, spanDays) : subDays(s, spanDays);
    newEnd = direction === 'next' ? addDays(e, spanDays) : subDays(e, spanDays);
  }

  const startStr = format(newStart, 'yyyy-MM-dd');
  const endStr = format(newEnd, 'yyyy-MM-dd');
  const dynamicLabel = formatDynamicRangeLabel({
    preset: current.preset,
    startDate: startStr,
    endDate: endStr,
    label: '',
  });

  return {
    preset: current.preset,
    startDate: startStr,
    endDate: endStr,
    label: dynamicLabel,
  };
}

/**
 * Formats a clean, modern range string for the trigger pill:
 * - Single day: "Nov 2, 2026"
 * - Same month: "Nov 1 - 2, 2026"
 * - Different month, same year: "Oct 27 - Nov 2, 2026"
 * - Cross year: "Dec 28, 2025 - Jan 3, 2026"
 */
export function formatDynamicRangeLabel(selection: DateRangeSelection): string {
  if (selection.preset === 'all' || !selection.startDate) {
    return 'All Time';
  }

  const s = parseISO(selection.startDate);
  const e = selection.endDate ? parseISO(selection.endDate) : s;

  if (!isValid(s) || !isValid(e)) {
    return selection.label || 'Select Date';
  }

  // Single date
  if (isSameDay(s, e)) {
    return format(s, 'MMM d, yyyy');
  }

  // Same month & year
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, 'MMM d')} - ${format(e, 'd, yyyy')}`;
  }

  // Different month, same year
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
  }

  // Cross year
  return `${format(s, 'MMM d, yyyy')} - ${format(e, 'MMM d, yyyy')}`;
}

/**
 * Backwards-compatible alias for formatDynamicRangeLabel
 */
export function formatDateRangeLabel(selection: DateRangeSelection): string {
  if (selection.preset === 'all') return 'All Time';
  if (selection.preset === 'today' && selection.startDate === getBusinessDate()) return 'Today';
  return formatDynamicRangeLabel(selection);
}

/**
 * Checks if a target date (ISO timestamp, YYYY-MM-DD, or Date instance) falls within [startDate, endDate].
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

export interface CalendarDayCell {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates an array of CalendarDayCell objects covering the full month grid (with padding days).
 */
export function getMonthCalendarDays(monthDate: Date): CalendarDayCell[] {
  const startM = startOfMonth(monthDate);
  const endM = endOfMonth(monthDate);

  // Grid starts on Sunday (weekStartsOn: 0)
  const gridStart = startOfWeek(startM, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endM, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const todayStr = getBusinessDate();

  return allDays.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return {
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: isSameMonth(d, monthDate),
      isToday: dateStr === todayStr,
    };
  });
}
