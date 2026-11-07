import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OdometerUnitToggle } from '../src/components/ui/OdometerUnitToggle';
import { toCanonicalKm, MILES_TO_KM } from '../src/lib/utils';
import { VLMSService } from '../src/lib/services/vlms-service';
import { getBaselineStore } from '../src/lib/services/baseline-store';

describe('OdometerUnitToggle UI Component', () => {
  it('should render both Kilometers (KM) and Miles (MI) buttons with accessible styling', () => {
    const handleChange = vi.fn();
    render(<OdometerUnitToggle unit="km" onChange={handleChange} label="Test Measurement Unit" />);

    expect(screen.getByText('Test Measurement Unit')).toBeDefined();
    const kmBtn = screen.getByRole('button', { name: /Kilometers \(KM\)/i });
    const miBtn = screen.getByRole('button', { name: /Miles \(MI\)/i });

    expect(kmBtn).toBeDefined();
    expect(miBtn).toBeDefined();
    // KM should have active styling classes
    expect(kmBtn.className).toContain('bg-navy-900');
    expect(miBtn.className).not.toContain('bg-navy-900');
  });

  it('should trigger onChange callback with "mi" when Miles button is clicked', () => {
    const handleChange = vi.fn();
    render(<OdometerUnitToggle unit="km" onChange={handleChange} />);

    const miBtn = screen.getByRole('button', { name: /Miles \(MI\)/i });
    fireEvent.click(miBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('mi');
  });

  it('should trigger onChange callback with "km" when Kilometers button is clicked', () => {
    const handleChange = vi.fn();
    render(<OdometerUnitToggle unit="mi" onChange={handleChange} />);

    const kmBtn = screen.getByRole('button', { name: /Kilometers \(KM\)/i });
    fireEvent.click(kmBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('km');
  });

  it('should disable both buttons when disabled prop is true', () => {
    const handleChange = vi.fn();
    render(<OdometerUnitToggle unit="km" onChange={handleChange} disabled={true} />);

    const kmBtn = screen.getByRole('button', { name: /Kilometers \(KM\)/i }) as HTMLButtonElement;
    const miBtn = screen.getByRole('button', { name: /Miles \(MI\)/i }) as HTMLButtonElement;

    expect(kmBtn.disabled).toBe(true);
    expect(miBtn.disabled).toBe(true);

    fireEvent.click(miBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe('Fuel Odometer Unit Precision & Canonical Validation', () => {
  it('should convert miles to canonical kilometers accurately for fuel transactions', () => {
    const miles = 50050;
    // 50,050 * 1.60934 = 80,547.467 -> 80,547.47 km
    const canonicalKm = toCanonicalKm(miles, 'mi');
    expect(canonicalKm).toBe(80547.47);
  });

  it('should reject fuel transactions when canonical KM is lower than daily log KM', async () => {
    // 1. Submit daily log at 50,000 miles (80,467 km)
    const logRes = await VLMSService.submitDailyLog({
      vehicleId: 'b9ae5548-cc4c-4b74-90ba-de739f25e5e4',
      userId: 'cb853d74-445a-4acf-baa3-0c83eaa1538a',
      odometerKm: 80467,
      sourceUnit: 'mi',
      sourceReading: 50000,
      evidenceId: 'ev-test-1',
    });
    expect(logRes.log).toBeDefined();

    // 2. Attempt to submit fuel at 49,990 miles (80,450.91 km < 80,467 km)
    const lowerMiles = 49990;
    const canonicalLowerKm = toCanonicalKm(lowerMiles, 'mi');

    await expect(
      VLMSService.submitFuelTransaction({
        vehicleId: 'b9ae5548-cc4c-4b74-90ba-de739f25e5e4',
        userId: 'cb853d74-445a-4acf-baa3-0c83eaa1538a',
        dailyLogId: logRes.log.id,
        paymentMethod: 'personal_fund',
        vendorName: 'TOTAL FILLING STATION',
        odometerKm: canonicalLowerKm,
        sourceUnit: 'mi',
        sourceReading: lowerMiles,
        odometerEvidenceId: 'ev-test-1',
        receiptEvidenceId: 'ev-test-receipt',
        amount: 30000,
        quantityLitres: 20,
        purchasedAt: new Date().toISOString(),
        idempotencyKey: 'test-idem-reject',
      })
    ).rejects.toThrow(/cannot be lower than today's verified daily log reading/i);
  });

  it('should successfully submit fuel transaction with miles and record both canonical km and source unit', async () => {
    // 1. Submit daily log for second vehicle at 35,000 miles (56,326.9 km)
    const logRes = await VLMSService.submitDailyLog({
      vehicleId: '653d8634-7746-441b-b4a3-84ab62ab3e94',
      userId: '507ba2c3-f438-4939-830e-18460ed5df29',
      odometerKm: 56326.9,
      sourceUnit: 'mi',
      sourceReading: 35000,
      evidenceId: 'ev-test-2',
    });

    // 2. Submit fuel at 35,060 miles (56,423.46 km >= 56,326.9 km)
    const validMiles = 35060;
    const canonicalValidKm = toCanonicalKm(validMiles, 'mi');

    const { transaction } = await VLMSService.submitFuelTransaction({
      vehicleId: '653d8634-7746-441b-b4a3-84ab62ab3e94',
      userId: '507ba2c3-f438-4939-830e-18460ed5df29',
      dailyLogId: logRes.log.id,
      paymentMethod: 'personal_fund',
      vendorName: 'TOTAL FILLING STATION',
      odometerKm: canonicalValidKm,
      sourceUnit: 'mi',
      sourceReading: validMiles,
      odometerEvidenceId: 'ev-test-2',
      receiptEvidenceId: 'ev-test-receipt-2',
      amount: 45000,
      quantityLitres: 30,
      purchasedAt: new Date().toISOString(),
      idempotencyKey: 'test-idem-success',
    });

    expect(transaction).toBeDefined();
    expect(transaction.odometer_km).toBe(56423.46);
    expect(transaction.source_unit).toBe('mi');
    expect(transaction.source_reading).toBe(35060);
  });
});
