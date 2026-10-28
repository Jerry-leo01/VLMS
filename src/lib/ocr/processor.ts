import Tesseract from 'tesseract.js';
import { toCanonicalKm } from '@/lib/utils';
import { OdometerUnit } from '@/types/database';

export interface OcrResult {
  rawText: string;
  proposedReading: number | null;
  detectedUnit: OdometerUnit;
  canonicalKm: number | null;
  confidence: number;
  // Backward compatibility alias for existing consumers
  proposedKm: number | null;
}

export interface ReceiptOcrResult {
  rawText: string;
  fillingStation: string | null;
  vendorName: string | null;
  transactionDateTime: string | null;
  amount: number | null;
  quantityLitres: number | null;
  confidence: number;
}

export interface DashboardTelemetry {
  odometer_reading: string;
  primary_unit: 'MPH' | 'km/h';
  converted_to_km: number;
}

/**
 * Normalizes and converts dashboard telemetry from camera inspection.
 * Preserves exact digit string with leading zeros and converts MPH to KM using 1.60934 factor.
 */
export function extractDashboardTelemetry(
  odometerDigits: string,
  primaryUnit: 'MPH' | 'km/h'
): DashboardTelemetry {
  const numericVal = parseFloat(odometerDigits);
  const converted =
    primaryUnit === 'MPH'
      ? Math.round(numericVal * 1.60934 * 100) / 100
      : numericVal;

  return {
    odometer_reading: odometerDigits,
    primary_unit: primaryUnit,
    converted_to_km: converted,
  };
}

/**
 * Preprocesses an image to improve OCR accuracy on LCD/digital odometer clusters.
 * Uses an integral image adaptive thresholding algorithm (Sauvola-inspired local window mean)
 * that isolates dark LCD 7-segment crystals from backlit screens, immune to global cowl shadows and glare.
 */
export async function preprocessImageForOcr(imageSource: string | Blob): Promise<string | Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return imageSource;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(imageSource);

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const w = canvas.width;
          const h = canvas.height;

          // 1. Grayscale luminance calculation & global backdrop polarity estimation
          const luminances = new Float32Array(w * h);
          let globalLumSum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            luminances[i / 4] = lum;
            globalLumSum += lum;
          }
          const globalAvgLum = globalLumSum / (w * h);
          // Dark backdrop clusters (e.g. glowing LED/OLED green/teal digits on black dashboard)
          const isDarkBackdrop = globalAvgLum < 105;

          // 2. Compute integral image for O(1) local window mean calculation
          const integral = new Float64Array((w + 1) * (h + 1));
          for (let y = 0; y < h; y++) {
            let rowSum = 0;
            const rowOffset = y * w;
            const nextRowIntOffset = (y + 1) * (w + 1);
            const currRowIntOffset = y * (w + 1);
            for (let x = 0; x < w; x++) {
              rowSum += luminances[rowOffset + x];
              integral[nextRowIntOffset + (x + 1)] = integral[currRowIntOffset + (x + 1)] + rowSum;
            }
          }

          // 3. Adaptive local thresholding with bi-directional display polarity handling
          const radius = Math.max(8, Math.min(24, Math.floor(w / 35)));
          const k = 0.88; // contrast factor for standard dark digits on backlit LCD

          for (let y = 0; y < h; y++) {
            const y0 = Math.max(0, y - radius);
            const y1 = Math.min(h - 1, y + radius);
            const intRowY1 = (y1 + 1) * (w + 1);
            const intRowY0 = y0 * (w + 1);

            for (let x = 0; x < w; x++) {
              const x0 = Math.max(0, x - radius);
              const x1 = Math.min(w - 1, x + radius);
              const count = (x1 - x0 + 1) * (y1 - y0 + 1);

              const sum =
                integral[intRowY1 + (x1 + 1)] -
                integral[intRowY0 + (x1 + 1)] -
                integral[intRowY1 + x0] +
                integral[intRowY0 + x0];

              const mean = sum / count;
              const idx = (y * w + x) * 4;
              const lum = luminances[y * w + x];

              // Normalize to black digits (0) on white background (255) for optimal Tesseract accuracy
              let val: number;
              if (isDarkBackdrop) {
                // Inverted polarity: bright glowing digits on dark dashboard
                val = lum > mean * 1.15 || lum > mean + 18 ? 0 : 255;
              } else {
                // Standard polarity: dark LCD digits on light/backlit screen
                val = lum < mean * k ? 0 : 255;
              }

              data[idx] = val;
              data[idx + 1] = val;
              data[idx + 2] = val;
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch {
          resolve(imageSource);
        }
      };
      img.onerror = () => resolve(imageSource);
      img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
    } catch {
      resolve(imageSource);
    }
  });
}

