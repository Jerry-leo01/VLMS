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

  // 1. Detect Filling Station Name
  let fillingStation: string | null = null;
  const knownStations = [
    { patterns: ['TOTAL ENERGIES', 'TOTALENERGIES', 'TOTAL FILLING', 'TOTAL PETROLEUM'], standard: 'TOTAL ENERGIES FILLING STATION' },
    { patterns: ['NNPC RETAIL', 'NNPC', 'NIGERIAN NATIONAL PETROLEUM'], standard: 'NNPC RETAIL' },
    { patterns: ['MOBIL', '11 PLC', 'EXXONMOBIL'], standard: 'MOBIL SERVICE STATION' },
    { patterns: ['OANDO'], standard: 'OANDO SERVICE STATION' },
    { patterns: ['CONOIL'], standard: 'CONOIL SERVICE STATION' },
    { patterns: ['ARDOVA', 'AP FILLING', 'AFRICAN PETROLEUM'], standard: 'ARDOVA PLC (AP)' },
    { patterns: ['BOVAS'], standard: 'BOVAS FILLING STATION' },
    { patterns: ['MRS OIL', 'MRS FILLING', 'MRS'], standard: 'MRS OIL SERVICE STATION' },
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

  // Fallback filling station to first plausible brand line
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
    const match = line.match(/(?:TOTAL|AMOUNT|NET|PAID|PAYMENT|SUM)[:\s]*(?:NGN|₦)?[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);
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
