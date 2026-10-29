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
 * High precision conversion factor: 1 international mile = 1.609344 km
 */
export const MILES_TO_KM = 1.609344;

/**
 * Converts odometer reading between units with high precision (1 mi = 1.609344 km).
 * Rounds result to 2 decimal places to avoid floating point drift.
 */
export function convertOdometerReading(reading: number, fromUnit: 'km' | 'mi', toUnit: 'km' | 'mi'): number {
  if (isNaN(reading) || reading < 0) return 0;
  if (fromUnit === toUnit) return reading;
  if (fromUnit === 'mi' && toUnit === 'km') {
    return Math.round(reading * MILES_TO_KM * 100) / 100;
  }
  if (fromUnit === 'km' && toUnit === 'mi') {
    return Math.round((reading / MILES_TO_KM) * 100) / 100;
  }
  return reading;
}

/**
 * Calculates canonical odometer reading in Kilometres (KM) from source reading and source unit.
 */
export function toCanonicalKm(sourceReading: number, sourceUnit: 'km' | 'mi'): number {
  if (isNaN(sourceReading) || sourceReading < 0) return 0;
  return sourceUnit === 'mi'
    ? Math.round(sourceReading * MILES_TO_KM * 100) / 100
    : sourceReading;
}

/**
 * Formats odometer numbers with km or mi unit
 */
