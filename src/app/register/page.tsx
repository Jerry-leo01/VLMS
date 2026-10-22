'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, Shield, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { VLMSService } from '@/lib/services/vlms-service';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [tomCardNumber, setTomCardNumber] = useState('');
  const [officeId, setOfficeId] = useState('11111111-1111-1111-1111-111111111111');
  const [password, setPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!privacyAccepted) {
      setError('You must accept the privacy policy to proceed.');
      return;
    }

    setLoading(true);
    try {
      const normalizedPlate = normalizePlateNumber(plateNumber);
      await VLMSService.submitRegistration({
        fullName,
        employeeId: employeeId || undefined,
        plateNumber: normalizedPlate,
        tomCardNumber: tomCardNumber || undefined,
        officeId,
      });

      setSubmitted(true);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-navy-900 text-white p-3 rounded-2xl shadow-md">
            <Truck className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Staff Registration Request
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Submit your vehicle and driver details for administrator verification
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Request Submitted Successfully</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your registration for vehicle <strong className="text-navy-900 font-mono">{normalizePlateNumber(plateNumber)}</strong> has been sent to the Fleet Administrator for verification.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-left">
                <strong>Status: Pending Verification</strong>
                <p className="mt-0.5">
                  You will receive authorization once your vehicle and credentials have been verified by your department head or administrator.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chukwuma Eze"
                    className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP-DRV-001"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Plate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="KJA-842XA"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">TOM Card No.</label>
                    <input
                      type="text"
                      value={tomCardNumber}
                      onChange={(e) => setTomCardNumber(e.target.value)}
                      placeholder="7004-xxxx-xxxx-1024"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Office Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    >
                      <option value="11111111-1111-1111-1111-111111111111">Lagos HQ</option>
                      <option value="22222222-2222-2222-2222-222222222222">Abuja Regional</option>
                      <option value="33333333-3333-3333-3333-333333333333">Port Harcourt Hub</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="privacy"
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 rounded text-navy-900 focus:ring-navy-800"
                  />
                  <label htmlFor="privacy" className="text-xs text-slate-600 leading-normal">
                    I acknowledge that odometer photographs and location coordinates are captured solely for official fleet audit purposes in accordance with the{' '}
                    <Link href="/privacy" className="text-navy-900 font-semibold underline">
                      VLMS Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {loading ? 'Submitting Request...' : 'Submit Registration Request'}
                </button>
              </form>

              <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                Already registered?{' '}
                <Link href="/login" className="font-semibold text-navy-900 hover:underline">
                  Sign in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
