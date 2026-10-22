import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes vehicle plate numbers consistently:
 * Uppercase, trims extra whitespace, converts multiple spaces or dashes to single standard dash format.
 * E.g. " kja 842  xa " -> "KJA-842XA"
 */
export function normalizePlateNumber(plate: string): string {
  if (!plate) return '';
  const cleaned = plate.trim().toUpperCase().replace(/[\s_]+/g, '-');
  return cleaned.replace(/-+/g, '-');
}

/**
 * Formats a number as Nigerian Naira (NGN) or specified currency
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  if (currency === 'NGN') {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats odometer numbers with km unit
 */
export function formatOdometer(km: number | null | undefined): string {
  if (km === null || km === undefined) return '0 km';
  return `${Number(km).toLocaleString('en-US', { maximumFractionDigits: 1 })} km`;
}

/**
 * Returns the current business date string (YYYY-MM-DD) in Africa/Lagos timezone
 */
export function getBusinessDate(timezone: string = 'Africa/Lagos'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formats full timestamp in Africa/Lagos timezone
 */
export function formatDateTime(isoString: string | null | undefined, timezone: string = 'Africa/Lagos'): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}
