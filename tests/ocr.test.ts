import { describe, it, expect } from 'vitest';
import { extractOdometerNumber } from '../src/lib/ocr/processor';

describe('OCR Odometer Number Extractor', () => {
  it('should extract clean numeric readings', () => {
    expect(extractOdometerNumber('TRIP A 450.2 ODO 124500 KM')).toBe(124500);
    expect(extractOdometerNumber('Total: 84320 km')).toBe(84320);
  });

  it('should fix common character misidentifications (O -> 0, B -> 8)', () => {
    // "12O5OO" -> 120500
    expect(extractOdometerNumber('ODO 12O5OO KM')).toBe(120500);
  });

  it('should return null if no numbers found', () => {
    expect(extractOdometerNumber('Check engine light')).toBeNull();
  });
});
