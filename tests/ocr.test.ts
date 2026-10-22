import { describe, it, expect } from 'vitest';
import { extractOdometerNumber, extractReceiptData } from '../src/lib/ocr/processor';

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

describe('OCR Receipt Data Parser', () => {
  it('should extract vendor name, total amount, and litres from receipt text', () => {
    const receiptSample = `
      TOTAL ENERGIES FILLING STATION
      Plot 12 Marina, Lagos
      Date: 22/10/2026
      PUMP: 04
      PRICE/LTR: 850.00
      LITRES: 45.20 LTR
      TOTAL AMOUNT: 38,420.00 NGN
      THANK YOU FOR YOUR PATRONAGE
    `;
    const res = extractReceiptData(receiptSample);
    expect(res.vendorName).toBe('TOTAL ENERGIES FILLING STATION');
    expect(res.amount).toBe(38420);
    expect(res.quantityLitres).toBe(45.2);
  });
});
