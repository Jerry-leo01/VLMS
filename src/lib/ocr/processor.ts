import Tesseract from 'tesseract.js';

export interface OcrResult {
  rawText: string;
  proposedKm: number | null;
  confidence: number;
}

export interface ReceiptOcrResult {
  rawText: string;
  vendorName: string | null;
  amount: number | null;
  quantityLitres: number | null;
  confidence: number;
}

/**
 * Extracts candidate numeric odometer reading from an image data URL or Blob.
 */
export async function processOdometerImage(imageSource: string | Blob): Promise<OcrResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: () => {}, // silent logger
    });

    const rawText = result.data.text || '';
    const confidence = result.data.confidence || 0;

    // Normalize text and extract numbers
    const proposedKm = extractOdometerNumber(rawText);

    return {
      rawText,
      proposedKm,
      confidence: Math.round(confidence),
    };
  } catch (err) {
    console.error('OCR processing error:', err);
    return {
      rawText: '',
      proposedKm: null,
      confidence: 0,
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
 * Regex & heuristic parser to find the most plausible odometer reading from raw OCR text.
 * Handles common OCR mistakes (e.g. 'O' instead of 0, 'KM' suffix).
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

  // Look for sequences of 3 to 7 digits, possibly followed by KM or preceded by ODO
  const matches = sanitized.match(/\b\d{3,7}(\.\d{1,2})?\b/g);

  if (matches && matches.length > 0) {
    // Pick the most likely odometer candidate (usually between 1,000 and 999,999)
    for (const match of matches) {
      const num = parseFloat(match);
      if (num >= 500 && num <= 999999) {
        return num;
      }
    }
    // Fallback to first matched number
    return parseFloat(matches[0]);
  }

  return null;
}
