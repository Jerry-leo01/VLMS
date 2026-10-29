import { describe, it, expect } from 'vitest';
import {
  normalizePlateNumber,
  formatCurrency,
  formatOdometer,
  getBusinessDate,
  formatAuditActionText,
  formatAnomalyText,
  formatJsonToHumanText,
  formatEvidenceMetadata,
} from '../src/lib/utils';
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

  it('should validate registration with phone number, car specs, and 6-digit numeric TOM card', () => {
    // Valid registration
    const valid = RegistrationSchema.safeParse({
      fullName: 'Amina Yusuf',
      phoneNumber: '+2348031234567',
      plateNumber: 'KJA-104-AB',
      carName: 'Toyota Camry Hybrid',
      carModel: 'Camry XLE',
      carYear: '2022',
      tomCardNumber: '804689',
      officeId: '11111111-1111-1111-1111-111111111111',
      requestedRole: 'staff',
      password: 'SecurePassword123!',
      privacyAccepted: true,
    });
    expect(valid.success).toBe(true);

    // Invalid TOM card: not 6 digits (5 digits or non-numeric)
    const invalidTom5 = RegistrationSchema.safeParse({
      fullName: 'Amina Yusuf',
      phoneNumber: '+2348031234567',
      plateNumber: 'KJA-104-AB',
      carName: 'Toyota Camry Hybrid',
      carModel: 'Camry XLE',
      carYear: '2022',
      tomCardNumber: '80468', // only 5 digits
      officeId: '11111111-1111-1111-1111-111111111111',
      requestedRole: 'staff',
      password: 'SecurePassword123!',
      privacyAccepted: true,
    });
    expect(invalidTom5.success).toBe(false);

    const invalidTomLetters = RegistrationSchema.safeParse({
      fullName: 'Amina Yusuf',
      phoneNumber: '+2348031234567',
      plateNumber: 'KJA-104-AB',
      carName: 'Toyota Camry Hybrid',
      carModel: 'Camry XLE',
      carYear: '2022',
      tomCardNumber: 'TOM804', // non-numeric
      officeId: '11111111-1111-1111-1111-111111111111',
      requestedRole: 'staff',
      password: 'SecurePassword123!',
      privacyAccepted: true,
    });
    expect(invalidTomLetters.success).toBe(false);

    // Privileged role without adminPasscode should fail
    const privilegedWithoutPasscode = RegistrationSchema.safeParse({
      fullName: 'Chief Auditor',
      phoneNumber: '+2348031234567',
      plateNumber: 'KJA-104-AB',
      carName: 'Toyota Corolla',
      carModel: 'LE',
      carYear: '2023',
      officeId: '11111111-1111-1111-1111-111111111111',
      requestedRole: 'auditor',
      password: 'SecurePassword123!',
      privacyAccepted: true,
    });
    expect(privilegedWithoutPasscode.success).toBe(false);

    // Privileged role with correct adminPasscode should succeed
    const privilegedWithPasscode = RegistrationSchema.safeParse({
      fullName: 'Chief Auditor',
      phoneNumber: '+2348031234567',
      plateNumber: 'KJA-104-AB',
      carName: 'Toyota Corolla',
      carModel: 'LE',
      carYear: '2023',
      officeId: '11111111-1111-1111-1111-111111111111',
      requestedRole: 'auditor',
      adminPasscode: 'VLMS-ADMIN-2026',
      password: 'SecurePassword123!',
      privacyAccepted: true,
    });
    expect(privilegedWithPasscode.success).toBe(true);
  });

  it('should convert audit action JSON into human-readable plain text', () => {
    const text1 = formatAuditActionText('DAILY_LOG_SUBMITTED', 'daily_logs', {
      odometer_km: 45200,
      vehicle_id: 'KJA-842-XA',
    });
    expect(text1).toContain('Submitted daily log with odometer reading of 45,200 km for vehicle KJA-842-XA.');

    const text2 = formatAuditActionText('FUEL_TRANSACTION_SUBMITTED', 'fuel_transactions', {
      payment_method: 'tom_card',
      amount: 45000,
      quantity_litres: 50,
      vendor_name: 'TOTAL ENERGIES FILLING STATION',
    });
    expect(text2).toContain('Recorded fuel purchase of 50 L (₦45,000.00) via tom card.');

    const text3 = formatAuditActionText('REGISTRATION_APPROVED', 'profiles', {});
    expect(text3).toContain('Registration approved by administrator. Assigned vehicle active.');
  });

  it('should convert anomaly rule codes and telemetry into human-readable plain text', () => {
    const desc = formatAnomalyText('ODO_DECREASE', {
      previousKm: 45000,
      currentKm: 42000,
      difference: -3000,
    });
    expect(desc).toContain('Reported odometer reading (42,000 km) is 3000 km below the previous valid reading (45,000 km).');

    const descLowConf = formatAnomalyText('OCR_LOW_CONFIDENCE', {
      ocrConfidence: 42,
    });
    expect(descLowConf).toContain('Camera photograph resulted in low OCR optical confidence (42%). Image clarity requires verification.');

    const descMismatch = formatAnomalyText('OCR_MANUAL_MISMATCH', {
      currentKm: 50100,
      ocrProposedKm: 50050,
      difference: 50,
    });
    expect(descMismatch).toContain('Staff-confirmed reading (50,100 km) differs by 50 km from the camera OCR proposal (50,050 km).');
  });

  it('should convert arbitrary JSON payloads and evidence metadata into clean human-readable text', () => {
    const rawJson = {
      plateNumber: 'KJA-842XA',
      odometerReading: 91308,
      totalAmount: 38500,
      isActive: true,
    };
    const humanText = formatJsonToHumanText(rawJson);
    expect(humanText).toContain('Plate Number: KJA-842XA');
    expect(humanText).toContain('Odometer Reading: 91,308 km');
    expect(humanText).toContain('Total Amount: ₦38,500.00');
    expect(humanText).toContain('Is Active: Yes');

    const metadataFields = formatEvidenceMetadata({
      reading: 91308,
      sourceReading: 91308,
      sourceUnit: 'mi',
      ocrProposal: 91308,
      vendor: 'TOTAL ENERGIES FILLING STATION',
      amount: 45000,
    });
    expect(metadataFields.some((f) => f.label === 'Confirmed Reading' && f.value === '91,308 km')).toBe(true);
    expect(metadataFields.some((f) => f.label === 'Measurement Unit' && f.value === 'Miles (Imperial)')).toBe(true);
    expect(metadataFields.some((f) => f.label === 'Filling Station / Vendor' && f.value.includes('TOTAL ENERGIES'))).toBe(true);
  });
});
