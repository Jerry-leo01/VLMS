import { describe, it, expect } from 'vitest';
import { evaluateAnomalies } from '../src/lib/anomaly-engine';

describe('Anomaly Detection Engine', () => {
  it('should detect ODO_DECREASE when current reading is lower than previous', () => {
    const alerts = evaluateAnomalies({
      currentKm: 45000,
      previousKm: 45200,
    });
    const decreaseAlert = alerts.find((a) => a.ruleCode === 'ODO_DECREASE');
    expect(decreaseAlert).toBeDefined();
    expect(decreaseAlert?.severity).toBe('high');
  });

  it('should detect ODO_ZERO_CHANGE when reading is identical', () => {
    const alerts = evaluateAnomalies({
      currentKm: 45000,
      previousKm: 45000,
    });
    const zeroAlert = alerts.find((a) => a.ruleCode === 'ODO_ZERO_CHANGE');
    expect(zeroAlert).toBeDefined();
    expect(zeroAlert?.severity).toBe('low');
  });

  it('should detect ODO_HIGH_DAILY_DISTANCE when travel exceeds threshold', () => {
    const alerts = evaluateAnomalies({
      currentKm: 46000,
      previousKm: 45000,
      dailyThresholdKm: 800,
    });
    const highDistanceAlert = alerts.find((a) => a.ruleCode === 'ODO_HIGH_DAILY_DISTANCE');
    expect(highDistanceAlert).toBeDefined();
    expect(highDistanceAlert?.severity).toBe('medium');
  });

  it('should detect OCR_LOW_CONFIDENCE when confidence is below 60%', () => {
    const alerts = evaluateAnomalies({
      currentKm: 50000,
      previousKm: 49900,
      ocrConfidence: 45,
    });
    const ocrAlert = alerts.find((a) => a.ruleCode === 'OCR_LOW_CONFIDENCE');
    expect(ocrAlert).toBeDefined();
    expect(ocrAlert?.severity).toBe('low');
  });

  it('should detect OCR_MANUAL_MISMATCH when user confirmed value differs from OCR proposal by > 10 km', () => {
    const alerts = evaluateAnomalies({
      currentKm: 50100,
      previousKm: 49900,
      ocrProposedKm: 50050,
      ocrConfidence: 95,
    });
    const mismatchAlert = alerts.find((a) => a.ruleCode === 'OCR_MANUAL_MISMATCH');
    expect(mismatchAlert).toBeDefined();
    expect(mismatchAlert?.severity).toBe('medium');
  });

  it('should detect DUPLICATE_EVIDENCE when hash exists in prior submissions', () => {
    const alerts = evaluateAnomalies({
      currentKm: 50000,
      previousKm: 49900,
      evidenceHash: 'hash-abc-123',
      existingEvidenceHashes: ['hash-old-999', 'hash-abc-123'],
    });
    const dupAlert = alerts.find((a) => a.ruleCode === 'DUPLICATE_EVIDENCE');
    expect(dupAlert).toBeDefined();
    expect(dupAlert?.severity).toBe('high');
  });

  it('should block submission if personal fund transaction lacks receipt', () => {
    const alerts = evaluateAnomalies({
      currentKm: 50000,
      paymentMethod: 'personal_fund',
      hasReceiptEvidence: false,
    });
    const missingReceipt = alerts.find((a) => a.ruleCode === 'MISSING_RECEIPT');
    expect(missingReceipt).toBeDefined();
    expect(missingReceipt?.blocksSubmission).toBe(true);
  });
});
