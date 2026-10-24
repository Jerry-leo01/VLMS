'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { OcrConfirmation } from '@/components/ocr/OcrConfirmation';
import { VLMSService } from '@/lib/services/vlms-service';
import { VehicleAssignment, Profile, DailyLog, TomCard, FuelTransaction } from '@/types/database';
import { formatCurrency, formatOdometer, getBusinessDate } from '@/lib/utils';
import { processReceiptImage, ReceiptOcrResult } from '@/lib/ocr/processor';
import {
  Fuel,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Camera,
  Receipt,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function FuelPurchasePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [tomCard, setTomCard] = useState<TomCard | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [latestKm, setLatestKm] = useState<number | null>(null);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState<'tom_card' | 'personal_fund'>('tom_card');
  const [vendorName, setVendorName] = useState('TOTAL ENERGIES FILLING STATION');
  const [amount, setAmount] = useState('');
  const [litres, setLitres] = useState('');
  const [odometerChanged, setOdometerChanged] = useState<boolean>(false);
  const [currentKm, setCurrentKm] = useState<string>('');

  // Evidence states
  const [newOdometerPhoto, setNewOdometerPhoto] = useState<string | null>(null);
  const [newOdometerHash, setNewOdometerHash] = useState<string | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const [receiptOcr, setReceiptOcr] = useState<ReceiptOcrResult | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<FuelTransaction | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const staff = await VLMSService.getStaffProfile('p-staff-01');
        const asg = await VLMSService.getActiveAssignment('p-staff-01');
        if (staff) setProfile(staff);
        if (asg) {
          setAssignment(asg);
          const card = await VLMSService.getTomCardForVehicle(asg.vehicle_id);
          if (card) setTomCard(card);

          // Strictly verify odometer against the daily log created by staff on the SAME DAY
          const log = await VLMSService.getTodayLog(asg.vehicle_id);
          if (log && log.business_date === getBusinessDate()) {
            setTodayLog(log);
            setLatestKm(log.odometer_km);
            setCurrentKm(log.odometer_km.toString());
          } else {
            setTodayLog(null);
            setLatestKm(null);
            setCurrentKm('');
          }
        }
      } catch (err) {
        console.error('Failed to load fuel form data:', err);
      }
    }
    loadData();
  }, []);

  const handlePaymentMethodChange = (method: 'tom_card' | 'personal_fund') => {
    setPaymentMethod(method);
    if (method === 'tom_card') {
      setVendorName('TOTAL ENERGIES FILLING STATION');
    } else {
      setVendorName('');
    }
  };

  const handleReceiptCaptured = async (dataUrl: string, hash: string) => {
    setReceiptPhoto(dataUrl);
    setReceiptHash(hash);
    setIsScanningReceipt(true);
    try {
      const parsed = await processReceiptImage(dataUrl);
      setReceiptOcr(parsed);
      if (parsed.vendorName && !vendorName) {
        setVendorName(parsed.vendorName);
      }
      if (parsed.amount && !amount) {
        setAmount(parsed.amount.toString());
      }
      if (parsed.quantityLitres && !litres) {
        setLitres(parsed.quantityLitres.toString());
      }
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const applyReceiptData = () => {
    if (!receiptOcr) return;
    if (receiptOcr.vendorName && paymentMethod === 'personal_fund') {
      setVendorName(receiptOcr.vendorName);
    }
    if (receiptOcr.amount) {
      setAmount(receiptOcr.amount.toString());
    }
    if (receiptOcr.quantityLitres) {
      setLitres(receiptOcr.quantityLitres.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setErrorMessage(null);

    // Strict validation: must have verified today's daily log
    if (!todayLog) {
      setErrorMessage(
        `No verified daily log found for today (${getBusinessDate()}). You must submit today's daily vehicle log before recording fuel purchases.`
      );
      return;
    }

    const parsedAmount = parseFloat(amount);
    const parsedLitres = parseFloat(litres);
    const parsedKm = parseFloat(currentKm);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid purchase amount.');
      return;
    }
    if (isNaN(parsedLitres) || parsedLitres <= 0) {
      setErrorMessage('Please enter a valid fuel quantity in litres.');
      return;
    }
    if (isNaN(parsedKm) || parsedKm < 0) {
      setErrorMessage('Please enter a valid odometer reading.');
      return;
    }

    if (parsedKm < todayLog.odometer_km) {
      setErrorMessage(
        `Fuel purchase odometer reading (${parsedKm} km) cannot be less than today's verified daily log reading (${todayLog.odometer_km} km).`
      );
      return;
    }

    if (paymentMethod === 'personal_fund' && !receiptPhoto) {
      setErrorMessage('A photograph of the fuel receipt is mandatory for personal-fund purchases.');
      return;
    }

    if (odometerChanged && !newOdometerPhoto) {
      setErrorMessage('Since the odometer has changed, a new dashboard photograph is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Resolve Odometer Evidence ID (Reuse today's daily log evidence if reading unchanged)
      let odometerEvidenceId: string;
      if (!odometerChanged && todayLog) {
        odometerEvidenceId = todayLog.evidence_id;
      } else {
        const ev = await VLMSService.saveEvidenceFile({
          evidenceType: 'fuel_odometer',
          sha256Hash: newOdometerHash || `hash-${Date.now()}`,
          mimeType: 'image/jpeg',
          fileSizeBytes: 390000,
          metadata: { reading: parsedKm },
        });
        odometerEvidenceId = ev.id;
      }

      // 2. Resolve Receipt Evidence ID
      let receiptEvidenceId = odometerEvidenceId; // default fallback for tom card
      if (paymentMethod === 'personal_fund' && receiptHash) {
        const recEv = await VLMSService.saveEvidenceFile({
          evidenceType: 'fuel_receipt',
          sha256Hash: receiptHash,
          mimeType: 'image/jpeg',
          fileSizeBytes: 280000,
          metadata: { vendor: vendorName, amount: parsedAmount },
        });
        receiptEvidenceId = recEv.id;
      }

      // 3. Submit transaction with unique idempotency key
      const idempotencyKey = `idem-${assignment.vehicle_id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { transaction } = await VLMSService.submitFuelTransaction({
        vehicleId: assignment.vehicle_id,
        userId: 'p-staff-01',
        dailyLogId: todayLog?.id ?? null,
        paymentMethod,
        tomCardId: paymentMethod === 'tom_card' ? tomCard?.id : null,
        vendorName: paymentMethod === 'tom_card' ? 'TOTAL ENERGIES FILLING STATION' : vendorName,
        odometerKm: parsedKm,
        odometerEvidenceId,
        receiptEvidenceId,
        amount: parsedAmount,
        currency: 'NGN',
        quantityLitres: parsedLitres,
        purchasedAt: new Date().toISOString(),
        idempotencyKey,
      });

      setCompletedTx(transaction);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to submit fuel transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name ?? 'Chukwuma Eze'}
        vehiclePlate={assignment?.vehicle?.plate_number ?? 'KJA-842XA'}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href="/staff"
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Record Fuel Purchase</h1>
            <p className="text-xs text-slate-500">
              Vehicle: <span className="font-mono font-semibold">{assignment?.vehicle?.plate_number}</span> • Date: {getBusinessDate()}
            </p>
          </div>
        </div>

        {completedTx ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Fuel Purchase Recorded</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Successfully recorded fuel transaction of{' '}
              <strong className="text-navy-950 font-bold">{formatCurrency(completedTx.amount)}</strong> ({completedTx.quantity_litres} Litres) at{' '}
              <strong className="text-navy-950">{completedTx.vendor_name}</strong>.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
              <div>Transaction ID: <span className="text-slate-800 font-semibold">{completedTx.id}</span></div>
              <div>Method: <span className="uppercase font-semibold">{completedTx.payment_method.replace('_', ' ')}</span></div>
              <div>Odometer: <span className="text-slate-800 font-semibold">{formatOdometer(completedTx.odometer_km)}</span></div>
              <div>Status: <span className="uppercase text-emerald-700 font-bold">{completedTx.status}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 max-w-sm mx-auto">
              <Link
                href="/staff/history"
                className="flex-1 py-2.5 px-4 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 text-center shadow-sm"
              >
                View In Submissions History
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCompletedTx(null);
                  setAmount('');
                  setLitres('');
                }}
                className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 text-center"
              >
                Record Another Purchase
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Mandatory Daily Log Verification Notice */}
            {!todayLog && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  Mandatory Daily Log Required
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  No verified daily log was found for today ({getBusinessDate()}). The system strictly requires your daily odometer log to be submitted before recording any fuel purchases.
                </p>
                <div className="pt-1">
                  <Link
                    href="/staff/log"
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 shadow-sm"
                  >
                    Submit Today&apos;s Daily Log Now
                  </Link>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Fuel Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('tom_card')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === 'tom_card'
                      ? 'border-navy-900 bg-navy-50/50 ring-2 ring-navy-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-navy-800 mb-1.5" />
                  <span className="block text-sm font-bold text-slate-900">TOM Card</span>
                  <span className="text-[11px] text-slate-500 block">TotalEnergies Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentMethodChange('personal_fund')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    paymentMethod === 'personal_fund'
                      ? 'border-navy-900 bg-navy-50/50 ring-2 ring-navy-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-emerald-700 mb-1.5" />
                  <span className="block text-sm font-bold text-slate-900">Personal Fund</span>
                  <span className="text-[11px] text-slate-500 block">Requires Receipt Upload</span>
                </button>
              </div>
            </div>

            {/* Card / Vendor Details */}
            {paymentMethod === 'tom_card' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-700">Assigned Card</span>
                  <span className="text-xs font-mono font-bold text-navy-900">
                    {tomCard?.masked_card_number ?? '7004 **** **** 1024'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vendor (Fixed)</label>
                  <input
                    type="text"
                    disabled
                    value="TOTAL ENERGIES FILLING STATION"
                    className="mt-1 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    TOM Card transactions are policy-restricted to TotalEnergies stations.
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Filling Station / Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Mobil Oil Service Station, Ikeja"
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>
              </div>
            )}

            {/* Amount & Litres */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Total Amount (NGN ₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Fuel Quantity (Litres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  placeholder="e.g. 40.5"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>
            </div>

            {/* Smart Odometer Verification & Evidence Reuse */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">Odometer Verification</span>
                <span className="text-xs text-slate-500">
                  Latest: <strong className="font-mono">{formatOdometer(latestKm)}</strong>
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-700 block">
                  Has the odometer reading changed since your daily log ({latestKm} KM)?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOdometerChanged(false)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      !odometerChanged
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    No, Still {latestKm} KM
                  </button>
                  <button
                    type="button"
                    onClick={() => setOdometerChanged(true)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border ${
                      odometerChanged
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Yes, Reading Changed
                  </button>
                </div>
              </div>

              {!odometerChanged ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Smart Audit: Reusing today&apos;s verified daily odometer photo. No duplicate photo required.
                  </span>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      New Current Odometer (KM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={currentKm}
                      onChange={(e) => setCurrentKm(e.target.value)}
                      placeholder="e.g. 45280"
                      className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-semibold"
                    />
                  </div>

                  <CameraCapture
                    title="Photograph Current Odometer"
                    instruction="A new photo is required because the vehicle has traveled since the daily log."
                    onCapture={(dataUrl, hash) => {
                      setNewOdometerPhoto(dataUrl);
                      setNewOdometerHash(hash);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Receipt Capture (Mandatory for Personal Fund) */}
            {paymentMethod === 'personal_fund' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-navy-800" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Fuel Purchase Receipt (Mandatory)
                  </h3>
                </div>
                <CameraCapture
                  title="Photograph Fuel Receipt"
                  instruction="Capture the official receipt showing station name, amount paid, and date."
                  captureType="receipt"
                  overlayText="Frame Fuel Receipt Clearly Here"
                  onCapture={handleReceiptCaptured}
                />

                {isScanningReceipt && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Analyzing fuel receipt via OCR...</span>
                  </div>
                )}

                {receiptOcr && !isScanningReceipt && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Receipt Data Detected
                      </span>
                      <button
                        type="button"
                        onClick={applyReceiptData}
                        className="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-[11px] shadow-sm transition-colors"
                      >
                        Auto-fill Form from Receipt
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                      <div>
                        Station:{' '}
                        <strong className="block text-slate-900">
                          {receiptOcr.vendorName || 'Not detected'}
                        </strong>
                      </div>
                      <div>
                        Amount:{' '}
                        <strong className="block text-slate-900">
                          {receiptOcr.amount ? formatCurrency(receiptOcr.amount) : 'Not detected'}
                        </strong>
                      </div>
                      <div>
                        Volume:{' '}
                        <strong className="block text-slate-900">
                          {receiptOcr.quantityLitres ? `${receiptOcr.quantityLitres} L` : 'Not detected'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !todayLog}
              className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Validating & Recording Fuel Purchase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Submit Fuel Transaction</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