/**
 * Multi-Pass Odometer OCR Engine.
 * Evaluates high-resolution Region of Interest (Pass 1) and falls back to full-frame
 * analysis (Pass 2) if confidence is low, ensuring LCD numbers are never missed.
 */
export async function processOdometerImage(
  imageSource: string | Blob,
  roiSource?: string | Blob
): Promise<OcrResult> {
  const evaluateSingle = async (src: string | Blob): Promise<OcrResult> => {
    const preprocessed = await preprocessImageForOcr(src);
    const result = await Tesseract.recognize(preprocessed, 'eng', {
      logger: () => {}, // silent logger
    });

    const rawText = result.data.text || '';
    const confidence = Math.round(result.data.confidence || 0);

    const details = extractOdometerDetails(rawText);

    return {
      rawText,
      proposedReading: details.proposedReading,
      detectedUnit: details.detectedUnit,
      canonicalKm: details.canonicalKm,
      confidence,
      proposedKm: details.canonicalKm,
    };
  };

  try {
    // Multi-pass execution
    if (roiSource) {
      // Pass 1: Test ROI
      const roiResult = await evaluateSingle(roiSource);

      // If Pass 1 found a solid reading with high confidence (>= 50%), check if full frame indicates MPH
      if (roiResult.proposedReading !== null && roiResult.confidence >= 50) {
        if (roiResult.detectedUnit === 'km' && /\b(MPH|M\.P\.H|MILES)\b/i.test(roiResult.rawText)) {
          roiResult.detectedUnit = 'mi';
          roiResult.canonicalKm = toCanonicalKm(roiResult.proposedReading, 'mi');
          roiResult.proposedKm = roiResult.canonicalKm;
        }
        return roiResult;
      }

      // Pass 2: Fallback to full frame because ROI was either clipped or had low confidence (<50%)
      const fullResult = await evaluateSingle(imageSource);
      if (fullResult.proposedReading !== null) {
        return fullResult;
      }

      // Pick the highest confidence candidate between ROI and full frame
      return (roiResult.confidence || 0) >= (fullResult.confidence || 0) ? roiResult : fullResult;
    }

    // Direct single source evaluation
    return await evaluateSingle(imageSource);
  } catch (err) {
    console.error('OCR processing error:', err);
    return {
      rawText: '',
      proposedReading: null,
      detectedUnit: 'km',
      canonicalKm: null,
      confidence: 0,
      proposedKm: null,
    };
  }
}

/**
 * Extracts candidate fuel purchase data (Vendor/Station, Date/Time, Amount, Litres) from receipt image.
 */
export async function processReceiptImage(imageSource: string | Blob): Promise<ReceiptOcrResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: () => {},
    });

    const rawText = result.data.text || '';
    const confidence = Math.round(result.data.confidence || 0);

    const parsed = extractReceiptData(rawText);
    return {
      rawText,
      fillingStation: parsed.fillingStation,
      vendorName: parsed.vendorName,
      transactionDateTime: parsed.transactionDateTime,
      amount: parsed.amount,
      quantityLitres: parsed.quantityLitres,
      confidence,
    };
  } catch (err) {
    console.error('Receipt OCR processing error:', err);
    return {
      rawText: '',
      fillingStation: null,
      vendorName: null,
      transactionDateTime: null,
      amount: null,
      quantityLitres: null,
      confidence: 0,
    };
  }
}

export interface ParsedReceiptData {
  fillingStation: string | null;
  vendorName: string | null;
  transactionDateTime: string | null;
  amount: number | null;
  quantityLitres: number | null;
}

/**
 * Parses raw text from a fuel purchase receipt.
 * Accurately extracts filling station name, date/time, total amount, and fuel litres.
 */
