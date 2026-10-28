'use client';

import React, { useState, useEffect } from 'react';
import { processOdometerImage, OcrResult } from '@/lib/ocr/processor';
import { toCanonicalKm, formatOdometer, MILES_TO_KM } from '@/lib/utils';
import { OdometerUnit } from '@/types/database';
import { Eye, CheckCircle2, AlertTriangle, Sparkles, Loader2, Gauge, RefreshCw } from 'lucide-react';

interface OcrConfirmationProps {
  imageSrc: string;
  roiImageSrc?: string;
  onConfirmed: (data: {
    confirmedKm: number;
    sourceUnit: OdometerUnit;
    sourceReading: number;
    rawOdometerText: string;
    ocrReadingKm: number | null;
    ocrConfidence: number;
  }) => void;
}

export function OcrConfirmation({ imageSrc, roiImageSrc, onConfirmed }: OcrConfirmationProps) {
  const [ocrLoading, setOcrLoading] = useState(true);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);

  // Unit and reading state
  const [sourceUnit, setSourceUnit] = useState<OdometerUnit>('km');
  const [userReadingInput, setUserReadingInput] = useState<string>('');
  const [isAttached, setIsAttached] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const runOcr = async () => {
      setOcrLoading(true);
      setIsAttached(false);
      // Run OCR with multi-pass support (evaluating both ROI and full frame if available)
      const res = await processOdometerImage(imageSrc, roiImageSrc);

      if (isMounted) {
        setOcrData(res);
        setSourceUnit(res.detectedUnit || 'km');
        if (res.proposedReading !== null && res.proposedReading !== undefined) {
          setUserReadingInput(res.proposedReading.toString());
        }
        setOcrLoading(false);
      }
    };
    runOcr();
    return () => {
      isMounted = false;
    };
  }, [imageSrc, roiImageSrc]);

  // Clean and parse input safely without HTML5 type="number" trailing-dot parsing drops
  const sanitizedInput = userReadingInput.trim();
  const numericReading = parseFloat(sanitizedInput);
  const isValidNumber =
    sanitizedInput.length > 0 &&
    !isNaN(numericReading) &&
    numericReading >= 0 &&
    !sanitizedInput.endsWith('.');

  // High-precision canonical calculation (1 mile = 1.609344 km) without cumulative drift
  const canonicalKm = isValidNumber ? toCanonicalKm(numericReading, sourceUnit) : 0;

  // Calculate mismatch against canonical proposed KM
  const isMismatch =
    ocrData?.proposedReading !== null &&
    ocrData?.proposedReading !== undefined &&
    isValidNumber &&
    Math.abs(numericReading - ocrData.proposedReading) > 10;

  const handleUnitToggle = (newUnit: OdometerUnit) => {
    if (newUnit === sourceUnit) return;
    setIsAttached(false);
    setSourceUnit(newUnit);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAttached(false);
    // Allow digits and at most one decimal point
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
    setUserReadingInput(clean);
  };

  const handleConfirm = () => {
    if (!isValidNumber) return;
    setIsAttached(true);
    onConfirmed({
      confirmedKm: canonicalKm,
      sourceUnit,
      sourceReading: numericReading,
      rawOdometerText: ocrData?.rawText ?? '',
      ocrReadingKm: ocrData?.canonicalKm ?? ocrData?.proposedKm ?? null,
      ocrConfidence: ocrData?.confidence ?? 0,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-900">Odometer Verification & Unit Review</h4>
        </div>
        {ocrLoading && (
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Analyzing digits & units...
          </span>
        )}
      </div>

      {ocrLoading ? (
        <div className="py-6 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
          <p className="text-sm font-medium text-slate-700">Scanning odometer instrument cluster...</p>
          <p className="text-xs text-slate-400">Isolating digital numbers, filtering trip meters, and detecting unit (KM / Miles)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Side-by-side Photo Inspection Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Captured Cluster Photo
              </span>
              <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={roiImageSrc || imageSrc}
                  alt="Captured odometer cluster"
                  className="max-h-full max-w-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                  {roiImageSrc ? 'ROI View' : 'Full Frame'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Computer Vision Detection</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-navy-950">
                    {ocrData?.proposedReading !== null && ocrData?.proposedReading !== undefined
                      ? `${ocrData.proposedReading.toLocaleString()} ${ocrData.detectedUnit.toUpperCase()}`
                      : 'Uncertain reading'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                    {ocrData?.confidence ?? 0}% Confidence
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Detected Unit:{' '}
                  <strong className="text-navy-900 uppercase">
                    {ocrData?.detectedUnit === 'mi' ? 'Miles (Imperial)' : 'Kilometers (Metric)'}
                  </strong>
                </div>
              </div>

              {/* Unit Toggle */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">Dashboard Measurement Unit</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('km')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      sourceUnit === 'km'
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Kilometers (KM)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('mi')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      sourceUnit === 'mi'
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Miles (MI)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Confirmation & Override Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="confirmedReading" className="block text-xs font-semibold text-slate-700">
                Staff Confirmed Reading (as shown on vehicle dashboard) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500 font-semibold uppercase">
                Unit: {sourceUnit}
              </span>
            </div>
            <div className="relative">
              <input
                id="confirmedReading"
                type="text"
                inputMode="decimal"
                value={userReadingInput}
                onChange={handleInputChange}
                placeholder={sourceUnit === 'mi' ? 'e.g. 57612' : 'e.g. 92717'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent transition-all"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 uppercase">
                {sourceUnit}
              </span>
            </div>
            {sanitizedInput.endsWith('.') && (
              <p className="text-[11px] text-amber-600 font-medium">
                Please complete typing the decimal value (e.g. {sanitizedInput}0) or remove the trailing period.
              </p>
            )}
          </div>

          {/* Live Canonical Conversion Display */}
          {isValidNumber && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-800 font-semibold block">Canonical System Value</span>
                <span className="text-slate-600">
                  {sourceUnit === 'mi'
                    ? `${numericReading.toLocaleString()} Miles × ${MILES_TO_KM} = ${canonicalKm.toLocaleString()} KM`
                    : `${canonicalKm.toLocaleString()} KM`}
                </span>
              </div>
              <span className="text-base font-bold font-mono text-emerald-900">
                {formatOdometer(canonicalKm, 'km')}
              </span>
            </div>
          )}

          {/* Optical Mismatch Warning */}
          {isMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Your confirmed reading ({numericReading.toLocaleString()} {sourceUnit.toUpperCase()}) differs from the OCR result. This entry will be flagged for routine supervisory review, but submission will proceed.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValidNumber || numericReading <= 0}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                isAttached
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500 ring-offset-2'
                  : 'bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${isAttached ? 'text-white' : 'text-emerald-400'}`} />
              {isAttached
                ? `✓ Reading Attached: ${numericReading.toLocaleString()} ${sourceUnit.toUpperCase()}`
                : 'Confirm & Attach Reading'}
            </button>
            {isAttached && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-center font-medium animate-fadeIn">
                ✓ Reading locked & attached to submission payload ({formatOdometer(canonicalKm, 'km')}). Proceed below to submit.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
