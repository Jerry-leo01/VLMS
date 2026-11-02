import { describe, it, expect } from 'vitest';
import { evaluateAnomalies } from '../src/lib/anomaly-engine';

describe('Anomaly Detection Engine & Alert Suppression', () => {
  it('should suppress and discard all legacy secondary alerts per the two-notification policy', () => {
    // Test that historical triggers (decrease, duplicate, zero change, low OCR confidence)
    // are completely discarded from creating anomaly alerts
    const alerts = evaluateAnomalies({
      currentKm: 45000,
      previousKm: 45200, // would have been ODO_DECREASE
      ocrConfidence: 45,  // would have been OCR_LOW_CONFIDENCE
      evidenceHash: 'duplicate-hash-123',
      existingEvidenceHashes: ['duplicate-hash-123'],
    });

    expect(alerts.length).toBe(0);
    expect(alerts.find((a) => a.ruleCode === 'ODO_DECREASE')).toBeUndefined();
    expect(alerts.find((a) => a.ruleCode === 'OCR_LOW_CONFIDENCE')).toBeUndefined();
    expect(alerts.find((a) => a.ruleCode === 'DUPLICATE_EVIDENCE')).toBeUndefined();
  });

  it('should not flag OCR_MANUAL_MISMATCH when user confirmed value differs from OCR proposal', () => {
    const alerts = evaluateAnomalies({
      currentKm: 50100,
      previousKm: 49900,
      ocrProposedKm: 50050,
      ocrConfidence: 95,
    });
    const mismatchAlert = alerts.find((a) => a.ruleCode === 'OCR_MANUAL_MISMATCH');
    expect(mismatchAlert).toBeUndefined();
  });

  it('should ensure no unapproved background warnings are emitted', () => {
    const alerts = evaluateAnomalies({
      currentKm: 46000,
      previousKm: 45000,
      dailyThresholdKm: 800, // would have been ODO_HIGH_DAILY_DISTANCE
    });
    expect(alerts.length).toBe(0);
  });
});