export function extractReceiptData(text: string): ParsedReceiptData {
  if (!text) {
    return {
      fillingStation: null,
      vendorName: null,
      transactionDateTime: null,
      amount: null,
      quantityLitres: null,
    };
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  // 1. Detect Filling Station Name (exact and fuzzy brand dictionary matching)
  let fillingStation: string | null = null;
  const knownStations = [
    { patterns: ['TOTAL ENERGIES', 'TOTALENERGIES', 'TOTAL FILLING', 'TOTAL PETROLEUM', 'TOTAL SERVICE', 'T0TAL ENERGIES', 'T0TALENERGIES'], standard: 'TOTAL ENERGIES FILLING STATION' },
    { patterns: ['NNPC RETAIL', 'NNPC', 'NIGERIAN NATIONAL PETROLEUM', 'N.N.P.C'], standard: 'NNPC RETAIL' },
    { patterns: ['MOBIL', '11 PLC', 'EXXONMOBIL', 'M0BIL'], standard: 'MOBIL SERVICE STATION' },
    { patterns: ['OANDO', '0AND0'], standard: 'OANDO SERVICE STATION' },
    { patterns: ['CONOIL', 'C0N0IL'], standard: 'CONOIL SERVICE STATION' },
    { patterns: ['ARDOVA', 'AP FILLING', 'AFRICAN PETROLEUM'], standard: 'ARDOVA PLC (AP)' },
    { patterns: ['BOVAS', 'B0VAS'], standard: 'BOVAS FILLING STATION' },
    { patterns: ['MRS OIL', 'MRS FILLING', 'MRS SERVICE'], standard: 'MRS OIL SERVICE STATION' },
    { patterns: ['NIPCO'], standard: 'NIPCO SERVICE STATION' },
    { patterns: ['SHELL'], standard: 'SHELL SERVICE STATION' },
    { patterns: ['RAINOIL'], standard: 'RAINOIL SERVICE STATION' },
    { patterns: ['MATRIX ENERGY', 'MATRIX'], standard: 'MATRIX ENERGY' },
    { patterns: ['NORTHWEST PETROLEUM', 'NORTHWEST'], standard: 'NORTHWEST PETROLEUM' },
  ];

  for (const station of knownStations) {
    if (station.patterns.some((p) => upper.includes(p))) {
      fillingStation = station.standard;
      break;
    }
  }

  // Fallback filling station to first plausible brand line (top 5 lines)
  if (!fillingStation && lines.length > 0) {
    const ignoredKeywords = /RECEIPT|CUSTOMER|WELCOME|INVOICE|PUMP|DATE|TIME|CASH|CARD|TERMINAL|MERCHANT|SLIP/i;
    for (const line of lines.slice(0, 5)) {
      if (ignoredKeywords.test(line)) continue;
      const cleaned = line.replace(/[^A-Za-z0-9\s&.-]/g, '').trim();
      if (cleaned.length >= 3 && cleaned.length <= 50) {
        fillingStation = cleaned;
        break;
      }
    }
  }

  // 2. Detect Date & Time of Transaction
  let extractedDate: string | null = null;
  let extractedTime: string | null = null;

  // Look for date patterns (e.g. 22/10/2026, 2026-10-22, 22-10-2026, 22-Oct-2026)
  const numericDateMatch = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
  if (numericDateMatch) {
    extractedDate = numericDateMatch[1];
  } else {
    const wordDateMatch = text.match(/\b(\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s,]+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{2,4})\b/i);
    if (wordDateMatch) {
      extractedDate = wordDateMatch[1].trim();
    }
  }

  // Look for time patterns (e.g. 14:32:00, 14:32, 02:30 PM)
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?\b/i);
  if (timeMatch) {
    extractedTime = timeMatch[0].trim();
  }

  let transactionDateTime: string | null = null;
  if (extractedDate && extractedTime) {
    transactionDateTime = `${extractedDate} ${extractedTime}`;
  } else if (extractedDate) {
    transactionDateTime = extractedDate;
  }

  // 3. Detect Amount (Total, Net, Paid, Payment, Sum) avoiding unit price / rate lines
  let amount: number | null = null;
  for (const line of lines) {
    if (/PRICE|RATE|\/L|PER/i.test(line)) continue;
    const match = line.match(/(?:TOTAL\s+(?:PAID|AMOUNT|DUE)|NET\s+AMOUNT|TOTAL|AMOUNT|NET|PAID|PAYMENT|SUM)[:\s]*(?:NGN|₦)?[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        amount = num;
        break;
      }
    }
  }

  // Check lines with currency symbols ₦ or NGN without RATE/PRICE
  if (!amount) {
    for (const line of lines) {
      if (/PRICE|RATE|\/L|PER/i.test(line)) continue;
      const match = line.match(/(?:NGN|₦)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      if (match && match[1]) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          amount = num;
          break;
        }
      }
    }
  }

  // Fallback: search for numbers between 1000 and 500000 on lines not marked as unit price or meter
  if (!amount) {
    for (const line of lines) {
      if (/PRICE|RATE|\/L|PER|PUMP|DATE|TIME/i.test(line)) continue;
      const numbers = line.match(/\b\d{4,6}(?:\.\d{2})?\b/g);
      if (numbers) {
        const candidates = numbers.map((n) => parseFloat(n)).filter((n) => n >= 1000 && n <= 500000);
        if (candidates.length > 0) {
          amount = Math.max(...candidates);
          break;
        }
      }
    }
  }

  // 4. Detect Fuel Quantity (Litres, LTR, Qty, Vol)
  let quantityLitres: number | null = null;
  for (const line of lines) {
    if (/PRICE|RATE|\/L|PER/i.test(line)) continue;
    const match = line.match(/(?:LITRES?|LTRS?|QTY|VOLUME|VOL)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0 && num <= 500) {
        quantityLitres = num;
        break;
      }
    }
  }

  // Fallback if not matched with prefix, look for numbers ending with L or LTR (ignoring price line)
  if (!quantityLitres) {
    for (const line of lines) {
      if (/PRICE|RATE|TOTAL|AMOUNT|NGN|₦|\/L|PER/i.test(line)) continue;
      const match = line.match(/\b([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:LTRS?|LITRES?|L)\b/i);
      if (match && match[1]) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0 && num <= 500) {
          quantityLitres = num;
          break;
        }
      }
    }
  }

  // 5. Detect Unit Price / Rate for Mathematical Cross-Check and Recovery
  let unitRate: number | null = null;
  for (const line of lines) {
    const rateMatch = line.match(/(?:RATE(?:\/L(?:TR)?)?|PRICE(?:\/L(?:TR)?)?|PER\s*L(?:TR)?|@)[:\s]*(?:NGN|₦)?[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (rateMatch && rateMatch[1]) {
      const parsedRate = parseFloat(rateMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedRate) && parsedRate >= 200 && parsedRate <= 2500) {
        unitRate = parsedRate;
        break;
      }
    }
  }

  // Cross-Field Mathematical Recovery: Amount = Volume * Rate
  if (!amount && quantityLitres && unitRate) {
    amount = Math.round(quantityLitres * unitRate * 100) / 100;
  } else if (!quantityLitres && amount && unitRate) {
    quantityLitres = Math.round((amount / unitRate) * 100) / 100;
  }

  return {
    fillingStation,
    vendorName: fillingStation,
    transactionDateTime,
    amount,
    quantityLitres,
  };
}

