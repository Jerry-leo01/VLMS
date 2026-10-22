'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { OcrConfirmation } from '@/components/ocr/OcrConfirmation';
import { LocationPicker } from '@/components/gps/LocationPicker';
import { VLMSService } from '@/lib/services/vlms-service';
import { VehicleAssignment, Profile, DailyLog } from '@/types/database';
import { getBusinessDate } from '@/lib/utils';
import { Truck, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DailyLogSubmissionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [confirmedKm, setConfirmedKm] = useState<number | null>(null);
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

  useEffect(() => {
    async function init() {
      try {
        const staff = await VLMSService.getStaffProfile('p-staff-01');
        const asg = await VLMSService.getActiveAssignment('p-staff-01');
        if (staff) setProfile(staff);
        if (asg) {
          setAssignment(asg);
          const today = await VLMSService.getTodayLog(asg.vehicle_id);
          if (today) {
            setExistingLog(today);
          }
        }
      } catch (err) {
        console.error('Failed to init log page:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCaptureComplete = (dataUrl: string, hash: string) => {
    setCapturedImage(dataUrl);
    setImageHash(hash);
  };

  const handleOcrConfirmed = (data: {
    confirmedKm: number;
    ocrReadingKm: number | null;
    ocrConfidence: number;
  }) => {
    setConfirmedKm(data.confirmedKm);
    setOcrReadingKm(data.ocrReadingKm);
    setOcrConfidence(data.ocrConfidence);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    if (confirmedKm === null) {
      setSubmissionError('Please confirm the odometer reading to proceed.');
      return;
    }
    if (!imageHash) {
      setSubmissionError('Odometer photograph is required.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      // 1. Save evidence file
      const evidence = await VLMSService.saveEvidenceFile({
        evidenceType: 'daily_odometer',
        sha256Hash: imageHash,
        mimeType: 'image/jpeg',
        fileSizeBytes: 420000,
        metadata: { reading: confirmedKm, ocrProposal: ocrReadingKm },
      });

      // 2. Submit daily log
      const { log } = await VLMSService.submitDailyLog({
        vehicleId: assignment.vehicle_id,
        userId: 'p-staff-01',
        odometerKm: confirmedKm,
        ocrReadingKm,
        ocrConfidence,
        evidenceId: evidence.id,
        comment: comment || undefined,
        latitude: gpsData?.latitude,
        longitude: gpsData?.longitude,
        gpsAccuracyM: gpsData?.accuracyM,
      });

      setSubmittedLog(log);
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
              A daily log for vehicle <strong className="font-mono">{assignment?.vehicle?.plate_number}</strong> has already been submitted for today with an odometer reading of <strong className="font-mono">{existingLog.odometer_km} KM</strong>. Only one official daily log is permitted per vehicle per business date.
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
              Odometer reading of <strong className="font-mono text-navy-950 font-bold">{submittedLog.odometer_km} KM</strong> for vehicle <strong className="font-mono text-navy-950 font-bold">{assignment?.vehicle?.plate_number}</strong> has been saved and hashed for audit.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
              <div>Log ID: <span className="text-slate-800 font-semibold">{submittedLog.id}</span></div>
              <div>Business Date: <span className="text-slate-800 font-semibold">{submittedLog.business_date}</span></div>
              <div>Status: <span className="uppercase text-emerald-700 font-bold">{submittedLog.status}</span></div>
            </div>

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
                  <span className="text-slate-400 block font-medium">Assigned Vehicle</span>
                  <span className="text-sm font-mono font-bold text-navy-950">
                    {assignment?.vehicle?.plate_number ?? 'KJA-842XA'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Driver</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {profile?.full_name ?? 'Chukwuma Eze'}
                  </span>
                </div>
              </div>

              {/* Step 1: Live Camera Capture */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-sm font-bold text-slate-900">Live Odometer Photograph</h3>
                </div>
                <CameraCapture onCapture={handleCaptureComplete} />
              </div>

              {/* Step 2: OCR Extraction & Confirmation */}
              {capturedImage && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="text-sm font-bold text-slate-900">OCR & Reading Confirmation</h3>
                  </div>
                  <OcrConfirmation imageSrc={capturedImage} onConfirmed={handleOcrConfirmed} />
                </div>
              )}

              {/* Step 3: Location Verification */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-sm font-bold text-slate-900">GPS Location Stamp</h3>
                </div>
                <LocationPicker onLocationCaptured={(data) => setGpsData(data)} />
              </div>

              {/* Step 4: Optional Pre-Trip Comment */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <label htmlFor="logComment" className="block text-xs font-semibold text-slate-700">
                  Pre-Trip Comments / Observations (Optional)
                </label>
                <textarea
                  id="logComment"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Clean exterior, tire pressure optimal, starting morning delivery."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
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
