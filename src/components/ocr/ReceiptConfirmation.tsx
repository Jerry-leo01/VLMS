'use client';

import React, { useState, useEffect } from 'react';
import { ReceiptOcrResult } from '@/lib/ocr/processor';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Fuel,
  Banknote,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';

interface ReceiptConfirmationProps {
  imageSrc: string;
  ocrResult: ReceiptOcrResult;
  onConfirm: (verified: {
    fillingStation: string;
    transactionDateTime: string | null;
    amount: number;
    quantityLitres: number;
    rawText: string;
    confidence: number;
  }) => void;
  onRetake: () => void;
}

const COMMON_STATIONS = [
  'TOTAL ENERGIES FILLING STATION',
  'NNPC RETAIL',
  'MOBIL SERVICE STATION',
  'OANDO SERVICE STATION',
  'CONOIL SERVICE STATION',
  'ARDOVA PLC (AP)',
  'BOVAS FILLING STATION',
];

export function ReceiptConfirmation({
  imageSrc,
  ocrResult,
  onConfirm,
  onRetake,
}: ReceiptConfirmationProps) {
  const getLiveFormattedTimestamp = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  // Editable fields initialized from OCR extraction with automatic real-time timestamp fallback
  const [stationName, setStationName] = useState(
    ocrResult.fillingStation || ocrResult.vendorName || ''
  );
  const [dateTime, setDateTime] = useState(
    ocrResult.transactionDateTime || getLiveFormattedTimestamp()
  );
  const [amountInput, setAmountInput] = useState(
    ocrResult.amount ? ocrResult.amount.toString() : ''
  );
  const [litresInput, setLitresInput] = useState(
    ocrResult.quantityLitres ? ocrResult.quantityLitres.toString() : ''
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setStationName(ocrResult.fillingStation || ocrResult.vendorName || '');
    setDateTime(ocrResult.transactionDateTime || getLiveFormattedTimestamp());
    setAmountInput(ocrResult.amount ? ocrResult.amount.toString() : '');
    setLitresInput(ocrResult.quantityLitres ? ocrResult.quantityLitres.toString() : '');
  }, [ocrResult]);

  const parsedAmount = parseFloat(amountInput);
  const parsedLitres = parseFloat(litresInput);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const isLitresValid = !isNaN(parsedLitres) && parsedLitres > 0;

  const handleConfirm = () => {
    setValidationError(null);
    if (!stationName.trim()) {
      setValidationError('Please enter or select a filling station name.');
      return;
    }
    if (!isAmountValid) {
      setValidationError('Please enter a valid total amount in NGN.');
      return;
    }
    if (!isLitresValid) {
      setValidationError('Please enter a valid fuel quantity in litres.');
      return;
    }

    onConfirm({
      fillingStation: stationName.trim(),
      transactionDateTime: dateTime.trim() || null,
      amount: parsedAmount,
      quantityLitres: parsedLitres,
      rawText: ocrResult.rawText,
      confidence: ocrResult.confidence,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Receipt Verification & Review</h3>
            <p className="text-[11px] text-slate-500">
              Cross-check OCR detected figures against your physical receipt before submitting.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
          {ocrResult.confidence}% Confidence
        </span>
      </div>

      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Receipt Image on left, Editable Fields on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left: Captured Receipt Photo with preview */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Captured Receipt Evidence
          </span>
          <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 aspect-[3/4] sm:aspect-square flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Captured Fuel Receipt"
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-slate-300" /> Inspect details
              </span>
              <button
                type="button"
                onClick={onRetake}
                className="text-xs text-blue-300 hover:text-white font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Retake
              </button>
            </div>
          </div>
        </div>

        {/* Right: Verification Form Inputs */}
        <div className="space-y-3.5">
          {/* Station Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-navy-800" />
              Filling Station / Marketer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Extracted from receipt header (or select station brand below)
            </span>
            {/* Quick selector buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_STATIONS.map((station) => (
                <button
                  key={station}
                  type="button"
                  onClick={() => setStationName(station)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                    stationName === station
                      ? 'bg-navy-900 text-white border-navy-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {station.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Date and Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-navy-800" />
              Transaction Date & Time
            </label>
            <input
              type="text"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Auto-populated from receipt or live system clock (DD/MM/YYYY HH:MM:SS)
            </span>
          </div>

          {/* Amount & Litres Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Fuel Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-navy-800" />
                Quantity (Litres) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={litresInput}
                onChange={(e) => setLitresInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Volume dispensed (L)</span>
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-navy-800" />
                Total (₦ NGN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Total paid in Naira</span>
            </div>
          </div>

          {/* Live Calculated Unit Price Preview */}
          {isAmountValid && isLitresValid && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between font-mono">
              <span className="text-slate-500 text-[11px]">Calculated Unit Price:</span>
              <span className="font-bold text-navy-950">
                {formatCurrency(parsedAmount / parsedLitres)} / Litre
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Confirm & Populate Fuel Form</span>
        </button>

        <button
          type="button"
          onClick={onRetake}
          className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Retake Receipt</span>
        </button>
      </div>
    </div>
  );
}
