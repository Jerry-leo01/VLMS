'use client';

import React, { useState, useEffect } from 'react';
import { processOdometerImage, OcrResult } from '@/lib/ocr/processor';
import { Eye, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface OcrConfirmationProps {
  imageSrc: string;
  onConfirmed: (data: {
    confirmedKm: number;
    ocrReadingKm: number | null;
    ocrConfidence: number;
  }) => void;
}

export function OcrConfirmation({ imageSrc, onConfirmed }: OcrConfirmationProps) {
  const [ocrLoading, setOcrLoading] = useState(true);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);
  const [userKm, setUserKm] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const runOcr = async () => {
      setOcrLoading(true);
      const res = await processOdometerImage(imageSrc);
      if (isMounted) {
        setOcrData(res);
        if (res.proposedKm) {
          setUserKm(res.proposedKm.toString());
        }
        setOcrLoading(false);
      }
    };
    runOcr();
    return () => {
      isMounted = false;
    };
  }, [imageSrc]);

  const numericUserKm = parseFloat(userKm);
  const isMismatch =
    ocrData?.proposedKm !== null &&
    ocrData?.proposedKm !== undefined &&
    !isNaN(numericUserKm) &&
    Math.abs(numericUserKm - ocrData.proposedKm) > 10;

  const handleConfirm = () => {
    if (isNaN(numericUserKm) || numericUserKm < 0) return;
    onConfirmed({
      confirmedKm: numericUserKm,
      ocrReadingKm: ocrData?.proposedKm ?? null,
      ocrConfidence: ocrData?.confidence ?? 0,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-900">Odometer OCR Extraction</h4>
        </div>
        {ocrLoading && (
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Analyzing image...
          </span>
        )}
      </div>

      {ocrLoading ? (
        <div className="py-6 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
          <p className="text-sm font-medium text-slate-700">Scanning odometer display...</p>
          <p className="text-xs text-slate-400">Extracting numbers and checking optical confidence</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* OCR Proposal Card */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-700 font-medium block">OCR Proposed Reading</span>
              <span className="text-lg font-bold text-navy-950 font-mono">
                {ocrData?.proposedKm ? `${ocrData.proposedKm.toLocaleString()} KM` : 'Uncertain (Verify below)'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-blue-700 font-medium block">Confidence</span>
              <span className="text-sm font-semibold text-blue-900">{ocrData?.confidence ?? 0}%</span>
            </div>
          </div>

          {/* User Confirmation Input */}
          <div className="space-y-1.5">
            <label htmlFor="confirmedKm" className="block text-xs font-semibold text-slate-700">
              Confirmed Kilometre Reading (KM) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmedKm"
                type="number"
                step="0.1"
                min="0"
                value={userKm}
                onChange={(e) => setUserKm(e.target.value)}
                placeholder="e.g. 45200"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">KM</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Please verify that this exact reading matches the odometer display in your photo.
            </p>
          </div>

          {/* Mismatch Warning */}
          {isMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Your confirmed reading differs from the OCR result. This entry will be flagged for routine supervisory review, but submission will proceed.
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isNaN(numericUserKm) || numericUserKm <= 0}
            className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Confirm Reading
          </button>
        </div>
      )}
    </div>
  );
}
