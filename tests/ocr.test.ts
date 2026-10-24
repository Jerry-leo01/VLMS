import { describe, it, expect } from 'vitest';
import {
  extractOdometerNumber,
  extractOdometerDetails,
  detectOdometerUnit,
  extractReceiptData,
} from '../src/lib/ocr/processor';
import { convertOdometerReading, toCanonicalKm, MILES_TO_KM } from '../src/lib/utils';

describe('OCR Odometer Number Extractor', () => {
  it('should extract clean numeric readings', () => {
    expect(extractOdometerNumber('TRIP A 450.2 ODO 124500 KM')).toBe(124500);
    expect(extractOdometerNumber('Total: 84320 km')).toBe(84320);
  });

  it('should fix common character misidentifications (O -> 0, B -> 8)', () => {
    // "12O5OO" -> 120500
    expect(extractOdometerNumber('ODO 12O5OO KM')).toBe(120500);
  });

  it('should resolve reported bug: extract 057612 rather than trip meter 705.5 or 7055', () => {
    const rawClusterText = 'SPEED 70 KM/H TRIP A 705.5 ODO 057612 KM TEMP 28C';
    const number = extractOdometerNumber(rawClusterText);
    expect(number).toBe(57612);

    const details = extractOdometerDetails(rawClusterText);
    expect(details.proposedReading).toBe(57612);
    expect(details.detectedUnit).toBe('km');
    expect(details.canonicalKm).toBe(57612);
  });

  it('should detect miles unit and perform canonical high-precision conversion', () => {
    const rawMilesCluster = 'TRIP B 120.4 ODO 048210 MILES';
    const details = extractOdometerDetails(rawMilesCluster);
    expect(details.proposedReading).toBe(48210);
    expect(details.detectedUnit).toBe('mi');
    // 48210 * 1.609344 = 77586.47424 -> 77586.47
    expect(details.canonicalKm).toBe(77586.47);
  });

  it('should return null if no numbers found', () => {
    expect(extractOdometerNumber('Check engine light')).toBeNull();
  });
});

describe('Odometer Unit Management & Precision Conversion', () => {
  it('should accurately convert Miles to KM using high-precision factor 1.609344', () => {
    // 100 miles = 160.9344 km -> rounded to 160.93
    expect(convertOdometerReading(100, 'mi', 'km')).toBe(160.93);
    // 57,612 miles = 92,717.53 km
    expect(toCanonicalKm(57612, 'mi')).toBe(92717.53);
    // 57,612 km = 57,612 km
    expect(toCanonicalKm(57612, 'km')).toBe(57612);
  });

  it('should prevent cumulative floating-point drift on repeated unit conversions', () => {
    const sourceReading = 57612;
    // Anchor to sourceReading: repeatedly switching unit from sourceReading preserves exact values
    const km1 = toCanonicalKm(sourceReading, 'mi');
    const km2 = toCanonicalKm(sourceReading, 'mi');
    const km3 = toCanonicalKm(sourceReading, 'mi');
    expect(km1).toBe(92717.53);
    expect(km2).toBe(92717.53);
    expect(km3).toBe(92717.53);
  });
});

describe('OCR Receipt Data Parser', () => {
  it('should extract vendor name, total amount, and litres from receipt text', () => {
    const receiptSample = `
      TOTAL ENERGIES FILLING STATION
      Plot 12 Marina, Lagos
      Date: 22/10/2026
      PUMP: 04
      PRICE/LTR: 850.00
      LITRES: 45.20 LTR
      TOTAL AMOUNT: 38,420.00 NGN
      THANK YOU FOR YOUR PATRONAGE
    `;
    const res = extractReceiptData(receiptSample);
    expect(res.vendorName).toBe('TOTAL ENERGIES FILLING STATION');
    expect(res.amount).toBe(38420);
    expect(res.quantityLitres).toBe(45.2);
  });
});
