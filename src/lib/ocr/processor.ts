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
 * Preprocesses an image to improve OCR accuracy on LCD/digital odometer clusters and thermal receipts.
 * Supports explicit polarity modes:
 * - 'standard': Dark digits/text on light backlit LCD or thermal receipt paper.
 * - 'inverted': Bright glowing LED/OLED digits (green, cyan, amber, red, white) on dark dashboard backdrop.
 * - 'auto': Automatically estimates backdrop polarity.
 */
export async function preprocessImageForOcr(
  imageSource: string | Blob,
  polarityMode: 'auto' | 'standard' | 'inverted' = 'auto'
): Promise<string | Blob> {
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

          // 1. Luminance calculation
          // For inverted mode (glowing colored LCDs like green/cyan 091308), max(R,G,B) preserves full LED intensity
          const luminances = new Float32Array(w * h);
          let globalLumSum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum =
              polarityMode === 'inverted'
                ? Math.max(r, g, b)
                : 0.299 * r + 0.587 * g + 0.114 * b;
            luminances[i / 4] = lum;
            globalLumSum += 0.299 * r + 0.587 * g + 0.114 * b;
          }
          const globalAvgLum = globalLumSum / (w * h);
          const useInverted =
            polarityMode === 'inverted' || (polarityMode === 'auto' && globalAvgLum < 115);

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

          // 3. Adaptive local thresholding
          const radius = Math.max(10, Math.min(28, Math.floor(w / 30)));
          const k = 0.88;

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
              if (useInverted) {
                // Bright glowing LCD/LED digits on dark cluster window
                val = (lum > mean * 1.14 || lum > mean + 16) && lum > 55 ? 0 : 255;
              } else {
                // Standard dark digits on light LCD or thermal paper
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
 * Evaluates both Inverted Polarity (glowing LED/LCD digits like green 091308 on dark dashboard)
 * and Standard Polarity (dark LCD segments on backlit screen) across full cluster and ROI,
 * selecting the candidate with a valid 5-7 digit odometer reading and highest confidence.
 */
export async function processOdometerImage(
  imageSource: string | Blob,
  roiSource?: string | Blob
): Promise<OcrResult> {
  const evaluatePass = async (
    src: string | Blob,
    polarity: 'auto' | 'standard' | 'inverted' | 'raw'
  ): Promise<OcrResult> => {
    const processed =
      polarity === 'raw' ? src : await preprocessImageForOcr(src, polarity);
    const result = await Tesseract.recognize(processed, 'eng', {
      logger: () => {},
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

  const scoreResult = (res: OcrResult): number => {
    if (res.proposedReading === null) return -100 + (res.confidence || 0);
    const digitsLen = Math.floor(res.proposedReading).toString().length;
    let score = res.confidence || 0;
    if (digitsLen >= 5 && digitsLen <= 6) score += 80;
    else if (digitsLen === 4 || digitsLen === 7) score += 45;
    return score;
  };

  try {
    const candidates: OcrResult[] = [];

    // Pass 1: Full Frame Inverted Polarity (for glowing green/cyan/amber/white digital LCDs on dark cluster, e.g. 091308)
    const invertedFull = await evaluatePass(imageSource, 'inverted');
    candidates.push(invertedFull);
    if (
      invertedFull.proposedReading !== null &&
      invertedFull.proposedReading >= 1000 &&
      invertedFull.confidence >= 60
    ) {
      return invertedFull;
    }

    // Pass 2: Full Frame Standard Polarity (dark digits on backlit LCD screen)
    const standardFull = await evaluatePass(imageSource, 'standard');
    candidates.push(standardFull);
    if (
      standardFull.proposedReading !== null &&
      standardFull.proposedReading >= 1000 &&
      standardFull.confidence >= 60
    ) {
      return standardFull;
    }

    // Pass 3: Raw Full Frame (unthresholded fallback)
    const rawFull = await evaluatePass(imageSource, 'raw');
    candidates.push(rawFull);

    // Pass 4: Optional ROI Pass if provided
    if (roiSource) {
      const roiInverted = await evaluatePass(roiSource, 'inverted');
      candidates.push(roiInverted);
      const roiStandard = await evaluatePass(roiSource, 'standard');
      candidates.push(roiStandard);
    }

    // Propagate unit detection if any pass detected MPH
    const anyMph = candidates.some((c) => c.detectedUnit === 'mi');
    candidates.sort((a, b) => scoreResult(b) - scoreResult(a));

    const best = candidates[0];
    if (anyMph && best.proposedReading !== null && best.detectedUnit !== 'mi') {
      best.detectedUnit = 'mi';
      best.canonicalKm = toCanonicalKm(best.proposedReading, 'mi');
      best.proposedKm = best.canonicalKm;
    }

    return best;
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
 * Runs adaptive thermal paper preprocessing + raw image fallback to maximize header and figure extraction.
 */
export async function processReceiptImage(imageSource: string | Blob): Promise<ReceiptOcrResult> {
  try {
    // Pass 1: Preprocessed thermal receipt (local adaptive thresholding)
    const preprocessed = await preprocessImageForOcr(imageSource, 'standard');
    const res1 = await Tesseract.recognize(preprocessed, 'eng', {
      logger: () => {},
    });
    const text1 = res1.data.text || '';
    const conf1 = Math.round(res1.data.confidence || 0);
    const parsed1 = extractReceiptData(text1);

    // If Pass 1 extracted station, amount, and litres cleanly, return immediately
    if (parsed1.fillingStation && parsed1.amount && parsed1.quantityLitres) {
      return {
        rawText: text1,
        fillingStation: parsed1.fillingStation,
        vendorName: parsed1.vendorName,
        transactionDateTime: parsed1.transactionDateTime,
        amount: parsed1.amount,
        quantityLitres: parsed1.quantityLitres,
        confidence: conf1,
      };
    }

    // Pass 2: Raw image pass to recover any faint header logo or numbers
    const res2 = await Tesseract.recognize(imageSource, 'eng', {
      logger: () => {},
    });
    const text2 = res2.data.text || '';
    const conf2 = Math.round(res2.data.confidence || 0);
    const parsed2 = extractReceiptData(text2);

    const mergedStation = parsed1.fillingStation || parsed2.fillingStation;
    const mergedDateTime = parsed1.transactionDateTime || parsed2.transactionDateTime;
    const mergedAmount = parsed1.amount ?? parsed2.amount;
    const mergedLitres = parsed1.quantityLitres ?? parsed2.quantityLitres;

    return {
      rawText: text1.length >= text2.length ? text1 : text2,
      fillingStation: mergedStation,
      vendorName: mergedStation,
      transactionDateTime: mergedDateTime,
      amount: mergedAmount,
      quantityLitres: mergedLitres,
      confidence: Math.max(conf1, conf2),
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
 * Computes Levenshtein edit distance between two uppercase strings for fuzzy brand matching.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Parses raw text from a fuel purchase receipt.
 * Specifically prioritizes capturing the "Filling Station Name" (header) from uploaded receipt images,
 * along with date/time, total amount, and fuel litres.
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

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const upper = text.toUpperCase();
  // Normalize common OCR digit-for-letter substitutions in header text
  const normalizedAlphaUpper = upper
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');

  // 1. Detect Filling Station Name (Header Extraction)
  let fillingStation: string | null = null;

  // 1A. Explicit Labeled Station / Merchant Header (e.g. "STATION: ...", "MERCHANT NAME: ...")
  for (const line of lines.slice(0, 10)) {
    const labeledMatch = line.match(
      /^(?:FILLING\s+STATION|SERVICE\s+STATION|STATION\s+NAME|MERCHANT\s+NAME|MERCHANT|DEALER|SOLD\s+BY)\s*:\s*(.{3,50})$/i
    );
    if (labeledMatch && labeledMatch[1]) {
      const rawVal = labeledMatch[1].trim();
      if (!rawVal.startsWith('#') && !/^\d/.test(rawVal)) {
        const candidate = rawVal.replace(/[^A-Za-z0-9\s&.,'-]/g, '').trim();
        if (candidate.length >= 3 && !/^\d+$/.test(candidate)) {
          fillingStation = candidate.toUpperCase();
          break;
        }
      }
    }
  }

  // 1B. Known Major Petroleum Marketers Dictionary (Exact & Normalized Substring Matching)
  const knownStations = [
    {
      patterns: [
        'TOTAL ENERGIES',
        'TOTALENERGIES',
        'TOTAL FILLING',
        'TOTAL PETROLEUM',
        'TOTAL SERVICE',
        'TOTAL NIG',
        'T0TAL ENERGIES',
        'T0TALENERGIES',
      ],
      fuzzyTokens: ['TOTALENERGIES'],
      standard: 'TOTAL ENERGIES FILLING STATION',
    },
    {
      patterns: ['NNPC RETAIL', 'NNPC MEGA', 'NNPC FILLING', 'NNPC', 'NIGERIAN NATIONAL PETROLEUM', 'N.N.P.C'],
      fuzzyTokens: ['NNPC'],
      standard: 'NNPC RETAIL',
    },
    {
      patterns: ['MOBIL', '11 PLC', 'DOUBLE ONE PLC', 'EXXONMOBIL', 'M0BIL'],
      fuzzyTokens: ['MOBIL', 'EXXONMOBIL'],
      standard: 'MOBIL SERVICE STATION',
    },
    {
      patterns: ['OANDO', '0AND0', 'OANDO MARKETING', 'OANDO PLC'],
      fuzzyTokens: ['OANDO'],
      standard: 'OANDO SERVICE STATION',
    },
    {
      patterns: ['CONOIL', 'C0N0IL', 'CONOIL PLC'],
      fuzzyTokens: ['CONOIL'],
      standard: 'CONOIL SERVICE STATION',
    },
    {
      patterns: ['ARDOVA', 'AP FILLING', 'AP SERVICE', 'AFRICAN PETROLEUM'],
      fuzzyTokens: ['ARDOVA'],
      standard: 'ARDOVA PLC (AP)',
    },
    {
      patterns: ['BOVAS', 'B0VAS', 'BOVAS AND COMPANY', 'BOVAS & CO'],
      fuzzyTokens: ['BOVAS'],
      standard: 'BOVAS FILLING STATION',
    },
    {
      patterns: ['MRS OIL', 'MRS FILLING', 'MRS SERVICE', 'MRS PETROLEUM'],
      fuzzyTokens: ['MRSOIL'],
      standard: 'MRS OIL SERVICE STATION',
    },
    {
      patterns: ['NIPCO', 'NIPC0', 'NIPCO PLC'],
      fuzzyTokens: ['NIPCO'],
      standard: 'NIPCO SERVICE STATION',
    },
    {
      patterns: ['SHELL', 'SHELL PETROLEUM'],
      fuzzyTokens: ['SHELL'],
      standard: 'SHELL SERVICE STATION',
    },
    {
      patterns: ['RAINOIL', 'RAIN OIL', 'RAIN0IL'],
      fuzzyTokens: ['RAINOIL'],
      standard: 'RAINOIL SERVICE STATION',
    },
    {
      patterns: ['MATRIX ENERGY', 'MATRIX PETROLEUM', 'MATRIX'],
      fuzzyTokens: ['MATRIX'],
      standard: 'MATRIX ENERGY',
    },
    {
      patterns: ['NORTHWEST PETROLEUM', 'NORTHWEST OIL', 'NORTHWEST'],
      fuzzyTokens: ['NORTHWEST'],
      standard: 'NORTHWEST PETROLEUM',
    },
    {
      patterns: ['AA RANO', 'A.A. RANO', 'AARANO'],
      fuzzyTokens: ['AARANO'],
      standard: 'AA RANO NIGERIA LTD',
    },
    {
      patterns: ['HEYDEN', 'HEYDEN PETROLEUM'],
      fuzzyTokens: ['HEYDEN'],
      standard: 'HEYDEN PETROLEUM',
    },
    {
      patterns: ['ETERNA', 'ETERNA PLC', 'ETERNA OIL'],
      fuzzyTokens: ['ETERNA'],
      standard: 'ETERNA PLC',
    },
    {
      patterns: ['PINNACLE OIL', 'PINNACLE'],
      fuzzyTokens: ['PINNACLE'],
      standard: 'PINNACLE OIL AND GAS',
    },
  ];

  if (!fillingStation) {
    for (const station of knownStations) {
      if (
        station.patterns.some(
          (p) => upper.includes(p) || normalizedAlphaUpper.includes(p.replace(/0/g, 'O'))
        )
      ) {
        fillingStation = station.standard;
        break;
      }
    }
  }

  // 1C. Fuzzy Levenshtein brand matching on top header tokens (handles thermal print dropouts)
  if (!fillingStation) {
    const headerWords = normalizedAlphaUpper
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Z]/g, ''))
      .filter((w) => w.length >= 4);

    outer: for (const word of headerWords.slice(0, 15)) {
      for (const station of knownStations) {
        for (const target of station.fuzzyTokens) {
          if (target.length >= 5 && Math.abs(word.length - target.length) <= 1) {
            if (levenshteinDistance(word, target) <= 1) {
              fillingStation = station.standard;
              break outer;
            }
          }
        }
      }
    }
  }

  // 1D. Industry Keyword Header Line Extraction (e.g. "AL-BARKA PETROLEUM LTD", "SUNRISE FILLING STATION")
  if (!fillingStation && lines.length > 0) {
    const headerSlice = lines.slice(0, Math.max(6, Math.ceil(lines.length * 0.35)));
    const stationIndustryRegex =
      /\b(PETROLEUM|FILLING\s+STATION|SERVICE\s+STATION|GAS\s+STATION|OIL\s*&\s*GAS|OIL\s+AND\s+GAS|ENERGY|FUELS?|RETAIL|LUBRICANTS|OIL\s+PLC|MOTORS)\b/i;
    for (const line of headerSlice) {
      if (/PRICE|RATE|TOTAL|AMOUNT|LITRE|LTR|PUMP|DATE|TIME|THANK\s+YOU/i.test(line)) continue;
      if (stationIndustryRegex.test(line)) {
        const cleaned = line
          .replace(/^(?:WELCOME\s+TO|OFFICIAL\s+RECEIPT|TAX\s+INVOICE)[:\s-]*/i, '')
          .replace(/[^A-Za-z0-9\s&.,'-]/g, '')
          .trim();
        if (cleaned.length >= 4 && cleaned.length <= 60) {
          fillingStation = cleaned.toUpperCase();
          break;
        }
      }
    }
  }

  // 1E. Top-of-Receipt Header Fallback (First prominent merchant title line in top 6 lines)
  if (!fillingStation && lines.length > 0) {
    const ignoredHeaderNoise =
      /^(?:RECEIPT|OFFICIAL\s+RECEIPT|POS\s+RECEIPT|CASH\s+RECEIPT|CUSTOMER\s+COPY|MERCHANT\s+COPY|TAX\s+INVOICE|INVOICE|WELCOME|PUMP|DATE|TIME|CASH|CARD|TERMINAL|SLIP|TRANSACTION|APPROVED|STAN|RRN|AID|TEL|PHONE|NO\.|PLOT|KM\s+\d|ROAD|STREET|EXPRESSWAY|LAGOS|ABUJA)\b/i;

    for (const rawLine of lines.slice(0, 6)) {
      // Strip "WELCOME TO " prefix if attached to the station name (e.g., "WELCOME TO DANMARNA OIL")
      const strippedWelcome = rawLine.replace(/^WELCOME\s+TO\s+/i, '').trim();
      if (ignoredHeaderNoise.test(strippedWelcome)) continue;
      if (/PRICE|RATE|TOTAL|AMOUNT|LITRE|LTR|NGN|₦|\d{2}[/-]\d{2}[/-]\d{2,4}|\d{2}:\d{2}/i.test(strippedWelcome)) {
        continue;
      }

      const cleaned = strippedWelcome.replace(/[^A-Za-z0-9\s&.-]/g, '').trim();
      const alphaCount = (cleaned.match(/[A-Za-z]/g) || []).length;
      if (cleaned.length >= 3 && cleaned.length <= 55 && alphaCount >= 3) {
        fillingStation = cleaned.toUpperCase();
        break;
      }
    }
  }

  // 2. Detect Date & Time of Transaction
  let extractedDate: string | null = null;
  let extractedTime: string | null = null;

  const numericDateMatch = text.match(
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/
  );
  if (numericDateMatch) {
    extractedDate = numericDateMatch[1];
  } else {
    const wordDateMatch = text.match(
      /\b(\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s,]+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{2,4})\b/i
    );
    if (wordDateMatch) {
      extractedDate = wordDateMatch[1].trim();
    }
  }

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
    const match = line.match(
      /(?:TOTAL\s+(?:PAID|AMOUNT|DUE|SALE)|NET\s+AMOUNT|TOTAL|AMOUNT|NET|PAID|PAYMENT|SUM)[:\s]*(?:NGN|₦|N)?[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i
    );
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
        const candidates = numbers
          .map((n) => parseFloat(n))
          .filter((n) => n >= 1000 && n <= 500000);
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
    const match = line.match(
      /(?:LITRES?|LTRS?|QTY|VOLUME|VOL)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i
    );
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
    const rateMatch = line.match(
      /(?:RATE(?:\/L(?:TR)?)?|PRICE(?:\/L(?:TR)?)?|PER\s*L(?:TR)?|@)[:\s]*(?:NGN|₦)?[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i
    );
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
  if (
    /\b(MPH|M\.P\.H|MILES)\b/i.test(upper) ||
    /SPEED.*?MPH/i.test(upper) ||
    upper.includes('MPH')
  ) {
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

const SPEEDOMETER_DIAL_NUMBERS = new Set([
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210,
  220, 240, 260,
]);

/**
 * Reconstructs spaced 7-segment LCD digits (e.g., "0 9 1 3 0 8" or "091 308" -> "091308")
 * while avoiding merging speedometer dial graduations (e.g., "20 30 60 90 100 110 120").
 */
function reconstructSegmentedOdometerText(text: string): string {
  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    // If a line contains spaced single digits like "0 9 1 3 0 8" or "09 13 08"
    return line.replace(
      /\b([0-9OILS|B]{1,3}(?:\s+[0-9OILS|B]{1,3}){1,5})\b/gi,
      (match) => {
        const parts = match.trim().split(/\s+/);
        // Check if all parts look like speedometer graduation multiples of 10 (e.g. 20 30 60 90)
        const allSpeedGraduations =
          parts.length >= 2 &&
          parts.every((p) => {
            const n = parseInt(p, 10);
            return !isNaN(n) && SPEEDOMETER_DIAL_NUMBERS.has(n);
          });
        if (allSpeedGraduations) {
          return match; // Do not merge speedometer markings
        }
        const joined = parts.join('');
        if (joined.length >= 5 && joined.length <= 7) {
          return joined;
        }
        return match;
      }
    );
  });
  return processedLines.join('\n');
}

/**
 * Advanced heuristic parser that isolates the true odometer reading from speedometers,
 * trip meters (e.g. TRIP A 705.5), temperatures, and clock digits.
 * Accurately extracts readings such as "091308", "123456" with MPH, and "057612" with KM.
 */
export function extractOdometerDetails(text: string): OdometerAnalysis {
  if (!text) {
    return { rawText: '', proposedReading: null, detectedUnit: 'km', canonicalKm: null };
  }

  const detectedUnit = detectOdometerUnit(text);
  const normalizedText = reconstructSegmentedOdometerText(text);

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
  const directOdoMatch = normalizedText.match(
    /(?:ODO|0D0|ODOMETER|TOTAL|T0TAL|TOTAL ODO)[:\s]*([0-9OILS.B]{4,7})/i
  );
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

  // 2. Tokenize and filter out trip meters or speedometer gauge markings
  const tokens = normalizedText.split(/\s+/);
  type Candidate = {
    num: number;
    hasDecimal: boolean;
    nearOdo: boolean;
    length: number;
    hasLeadingZero: boolean;
  };
  const candidates: Candidate[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    // Discard trip meter tokens immediately (trip meters have decimal points or follow TRIP)
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = cleanToDigits(token);
    if (!cleaned) return;
    const hasDecimal = cleaned.includes('.');
    const num = parseFloat(cleaned);
    const digitsOnly = cleaned.replace(/\./g, '');
    const digitsCount = digitsOnly.length;

    // Filter out standalone 2-to-3 digit speedometer scale numbers (e.g. 100, 110, 120, 140, 180, 200)
    if (digitsCount <= 3 && SPEEDOMETER_DIAL_NUMBERS.has(num)) {
      return;
    }

    if (!isNaN(num) && (num >= 100 || digitsCount >= 5) && num <= 999999) {
      const nearOdo =
        /ODO|0D0|TOTAL|T0TAL/i.test(prevToken) || /ODO|0D0|TOTAL|T0TAL/i.test(token);
      candidates.push({
        num,
        hasDecimal,
        nearOdo,
        length: digitsCount,
        hasLeadingZero: digitsOnly.startsWith('0') && digitsCount >= 5,
      });
    }
  });

  // Score candidates: whole integers, 5-6 digits, leading-zero LCD format (e.g. 091308), and ODO proximity get highest priority
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (!a.hasDecimal) scoreA += 50;
    if (!b.hasDecimal) scoreB += 50;

    if (a.nearOdo) scoreA += 60;
    if (b.nearOdo) scoreB += 60;

    if (a.length >= 5 && a.length <= 6) scoreA += 45;
    if (b.length >= 5 && b.length <= 6) scoreB += 45;

    if (a.hasLeadingZero) scoreA += 25;
    if (b.hasLeadingZero) scoreB += 25;

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

  const normalizedText = reconstructSegmentedOdometerText(text);

  const cleanToDigits = (str: string): string =>
    str
      .toUpperCase()
      .replace(/[O]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/[S]/g, '5')
      .replace(/[B]/g, '8')
      .replace(/[^0-9.]/g, '');

  // Direct match for ODO / 0D0 / ODOMETER / TOTAL
  const directMatch = normalizedText.match(
    /(?:ODO|0D0|ODOMETER|TOTAL|T0TAL)[:\s]*([0-9OILS.B]{4,7})/i
  );
  if (directMatch && directMatch[1]) {
    const val = parseFloat(cleanToDigits(directMatch[1]));
    if (!isNaN(val) && val >= 100 && val <= 999999) return val;
  }

  // Tokenize and prioritize whole numbers (ignoring TRIP and speedometer dial markings)
  const tokens = normalizedText.split(/\s+/);
  const candidates: { num: number; score: number }[] = [];

  tokens.forEach((token, index) => {
    const prevToken = index > 0 ? tokens[index - 1] : '';
    if (/TRIP/i.test(prevToken) || /TRIP/i.test(token)) return;

    const cleaned = cleanToDigits(token);
    if (!cleaned) return;
    const num = parseFloat(cleaned);
    const digitsOnly = cleaned.replace(/\./g, '');
    const digitsLen = digitsOnly.length;

    if (digitsLen <= 3 && SPEEDOMETER_DIAL_NUMBERS.has(num)) return;

    if (!isNaN(num) && (num >= 100 || digitsLen >= 5) && num <= 999999) {
      let score = 0;
      if (!cleaned.includes('.')) score += 35;
      if (/ODO|0D0|TOTAL|T0TAL/i.test(prevToken)) score += 50;
      if (digitsLen >= 5 && digitsLen <= 6) score += 40;
      if (digitsOnly.startsWith('0') && digitsLen >= 5) score += 20;
      candidates.push({ num, score });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].num;
  }

  // Fallback to integer matches
  const matches = cleanToDigits(normalizedText).match(/\b\d{4,7}(\.\d{1,2})?\b/g);
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
