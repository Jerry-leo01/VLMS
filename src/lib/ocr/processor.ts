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
  vendorName: string | null;
  amount: number | null;
  quantityLitres: number | null;
  confidence: number;
}

/**
 * Preprocesses an image to improve OCR accuracy on LCD/digital odometer clusters.
 * Performs grayscale conversion and contrast stretching.
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

          let minLum = 255;
          let maxLum = 0;
          const luminances = new Float32Array(data.length / 4);

          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            luminances[i / 4] = lum;
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
          }

          const range = maxLum - minLum || 1;
          for (let i = 0; i < data.length; i += 4) {
            let normalized = ((luminances[i / 4] - minLum) / range) * 255;
            normalized = normalized > 130 ? 255 : normalized < 70 ? 0 : normalized;
            data[i] = normalized;
            data[i + 1] = normalized;
            data[i + 2] = normalized;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
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
 * Extracts candidate numeric odometer reading and unit from an image data URL or Blob.
 */
export async function processOdometerImage(imageSource: string | Blob): Promise<OcrResult> {
  try {
    const preprocessed = await preprocessImageForOcr(imageSource);
    const result = await Tesseract.recognize(preprocessed, 'eng', {
      logger: () => {}, // silent logger
    });

    const rawText = result.data.text || '';
    const confidence = Math.round(result.data.confidence || 0);

    // Extract odometer numbers and detect unit
    const details = extractOdometerDetails(rawText);

    return {
      rawText,
      proposedReading: details.proposedReading,
      detectedUnit: details.detectedUnit,
      canonicalKm: details.canonicalKm,
      confidence,
      proposedKm: details.canonicalKm,
    };
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
 * Extracts candidate fuel purchase data (Vendor, Amount, Litres) from receipt image.
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
      vendorName: parsed.vendorName,
      amount: parsed.amount,
      quantityLitres: parsed.quantityLitres,
      confidence,
    };
  } catch (err) {
    console.error('Receipt OCR processing error:', err);
    return {
      rawText: '',
      vendorName: null,
      amount: null,
      quantityLitres: null,
      confidence: 0,
    };
  }
}

/**
 * Parses raw text from a fuel purchase receipt.
 */
export function extractReceiptData(text: string): {
  vendorName: string | null;
  amount: number | null;
  quantityLitres: number | null;
} {
  if (!text) return { vendorName: null, amount: null, quantityLitres: null };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  // 1. Detect Vendor
  let vendorName: string | null = null;
  const knownVendors = [
    'TOTAL ENERGIES FILLING STATION',
    'TOTAL ENERGIES',
    'TOTALENERGIES',
    'TOTAL FILLING STATION',
    'MOBIL',
    'NNPC',
    'OANDO',
    'CONOIL',
    'ARDOVA',
    'AP FILLING STATION',
    'BOVAS',
    'SHELL',
  ];

  for (const v of knownVendors) {
    if (upper.includes(v)) {
      vendorName = v.startsWith('TOTAL') ? 'TOTAL ENERGIES FILLING STATION' : v;
      break;
    }
  }

  // Fallback vendor to first non-empty line if plausible
  if (!vendorName && lines.length > 0) {
    const firstLine = lines[0].replace(/[^A-Za-z\s]/g, '').trim();
    if (firstLine.length >= 3 && firstLine.length <= 40) {
      vendorName = firstLine;
    }
  }

  // 2. Detect Amount (look for Total, Amount, NGN, Naira, Sum)
  let amount: number | null = null;
  const amountRegex = /(?:TOTAL|AMOUNT|NET|PAID|NGN|₦|SUM)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    const num = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) amount = num;
  }

  // Fallback: look for largest number in receipt between 1000 and 500000
  if (!amount) {
    const numbers = text.match(/\b\d{4,6}(?:\.\d{2})?\b/g);
    if (numbers) {
      const candidates = numbers.map((n) => parseFloat(n)).filter((n) => n >= 1000 && n <= 500000);
      if (candidates.length > 0) {
        amount = Math.max(...candidates);
      }
    }
  }

  // 3. Detect Fuel Quantity (Litres, LTR, Qty, Vol)
  let quantityLitres: number | null = null;
  for (const line of lines) {
    if (/PRICE/i.test(line)) continue;
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
      if (/PRICE|TOTAL|AMOUNT|NGN|₦/i.test(line)) continue;
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

  return { vendorName, amount, quantityLitres };
}

