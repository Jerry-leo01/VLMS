'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { VLMSService } from '@/lib/services/vlms-service';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Multi-step State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Identifier, 2: Code & New Password, 3: Success
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedContact, setMaskedContact] = useState<string>('');
  const [devCode, setDevCode] = useState<string | null>(null);

  // Step 1: Request Password Reset Code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmed = identifier.trim();
      if (!trimmed) {
        throw new Error('Please enter your vehicle plate number or registered corporate email.');
      }

      const result = await VLMSService.initiatePasswordReset(trimmed);
      setMaskedContact(result.maskedContact);
      if (result.recoveryCode) {
        setDevCode(result.recoveryCode);
      }
      setStep(2);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Unable to initiate password reset. Please verify your account details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code and Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      await VLMSService.verifyAndResetPassword({
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
      });

      setStep(3);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Password reset failed. Please ensure the code is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200 relative">
      {/* Top Bar with Brand Link & Theme Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
      </div>
      <div className="absolute top-4 left-4">
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <div className="bg-navy-900 dark:bg-blue-600 text-white p-3 rounded-2xl shadow-md">
            <KeyRound className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset Your Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 dark:text-slate-400">
          Recover access to your VLMS driver or administrative account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-6 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-8 space-y-5 transition-colors">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Plate Number or Corporate Email <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="identifier"
                    type="text"
                    required
                    placeholder="e.g. KSF-123-XY or admin@company.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  Drivers can input their assigned vehicle plate number. Administrative staff can enter their corporate email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>{loading ? 'Finding Account...' : 'Send Recovery Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Mail className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold">Security Verification Code Sent</p>
                  <p className="mt-0.5 text-[11px] text-blue-800 dark:text-blue-300">
                    A 6-digit recovery code has been dispatched to <strong>{maskedContact}</strong>. The code expires in 10 minutes.
                  </p>
                </div>
              </div>

              {devCode && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Quick Access Recovery Code (Local / Simulation Mode)</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Use code:
                    </span>
                    <span className="font-mono text-base font-bold tracking-widest text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      {devCode}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  6-Digit Recovery Code <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center font-mono tracking-widest text-lg px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex justify-between items-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Change Identifier
                </button>
                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loading}
                  className="text-navy-800 dark:text-blue-400 font-medium hover:underline"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Password Reset Successful
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Your credentials have been securely updated across all devices. You may now sign in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>Sign In Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div>
              Remember your credentials?{' '}
              <Link
                href="/login"
                className="font-semibold text-navy-900 dark:text-blue-400 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}