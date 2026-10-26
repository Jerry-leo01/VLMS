import { describe, it, expect } from 'vitest';
import {
  extractOdometerNumber,
  extractOdometerDetails,
  detectOdometerUnit,
  extractReceiptData,
  extractDashboardTelemetry,
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

  it('should accurately resolve LCD odometer cluster with ODO 123456 and MPH dial', () => {
    const clusterSample = 'SPEEDOMETER 200 120 MPH ODO 123456';
    const number = extractOdometerNumber(clusterSample);
    expect(number).toBe(123456);

    const details = extractOdometerDetails(clusterSample);
    expect(details.proposedReading).toBe(123456);
    expect(details.detectedUnit).toBe('mi');
    // 123456 * 1.609344 = 198683.173248 -> 198683.17
    expect(details.canonicalKm).toBe(198683.17);
  });

  it('should accurately resolve 7-segment LCD OCR artifacts (0D0 123456)', () => {
    const segmentedOdo = 'CLUSTER DIAL 0D0 123456';
    expect(extractOdometerNumber(segmentedOdo)).toBe(123456);
    const details = extractOdometerDetails(segmentedOdo);
    expect(details.proposedReading).toBe(123456);
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
  it('should extract station name, date/time, total amount, and litres from receipt text', () => {
    const receiptSample = `
      TOTAL ENERGIES FILLING STATION
      Plot 12 Marina, Lagos
      Date: 22/10/2026 14:32:00
      PUMP: 04
      PRICE/LTR: 850.00
      LITRES: 45.20 LTR
      TOTAL AMOUNT: 38,420.00 NGN
      THANK YOU FOR YOUR PATRONAGE
    `;
    const res = extractReceiptData(receiptSample);
    expect(res.fillingStation).toBe('TOTAL ENERGIES FILLING STATION');
    expect(res.vendorName).toBe('TOTAL ENERGIES FILLING STATION');
    expect(res.transactionDateTime).toBe('22/10/2026 14:32:00');
    expect(res.amount).toBe(38420);
    expect(res.quantityLitres).toBe(45.2);
  });

  it('should accurately parse NNPC Retail with formatted currency and 12-hour timestamp', () => {
    const nnpcReceipt = `
      NNPC RETAIL SERVICE STATION
      Airport Road, Ikeja
      Date: 24-Oct-2026 03:45 PM
      PUMP 02
      RATE: ₦865.00 / LTR
      VOLUME: 50.00 LITRES
      TOTAL PAID: ₦43,250.00
    `;
    const res = extractReceiptData(nnpcReceipt);
    expect(res.fillingStation).toBe('NNPC RETAIL');
    expect(res.transactionDateTime).toBe('24-Oct-2026 03:45 PM');
    expect(res.amount).toBe(43250);
    expect(res.quantityLitres).toBe(50);
  });

  it('should differentiate unit price from total purchase amount and pump numbers', () => {
    const complexReceipt = `
      MOBIL OIL
      Ikorodu Expressway
      PUMP: 12
      RATE PER LTR: 890.00
      NET AMOUNT: 25,000.00
      QTY: 28.09 LTRS
    `;
    const res = extractReceiptData(complexReceipt);
    expect(res.fillingStation).toBe('MOBIL SERVICE STATION');
    expect(res.amount).toBe(25000);
    expect(res.quantityLitres).toBe(28.09);
  });

  it('should resolve degraded receipt headers with OCR character substitutions (T0TAL ENERGIES)', () => {
    const degradedReceipt = `
      T0TAL ENERGIES
      STATION #02 LAGOS
      DATE: 25/10/2026 11:20 AM
      PRICE/L: 865.00
      LITRES: 30.00 LTR
      TOTAL: 25,950.00
    `;
    const res = extractReceiptData(degradedReceipt);
    expect(res.fillingStation).toBe('TOTAL ENERGIES FILLING STATION');
    expect(res.amount).toBe(25950);
    expect(res.quantityLitres).toBe(30);
  });

  it('should mathematically recover missing total amount when unit rate and volume are available', () => {
    const tornReceipt = `
      TOTAL ENERGIES FILLING STATION
      RATE: ₦865.00 / LTR
      VOLUME: 50.00 LITRES
      [TOTAL AMOUNT SMUDGED]
    `;
    const res = extractReceiptData(tornReceipt);
    // 50 * 865 = 43250
    expect(res.amount).toBe(43250);
    expect(res.quantityLitres).toBe(50);
  });

  it('should mathematically recover missing volume in litres when amount and unit rate are available', () => {
    const fadedReceipt = `
      NNPC RETAIL
      PRICE/LTR: ₦900.00
      TOTAL PAID: ₦45,000.00
      [VOLUME TORN AWAY]
    `;
    const res = extractReceiptData(fadedReceipt);
    // 45000 / 900 = 50
    expect(res.quantityLitres).toBe(50);
    expect(res.amount).toBe(45000);
  });
});

describe('Computer Vision Dashboard Telemetry Extraction', () => {
  it('should accurately extract telemetry data and convert MPH to KM', () => {
    const telemetry = extractDashboardTelemetry('057612', 'MPH');
    expect(telemetry.odometer_reading).toBe('057612');
    expect(telemetry.primary_unit).toBe('MPH');
    // 57612 * 1.60934 = 92717.29608 -> 92717.3
    expect(telemetry.converted_to_km).toBe(92717.3);
  });
});
