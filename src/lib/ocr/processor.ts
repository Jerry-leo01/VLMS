import Tesseract from 'tesseract.js';

export interface OcrResult {
  rawText: string;
  proposedKm: number | null;
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
