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
 * Evaluates readings against historic sequences, OCR results, and operational thresholds.
 */
export function evaluateAnomalies(input: AnomalyEvaluationInput): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  const thresholdKm = input.dailyThresholdKm ?? 800;

  // 1. ODO_DECREASE: Current reading is below previous valid reading
  if (input.previousKm !== undefined && input.previousKm !== null) {
    if (input.currentKm < input.previousKm) {
      anomalies.push({
        ruleCode: 'ODO_DECREASE',
        severity: 'high',
        message: `Odometer reading (${input.currentKm} km) is lower than previous reading (${input.previousKm} km).`,
        details: {
          currentKm: input.currentKm,
          previousKm: input.previousKm,
          difference: input.currentKm - input.previousKm,
        },
        blocksSubmission: false, // Flagged for review
      });
    }

    // 2. ODO_ZERO_CHANGE: Current reading exactly equals previous reading
    if (input.currentKm === input.previousKm) {
      anomalies.push({
        ruleCode: 'ODO_ZERO_CHANGE',
        severity: 'low',
        message: `Odometer reading (${input.currentKm} km) has not changed since previous submission.`,
        details: {
          currentKm: input.currentKm,
          previousKm: input.previousKm,
        },
        blocksSubmission: false,
      });
    }

    // 3. ODO_HIGH_DAILY_DISTANCE: Single-day distance exceeds threshold
    const delta = input.currentKm - input.previousKm;
    if (delta > thresholdKm) {
      anomalies.push({
        ruleCode: 'ODO_HIGH_DAILY_DISTANCE',
        severity: 'medium',
        message: `Distance difference (${delta.toFixed(1)} km) exceeds the daily threshold of ${thresholdKm} km.`,
        details: {
          deltaKm: delta,
          thresholdKm,
        },
        blocksSubmission: false,
      });
    }
  }

  // 4. OCR_LOW_CONFIDENCE: OCR engine was uncertain
  if (input.ocrConfidence !== undefined && input.ocrConfidence !== null && input.ocrConfidence < 60) {
    anomalies.push({
      ruleCode: 'OCR_LOW_CONFIDENCE',
      severity: 'low',
      message: `OCR confidence score (${input.ocrConfidence.toFixed(1)}%) is below acceptable threshold of 60%.`,
      details: {
        ocrConfidence: input.ocrConfidence,
      },
      blocksSubmission: false,
    });
  }

  // 5. OCR_MANUAL_MISMATCH: User-confirmed reading differs significantly from OCR
  if (input.ocrProposedKm !== undefined && input.ocrProposedKm !== null) {
    const ocrDiff = Math.abs(input.currentKm - input.ocrProposedKm);
    if (ocrDiff > 10) {
      anomalies.push({
        ruleCode: 'OCR_MANUAL_MISMATCH',
        severity: 'medium',
        message: `Confirmed reading (${input.currentKm} km) differs by ${ocrDiff.toFixed(1)} km from OCR proposal (${input.ocrProposedKm} km).`,
        details: {
          currentKm: input.currentKm,
          ocrProposedKm: input.ocrProposedKm,
          difference: ocrDiff,
        },
        blocksSubmission: false,
      });
    }
  }

  // 6. DUPLICATE_EVIDENCE: Hash matches an unrelated submission
  if (input.evidenceHash && input.existingEvidenceHashes && input.existingEvidenceHashes.includes(input.evidenceHash)) {
    anomalies.push({
      ruleCode: 'DUPLICATE_EVIDENCE',
      severity: 'high',
      message: 'Evidence photograph SHA-256 hash matches a previously submitted image.',
      details: {
        evidenceHash: input.evidenceHash,
      },
      blocksSubmission: false,
    });
  }

  // 7. MISSING_RECEIPT: Personal fund transaction without receipt
  if (input.paymentMethod === 'personal_fund' && !input.hasReceiptEvidence) {
    anomalies.push({
      ruleCode: 'MISSING_RECEIPT',
      severity: 'high',
      message: 'Personal-fund fuel transaction is missing the required purchase receipt evidence.',
      details: {},
      blocksSubmission: true,
    });
  }

  // 8. LOCATION_OUTLIER: Missing or extreme coordinate values
  if (input.latitude !== undefined && input.latitude !== null && input.longitude !== undefined && input.longitude !== null) {
    // Check if coordinates fall within Nigeria / West Africa standard bounds roughly: Lat 4 to 14, Lon 2 to 15
    const isWithinWestAfrica = input.latitude >= 3 && input.latitude <= 15 && input.longitude >= 2 && input.longitude <= 16;
    if (!isWithinWestAfrica) {
      anomalies.push({
        ruleCode: 'LOCATION_OUTLIER',
        severity: 'low',
        message: `GPS coordinates (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}) appear outside the expected operational region.`,
        details: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
        blocksSubmission: false,
      });
    }
  }

  return anomalies;
}