/**
 * Detects whether the vehicle instrument cluster displays in Kilometers or Miles.
 * Prioritizes explicit MPH markings on speedometers/dials over ambient text noise.
 */
export function detectOdometerUnit(text: string): OdometerUnit {
  if (!text) return 'km';
  const upper = text.toUpperCase();

  // Explicit MPH detection on dial or display takes absolute priority
  if (/\b(MPH|M\.P\.H|MILES)\b/i.test(upper) || /SPEED.*?MPH/i.test(upper) || upper.includes('MPH')) {
    return 'mi';
  }

  const hasMiles = /\b(MI|MILES|MPH)\b/i.test(upper) || /ODO.*?\bMI\b/i.test(upper);
  const hasKm = /\b(KM|KMS|KM\/H|KMPH)\b/i.test(upper) || /ODO.*?\bKM\b/i.test(upper);

  if (hasMiles && !hasKm) return 'mi';
  return 'km';
}

export interface OdometerAnalysis {
  rawText: string;
  proposedReading: number | null;
  detectedUnit: OdometerUnit;
  canonicalKm: number | null;
}

/**
 * Advanced heuristic parser that isolates the true odometer reading from speedometers,
 * trip meters (e.g. TRIP A 705.5), temperatures, and clock digits.
 * Accurately extracts readings such as "123456" with MPH and "057612" with KM.
 */