export function formatOdometer(reading: number | null | undefined, unit: 'km' | 'mi' = 'km'): string {
  if (reading === null || reading === undefined) return `0 ${unit}`;
  return `${Number(reading).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit}`;
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

/**
 * Recursively converts arbitrary JSON objects/payloads into clear, human-readable natural text
 */
export function formatJsonToHumanText(data: unknown): string {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);

  if (Array.isArray(data)) {
    if (data.length === 0) return 'None';
    return data.map((item) => formatJsonToHumanText(item)).join(', ');
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return '';

  return entries
    .map(([key, val]) => {
      // Convert snake_case or camelCase into Title Case label
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();

      if (val === null || val === undefined || val === '') {
        return `${label}: None`;
      }
      if (typeof val === 'boolean') {
        return `${label}: ${val ? 'Yes' : 'No'}`;
      }
      if (typeof val === 'number') {
        if (/amount|cost|price|rate/i.test(key)) return `${label}: ${formatCurrency(val)}`;
        if (/km|distance|odometer|reading/i.test(key)) return `${label}: ${formatOdometer(val)}`;
        return `${label}: ${val.toLocaleString()}`;
      }
      if (typeof val === 'object') {
        const nested = formatJsonToHumanText(val);
        return nested ? `${label} (${nested})` : label;
      }
      return `${label}: ${String(val)}`;
    })
    .join(' • ');
}

/**
 * Formats Evidence metadata JSON into clear, categorized human-readable inspection fields
 */
export function formatEvidenceMetadata(
  metadata?: Record<string, unknown> | null
): Array<{ label: string; value: string }> {
  if (!metadata || Object.keys(metadata).length === 0) {
    return [{ label: 'Telemetry Details', value: 'Standard verification telemetry recorded' }];
  }

  const items: Array<{ label: string; value: string }> = [];

  if (metadata.reading !== undefined && metadata.reading !== null) {
    items.push({
      label: 'Confirmed Reading',
      value: formatOdometer(Number(metadata.reading)),
    });
  }
  if (metadata.sourceReading !== undefined && metadata.sourceReading !== null) {
    const unit = String(metadata.sourceUnit || 'km').toUpperCase();
    items.push({
      label: 'Dashboard Reading',
      value: `${Number(metadata.sourceReading).toLocaleString()} ${unit}`,
    });
  }
  if (metadata.sourceUnit) {
    items.push({
      label: 'Measurement Unit',
      value: metadata.sourceUnit === 'mi' ? 'Miles (Imperial)' : 'Kilometers (Metric)',
    });
  }
  if (metadata.ocrProposal !== undefined && metadata.ocrProposal !== null) {
    items.push({
      label: 'OCR Suggested Value',
      value: formatOdometer(Number(metadata.ocrProposal)),
    });
  }
  if (metadata.vendor) {
    items.push({
      label: 'Filling Station / Vendor',
      value: String(metadata.vendor),
    });
  }
  if (metadata.amount !== undefined && metadata.amount !== null) {
    items.push({
      label: 'Receipt Transaction Amount',
      value: formatCurrency(Number(metadata.amount)),
    });
  }
  if (metadata.quantityLitres !== undefined && metadata.quantityLitres !== null) {
    items.push({
      label: 'Fuel Volume',
      value: `${Number(metadata.quantityLitres).toLocaleString()} Litres`,
    });
  }
  if (metadata.transactionDateTime) {
    items.push({
      label: 'Transaction Time',
      value: String(metadata.transactionDateTime),
    });
  }
  if (metadata.ocrConfidence !== undefined && metadata.ocrConfidence !== null) {
    items.push({
      label: 'OCR Optical Confidence',
      value: `${Number(metadata.ocrConfidence)}%`,
    });
  }

  // Any remaining custom fields converted into readable labels
  const handledKeys = new Set([
    'reading',
    'sourceReading',
    'sourceUnit',
    'ocrProposal',
    'vendor',
    'amount',
    'quantityLitres',
    'transactionDateTime',
    'ocrConfidence',
  ]);
  Object.entries(metadata).forEach(([k, v]) => {
    if (!handledKeys.has(k) && v !== null && v !== undefined && v !== '') {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      items.push({ label, value: typeof v === 'object' ? formatJsonToHumanText(v) : String(v) });
    }
  });

  return items.length > 0
    ? items
    : [{ label: 'Telemetry Details', value: 'Standard verification telemetry recorded' }];
}

/**
 * Formats an audit event record into clear, human-readable plain text
 */
export function formatAuditActionText(
  action: string,
  entityType: string,
  afterData?: Record<string, unknown> | null,
  beforeData?: Record<string, unknown> | null
): string {
  if (!afterData && !beforeData) {
    return `${action.replace(/_/g, ' ')} on ${entityType}.`;
  }

  const d = afterData || {};

  switch (action) {
    case 'DAILY_LOG_SUBMITTED':
      return `Submitted daily log with odometer reading of ${formatOdometer(
        Number(d.odometer_km)
      )} for vehicle ${d.vehicle_id || ''}.`;
    case 'FUEL_TRANSACTION_SUBMITTED':
      return `Recorded fuel purchase of ${d.quantity_litres || 0} L (${formatCurrency(
        Number(d.amount || 0)
      )}) via ${String(d.payment_method || '').replace(/_/g, ' ')}.`;
    case 'REGISTRATION_SUBMITTED':
      return `Registration request submitted by ${d.fullName || 'User'} for car ${
        d.carName ? `${d.carName} ` : ''
      }(Plate: ${d.plateNumber || 'N/A'}, Role: ${d.role || 'Staff'}).`;
    case 'REGISTRATION_APPROVED':
      return `Registration approved by administrator. Assigned vehicle active.`;
    case 'REGISTRATION_REJECTED':
      return `Registration rejected: ${d.reason || 'Criteria not met'}.`;
    case 'ANOMALY_STATUS_UPDATED':
      return `Anomaly alert updated to status "${d.status || 'Resolved'}". Note: ${
        d.resolution_note || 'Reviewed'
      }`;
    case 'ADMIN_PROVISIONED':
      return `New management account provisioned for ${d.email || 'administrator'} (Assigned Role: ${String(
        d.role || 'Administrator'
      ).replace(/_/g, ' ')}).`;
    case 'SYSTEM_INITIALIZED':
      return `System initial operational fleet baseline loaded.`;
    default: {
      const humanDetails = formatJsonToHumanText(d);
      return humanDetails
        ? `${action.replace(/_/g, ' ')} on ${entityType}: ${humanDetails}.`
        : `${action.replace(/_/g, ' ')} executed on ${entityType}.`;
    }
  }
}

/**
 * Formats an anomaly rule and diagnostic telemetry into user-friendly plain text
 */
export function formatAnomalyText(ruleCode: string, details?: Record<string, unknown> | null): string {
  const d = details || {};
  switch (ruleCode) {
    case 'ODO_DECREASE':
      return `Reported odometer reading (${formatOdometer(Number(d.currentKm))}) is ${Math.abs(
        Number(d.difference || 0)
      )} km below the previous valid reading (${formatOdometer(Number(d.previousKm))}).`;
    case 'ODO_ZERO_CHANGE':
      return `Odometer reading (${formatOdometer(
        Number(d.currentKm)
      )}) has not changed since the last recorded log (0 km difference).`;
    case 'ODO_HIGH_DAILY_DISTANCE':
      return `Traveled distance of ${Number(d.deltaKm || 0).toLocaleString()} km exceeds the maximum single-day threshold of ${Number(d.thresholdKm || 800)} km.`;
    case 'OCR_LOW_CONFIDENCE':
      return `Camera photograph resulted in low OCR optical confidence (${Number(d.ocrConfidence || 0)}%). Image clarity requires verification.`;
    case 'OCR_MANUAL_MISMATCH':
      return `Staff-confirmed reading (${formatOdometer(
        Number(d.currentKm)
      )}) differs by ${Number(d.difference || 0)} km from the camera OCR proposal (${formatOdometer(
        Number(d.ocrProposedKm)
      )}).`;
    case 'DUPLICATE_EVIDENCE':
      return `Photograph cryptographic hash matches an image that was previously submitted for another fleet log.`;
    case 'MISSING_RECEIPT':
      return `Personal-fund fuel claim was submitted without an attached official fuel receipt photograph.`;
    case 'LOCATION_OUTLIER':
      return `Recorded GPS coordinates (${Number(d.latitude || 0).toFixed(4)}, ${Number(d.longitude || 0).toFixed(4)}) fall outside the standard company branch operating boundary.`;
    default:
      return `Anomaly flagged under rule ${ruleCode}. Supervisory verification recommended.`;
  }
}