/**
 * Detects whether the vehicle instrument cluster displays in Kilometers or Miles.
 */
export function detectOdometerUnit(text: string): OdometerUnit {
  if (!text) return 'km';
  const upper = text.toUpperCase();
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
 * Resolves edge-cases where 057612 could be misconstrued as 7,055 KM.
 */
export function extractOdometerDetails(text: string): OdometerAnalysis {
  if (!text) {
    return { rawText: '', proposedReading: null, detectedUnit: 'km', canonicalKm: null };
  }

  const detectedUnit = detectOdometerUnit(text);

  // Normalize common OCR character confusions
  const sanitized = text
    .toUpperCase()
    .replace(/[O]/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/[S]/g, '5')
    .replace(/[B]/g, '8');

  // 1. Direct ODO / ODOMETER / TOTAL pattern with whole integers
  const odoDirectMatch = sanitized.match(/(?:ODO|ODOMETER|TOTAL|TOTAL ODO)[:\s]*([0-9]{4,7})/i);
  if (odoDirectMatch && odoDirectMatch[1]) {
    const reading = parseFloat(odoDirectMatch[1]);
    if (reading >= 100 && reading <= 999999) {
      return {
        rawText: text,
        proposedReading: reading,
        detectedUnit,
        canonicalKm: toCanonicalKm(reading, detectedUnit),
      };
    }
  }

  // 2. Tokenize and filter out trip meters or gauge numbers
  const tokens = sanitized.split(/\s+/);
  type Candidate = { num: number; hasDecimal: boolean; nearOdo: boolean; length: number };
  const candidates: Candidate[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    // Discard trip meter tokens immediately (trip meters have decimal points or follow TRIP)
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = token.replace(/[^0-9.]/g, '');
    if (!cleaned) return;
    const hasDecimal = cleaned.includes('.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 100 && num <= 999999) {
      const nearOdo = /ODO|TOTAL/i.test(prevToken) || /ODO|TOTAL/i.test(token);
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

    if (a.nearOdo) scoreA += 40;
    if (b.nearOdo) scoreB += 40;

    if (a.length >= 5 && a.length <= 6) scoreA += 30;
    if (b.length >= 5 && b.length <= 6) scoreB += 30;

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
 * Prioritizes 5-7 digit integers over decimal trip meters.
 */
export function extractOdometerNumber(text: string): number | null {
  if (!text) return null;

  // Clean common noise
  const sanitized = text
    .toUpperCase()
    .replace(/[O]/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/[S]/g, '5')
    .replace(/[B]/g, '8');

  // Direct match for ODO / ODOMETER / TOTAL
  const directMatch = sanitized.match(/(?:ODO|ODOMETER|TOTAL)[:\s]*([0-9]{4,7})/i);
  if (directMatch && directMatch[1]) {
    const val = parseFloat(directMatch[1]);
    if (val >= 100 && val <= 999999) return val;
  }

  // Tokenize and prioritize whole numbers (ignoring TRIP)
  const tokens = sanitized.split(/\s+/);
  const candidates: { num: number; score: number }[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = token.replace(/[^0-9.]/g, '');
    if (!cleaned) return;
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 100 && num <= 999999) {
      let score = 0;
      if (!cleaned.includes('.')) score += 30;
      if (/ODO|TOTAL/i.test(prevToken)) score += 40;
      const digitsLen = cleaned.replace(/\./g, '').length;
      if (digitsLen >= 5 && digitsLen <= 6) score += 20;
      candidates.push({ num, score });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].num;
  }

  // Fallback to integer matches
  const matches = sanitized.match(/\b\d{3,7}(\.\d{1,2})?\b/g);
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