export function extractOdometerDetails(text: string): OdometerAnalysis {
  if (!text) {
    return { rawText: '', proposedReading: null, detectedUnit: 'km', canonicalKm: null };
  }

  const detectedUnit = detectOdometerUnit(text);

  // Helper to sanitize common 7-segment and alphanumeric misidentifications into pure digits
  const cleanToDigits = (str: string): string =>
    str
      .toUpperCase()
      .replace(/[O]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/[S]/g, '5')
      .replace(/[B]/g, '8')
      .replace(/[^0-9.]/g, '');

  // 1. Direct ODO / 0D0 / ODOMETER / TOTAL pattern with numbers
  const directOdoMatch = text.match(/(?:ODO|0D0|ODOMETER|TOTAL|T0TAL|TOTAL ODO)[:\s]*([0-9OILS.B]{4,7})/i);
  if (directOdoMatch && directOdoMatch[1]) {
    const cleaned = cleanToDigits(directOdoMatch[1]);
    const reading = parseFloat(cleaned);
    if (!isNaN(reading) && reading >= 100 && reading <= 999999) {
      return {
        rawText: text,
        proposedReading: reading,
        detectedUnit,
        canonicalKm: toCanonicalKm(reading, detectedUnit),
      };
    }
  }

  // 2. Tokenize and filter out trip meters or gauge numbers
  const tokens = text.split(/\s+/);
  type Candidate = { num: number; hasDecimal: boolean; nearOdo: boolean; length: number };
  const candidates: Candidate[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    // Discard trip meter tokens immediately (trip meters have decimal points or follow TRIP)
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = cleanToDigits(token);
    if (!cleaned) return;
    const hasDecimal = cleaned.includes('.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 100 && num <= 999999) {
      const nearOdo =
        /ODO|0D0|TOTAL|T0TAL/i.test(prevToken) ||
        /ODO|0D0|TOTAL|T0TAL/i.test(token);
      const digitsCount = cleaned.replace(/\./g, '').length;
      candidates.push({
        num,
        hasDecimal,
        nearOdo,
        length: digitsCount,
      });
    }
  });

  // Score candidates: whole integers, 5-6 digits, and ODO proximity get highest priority
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (!a.hasDecimal) scoreA += 50;
    if (!b.hasDecimal) scoreB += 50;

    if (a.nearOdo) scoreA += 60;
    if (b.nearOdo) scoreB += 60;

    if (a.length >= 5 && a.length <= 6) scoreA += 35;
    if (b.length >= 5 && b.length <= 6) scoreB += 35;

    return scoreB - scoreA;
  });

  if (candidates.length > 0) {
    const best = candidates[0].num;
    return {
      rawText: text,
      proposedReading: best,
      detectedUnit,
      canonicalKm: toCanonicalKm(best, detectedUnit),
    };
  }

  // 3. Fallback extraction
  const fallback = extractOdometerNumber(text);
  return {
    rawText: text,
    proposedReading: fallback,
    detectedUnit,
    canonicalKm: fallback ? toCanonicalKm(fallback, detectedUnit) : null,
  };
}

/**
 * Regex & heuristic parser to find the most plausible odometer reading from raw OCR text.
 * Prioritizes 5-7 digit integers over decimal trip meters and handles 7-segment digit substitutions.
 */
export function extractOdometerNumber(text: string): number | null {
  if (!text) return null;

  const cleanToDigits = (str: string): string =>
    str
      .toUpperCase()
      .replace(/[O]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/[S]/g, '5')
      .replace(/[B]/g, '8')
      .replace(/[^0-9.]/g, '');

  // Direct match for ODO / 0D0 / ODOMETER / TOTAL
  const directMatch = text.match(/(?:ODO|0D0|ODOMETER|TOTAL|T0TAL)[:\s]*([0-9OILS.B]{4,7})/i);
  if (directMatch && directMatch[1]) {
    const val = parseFloat(cleanToDigits(directMatch[1]));
    if (!isNaN(val) && val >= 100 && val <= 999999) return val;
  }

  // Tokenize and prioritize whole numbers (ignoring TRIP)
  const tokens = text.split(/\s+/);
  const candidates: { num: number; score: number }[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = cleanToDigits(token);
    if (!cleaned) return;
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 100 && num <= 999999) {
      let score = 0;
      if (!cleaned.includes('.')) score += 35;
      if (/ODO|0D0|TOTAL|T0TAL/i.test(prevToken)) score += 50;
      const digitsLen = cleaned.replace(/\./g, '').length;
      if (digitsLen >= 5 && digitsLen <= 6) score += 25;
      candidates.push({ num, score });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].num;
  }

  // Fallback to integer matches
  const matches = cleanToDigits(text).match(/\b\d{4,7}(\.\d{1,2})?\b/g);
  if (matches && matches.length > 0) {
    for (const match of matches) {
      if (match.includes('.')) continue; // avoid trip decimals
      const num = parseFloat(match);
      if (num >= 500 && num <= 999999) return num;
    }
    return parseFloat(matches[0]);
  }

  return null;
}
