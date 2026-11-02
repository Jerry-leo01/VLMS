import { AnomalySeverity } from '@/types/database';

export interface AnomalyEvaluationInput {
  currentKm: number;
  previousKm?: number | null;
  ocrProposedKm?: number | null;
  ocrConfidence?: number | null;
  dailyThresholdKm?: number;
  evidenceHash?: string;
  existingEvidenceHashes?: string[];
  paymentMethod?: 'tom_card' | 'personal_fund';
  hasReceiptEvidence?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DetectedAnomaly {
  ruleCode: string;
  severity: AnomalySeverity;
  message: string;
  details: Record<string, unknown>;
  blocksSubmission: boolean;
}

/**
 * Anomaly Detection Engine (Explainable, Rules-Based)
 * 
 * POLICY ENFORCEMENT:
 * Per the Master Specification, all secondary alerts, legacy notifications, and automated
 * OCR discrepancy flags are completely discarded. The visible administrative anomaly review
 * queue strictly and exclusively handles two standardized operational notifications:
 * 1. DAILY_MILEAGE_DIFF: Consecutive daily mileage difference.
 * 2. FUEL_PURCHASE_VARIANCE: Differential distance from last daily log to fuel purchase.
 */
export function evaluateAnomalies(input: AnomalyEvaluationInput): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Secondary legacy rules (ODO_DECREASE, ODO_ZERO_CHANGE, ODO_HIGH_DAILY_DISTANCE, OCR_LOW_CONFIDENCE,
  // OCR_MANUAL_MISMATCH, DUPLICATE_EVIDENCE, LOCATION_OUTLIER) are disabled and discarded.
  // Administrative notifications are exclusively restricted to DAILY_MILEAGE_DIFF and FUEL_PURCHASE_VARIANCE.

  return anomalies;
}
