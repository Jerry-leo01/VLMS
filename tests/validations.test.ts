import { describe, it, expect } from 'vitest';
import { normalizePlateNumber, formatCurrency, formatOdometer, getBusinessDate } from '../src/lib/utils';
import { RegistrationSchema, TomCardFuelSchema, PersonalFundFuelSchema } from '../src/lib/validations';

describe('Utility & Validation Tests', () => {
  it('should normalize plate numbers correctly', () => {
    expect(normalizePlateNumber('  kja  842 xa ')).toBe('KJA-842-XA');
    expect(normalizePlateNumber('abj_194_lk')).toBe('ABJ-194-LK');
    expect(normalizePlateNumber('phc-552xy')).toBe('PHC-552XY');
  });

  it('should format currency as Nigerian Naira (NGN)', () => {
    expect(formatCurrency(25000, 'NGN')).toContain('₦25,000.00');
  });

  it('should format odometer readings with km unit', () => {
    expect(formatOdometer(12540.5)).toBe('12,540.5 km');
    expect(formatOdometer(null)).toBe('0 km');
  });

  it('should calculate business date in YYYY-MM-DD format', () => {
    const bDate = getBusinessDate('Africa/Lagos');
    expect(bDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should enforce fixed vendor for TOM Card submissions', () => {
    const validTom = TomCardFuelSchema.safeParse({
      vehicleId: '11111111-1111-1111-1111-111111111111',
      tomCardId: '22222222-2222-2222-2222-222222222222',
      vendorName: 'TOTAL ENERGIES FILLING STATION',
      odometerKm: 32000,
      odometerEvidenceId: '33333333-3333-3333-3333-333333333333',
      amount: 45000,
      quantityLitres: 50,
      purchasedAt: new Date().toISOString(),
      idempotencyKey: 'idem-key-12345678',
    });
    expect(validTom.success).toBe(true);

    const invalidVendorTom = TomCardFuelSchema.safeParse({
      vehicleId: '11111111-1111-1111-1111-111111111111',
      tomCardId: '22222222-2222-2222-2222-222222222222',
      vendorName: 'SHELL FILLING STATION',
      odometerKm: 32000,
      odometerEvidenceId: '33333333-3333-3333-3333-333333333333',
      amount: 45000,
      quantityLitres: 50,
      purchasedAt: new Date().toISOString(),
      idempotencyKey: 'idem-key-12345678',
    });
    expect(invalidVendorTom.success).toBe(false);
  });

  it('should require receipt evidence for personal fund transactions', () => {
    const invalidPersonal = PersonalFundFuelSchema.safeParse({
      vehicleId: '11111111-1111-1111-1111-111111111111',
      vendorName: 'Mobil Oil Ikeja',
      odometerKm: 32000,
      odometerEvidenceId: '33333333-3333-3333-3333-333333333333',
      // Missing receiptEvidenceId
      amount: 25000,
      quantityLitres: 28,
      purchasedAt: new Date().toISOString(),
      idempotencyKey: 'idem-key-87654321',
    });
    expect(invalidPersonal.success).toBe(false);
  });
});
