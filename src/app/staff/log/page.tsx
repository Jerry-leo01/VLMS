'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { OcrConfirmation } from '@/components/ocr/OcrConfirmation';
import { LocationPicker } from '@/components/gps/LocationPicker';
import { VLMSService } from '@/lib/services/vlms-service';
import {
  VehicleAssignment,
  Profile,
  DailyLog,
  OdometerUnit,
  AnomalyAlert,
} from '@/types/database';
import { getBusinessDate, formatAnomalyText } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DailyLogSubmissionPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedRoi, setCapturedRoi] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [confirmedKm, setConfirmedKm] = useState<number | null>(null);
  const [sourceUnit, setSourceUnit] = useState<OdometerUnit>('km');
  const [sourceReading, setSourceReading] = useState<number | null>(null);
  const [rawOdometerText, setRawOdometerText] = useState<string>('');
  const [ocrReadingKm, setOcrReadingKm] = useState<number | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    accuracyM: number;
  } | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedLog, setSubmittedLog] = useState<DailyLog | null>(null);
  const [triggeredAnomalies, setTriggeredAnomalies] = useState<AnomalyAlert[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();

        if (authData?.user) {
          const matchedProfile = await VLMSService.getStaffProfileByAuthId(authData.user.id);
          if (matchedProfile) {
            const asg = await VLMSService.getActiveAssignment(matchedProfile.id);
            setProfile(matchedProfile);
            if (asg) {
              setAssignment(asg);
              const today = await VLMSService.getTodayLog(asg.vehicle_id);
              if (today) setExistingLog(today);
            }
            return;
          }
        }

        const { profile: ctxProfile, assignment: ctxAsg } =
          await VLMSService.getCurrentStaffContext();
        if (ctxProfile) setProfile(ctxProfile);
        if (ctxAsg) {
          setAssignment(ctxAsg);
          const today = await VLMSService.getTodayLog(ctxAsg.vehicle_id);
          if (today) setExistingLog(today);
        }
      } catch (err) {
        console.error('Failed to init log page:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCaptureComplete = (dataUrl: string, hash: string, roiDataUrl?: string) => {
    setCapturedImage(dataUrl);
    setImageHash(hash);
    if (roiDataUrl) setCapturedRoi(roiDataUrl);
  };

  const handleOcrConfirmed = (data: {
    confirmedKm: number;
    sourceUnit: OdometerUnit;
    sourceReading: number;
    rawOdometerText: string;
    ocrReadingKm: number | null;
    ocrConfidence: number;
  }) => {
    setConfirmedKm(data.confirmedKm);
    setSourceUnit(data.sourceUnit);
    setSourceReading(data.sourceReading);
    setRawOdometerText(data.rawOdometerText);
    setOcrReadingKm(data.ocrReadingKm);
    setOcrConfidence(data.ocrConfidence);

    setTimeout(() => {
      const step3 = document.getElementById('step-gps');
      if (step3) {
        step3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) {
      setSubmissionError(
        'No active vehicle assignment found for your account. Please register your vehicle or contact an administrator.'
      );
      return;
    }
    if (confirmedKm === null) {
      setSubmissionError('Please confirm the odometer reading to proceed.');
      return;
    }
    if (!imageHash || !capturedImage) {
      setSubmissionError('Odometer photograph is required.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      // 1. Save evidence file with actual captured image dataUrl
      const evidence = await VLMSService.saveEvidenceFile({
        evidenceType: 'daily_odometer',
        sha256Hash: imageHash,
        mimeType: 'image/jpeg',
        fileSizeBytes: Math.round(capturedImage.length * 0.75),
        dataUrl: capturedImage,
        metadata: {
          reading: confirmedKm,
          sourceReading: sourceReading ?? confirmedKm,
          sourceUnit,
          ocrProposal: ocrReadingKm,
          ocrConfidence,
        },
      });

      // 2. Submit daily log
      const { log, anomalies } = await VLMSService.submitDailyLog({
        vehicleId: assignment.vehicle_id,
        userId: profile?.id ?? assignment.user_id,
        odometerKm: confirmedKm,
        rawOdometerText,
        sourceUnit,
        sourceReading: sourceReading ?? confirmedKm,
        ocrReadingKm,
        ocrConfidence,
        evidenceId: evidence.id,
        comment: comment || undefined,
        latitude: gpsData?.latitude,
        longitude: gpsData?.longitude,
        gpsAccuracyM: gpsData?.accuracyM,
      });

      setSubmittedLog(log);
      setTriggeredAnomalies(anomalies);
    } catch (err: unknown) {
      const error = err as Error;
      setSubmissionError(error.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name}
        vehiclePlate={assignment?.vehicle?.plate_number}
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
            <h1 className="text-xl font-bold text-slate-900">Daily Vehicle Odometer Log</h1>
            <p className="text-xs text-slate-500">Business Date: {getBusinessDate()}</p>
          </div>
        </div>

        {/* Existing log warning if already submitted */}
        {existingLog && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Daily Log Already Recorded
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              A daily log for vehicle{' '}
              <strong className="font-mono">{assignment?.vehicle?.plate_number}</strong> has already been submitted for today with an odometer reading of{' '}
              <strong className="font-mono">{existingLog.odometer_km} KM</strong>. Only one official daily log is permitted per vehicle per business date.
            </p>
            <div className="flex gap-2 pt-1">
              <Link
                href="/staff/fuel"
                className="py-2 px-3 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 shadow-sm"
              >
                Go to Fuel Purchase Form
              </Link>
              <Link
                href="/staff"
                className="py-2 px-3 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {submittedLog ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Daily Log Recorded Successfully</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Odometer reading of{' '}
              <strong className="font-mono text-navy-950 font-bold">
                {submittedLog.odometer_km} KM
              </strong>{' '}
              for vehicle{' '}
              <strong className="font-mono text-navy-950 font-bold">
                {assignment?.vehicle?.plate_number}
              </strong>{' '}
              has been saved with photographic evidence and hashed for audit.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
              <div>
                Log ID: <span className="text-slate-800 font-semibold">{submittedLog.id}</span>
              </div>
              <div>
                Business Date:{' '}
                <span className="text-slate-800 font-semibold">{submittedLog.business_date}</span>
              </div>
              <div>
                Status:{' '}
                <span
                  className={`uppercase font-bold ${
                    submittedLog.status === 'flagged' ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {submittedLog.status}
                </span>
              </div>
            </div>

            {/* Flag Reason Badges if any anomaly rule triggered */}
            {triggeredAnomalies.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Why This Submission Was Flagged for Review:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  {triggeredAnomalies.map((alert) => (
                    <li key={alert.id} className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-mono text-[10px] font-bold shrink-0">
                        {alert.rule_code.replace(/_/g, ' ')}
                      </span>
                      <span>{formatAnomalyText(alert.rule_code, alert.details)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-3 max-w-sm mx-auto">
              <Link
                href="/staff/fuel"
                className="flex-1 py-2.5 px-4 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 text-center shadow-sm"
              >
                Record Fuel Purchase
              </Link>
              <Link
                href="/staff"
                className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 text-center"
              >
                Dashboard
              </Link>
            </div>
          </div>
        ) : (
          !existingLog && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submissionError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{submissionError}</span>
                </div>
              )}

              {/* Automatically Populated Details */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Assigned Vehicle</span>
                  <span className="text-sm font-mono font-bold text-navy-950">
                    {assignment?.vehicle?.plate_number ?? 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Staff Member</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {profile?.full_name ?? 'Assigned Driver'}
                  </span>
                </div>
              </div>

              {/* Step 1: Live Camera Capture */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Live Odometer Photograph</h3>
                </div>
                <CameraCapture onCapture={handleCaptureComplete} />
              </div>

              {/* Step 2: OCR Extraction & Confirmation */}
              {capturedImage && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      OCR & Reading Confirmation
                    </h3>
                  </div>
                  <OcrConfirmation
                    imageSrc={capturedImage}
                    roiImageSrc={capturedRoi || undefined}
                    onConfirmed={handleOcrConfirmed}
                  />
                </div>
              )}

              {/* Step 3: Location Verification */}
              <div id="step-gps" className="space-y-2 scroll-mt-20">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">GPS Location Stamp</h3>
                </div>
                <LocationPicker onLocationCaptured={(data) => setGpsData(data)} />
              </div>

              {/* Step 4: Optional Pre-Trip Comment */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <label htmlFor="logComment" className="block text-xs font-semibold text-slate-800">
                  Pre-Trip Comments / Observations (Optional)
                </label>
                <textarea
                  id="logComment"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
                <p className="text-[11px] text-slate-500">
                  Record any vehicle condition notes, tire pressure checks, or route remarks.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || confirmedKm === null || !capturedImage}
                className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Validating & Submitting Log...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Submit Official Daily Log</span>
                  </>
                )}
              </button>
            </form>
          )
        )}
      </main>

      <BottomNav />
    </div>
  );
}
