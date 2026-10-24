'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Car, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { VLMSService } from '@/lib/services/vlms-service';
import { UserRole } from '@/types/database';

export default function RegisterPage() {
  // Form State
  const [accountType, setAccountType] = useState<'staff' | 'management'>('staff');
  const [requestedRole, setRequestedRole] = useState<UserRole>('staff');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [tomCardNumber, setTomCardNumber] = useState('');
  const [officeId, setOfficeId] = useState('11111111-1111-1111-1111-111111111111');
  const [carName, setCarName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('2022');
  const [password, setPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exactOffices = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Head Office' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Lagos Branch' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'South West Branch' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'South South Branch' },
    { id: '55555555-5555-5555-5555-555555555555', name: 'South East Branch' },
    { id: '66666666-6666-6666-6666-666666666666', name: 'North Central Branch' },
    { id: '77777777-7777-7777-7777-777777777777', name: 'North West Branch' },
    { id: '88888888-8888-8888-8888-888888888888', name: 'North East Branch' },
  ];

  const handleAccountTypeChange = (type: 'staff' | 'management') => {
    setAccountType(type);
    if (type === 'staff') {
      setRequestedRole('staff');
      setAdminPasscode('');
    } else {
      setRequestedRole('administrator');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!privacyAccepted) {
      setError('You must accept the privacy policy to proceed.');
      return;
    }

    if (tomCardNumber.trim() && !/^\d{6}$/.test(tomCardNumber.trim())) {
      setError('TOM Card number must be exactly 6 numeric digits (e.g. 804689).');
      return;
    }

    if (accountType === 'management' && !adminPasscode.trim()) {
      setError('Administrative authorization passcode is required for management onboarding.');
      return;
    }

    setLoading(true);
    try {
      const normalizedPlate = normalizePlateNumber(plateNumber);
      await VLMSService.submitRegistration({
        fullName,
        phoneNumber,
        plateNumber: normalizedPlate,
        tomCardNumber: tomCardNumber.trim() || undefined,
        officeId,
        carName,
        carModel,
        carYear: parseInt(carYear, 10) || 2022,
        requestedRole,
        adminPasscode: adminPasscode.trim() || undefined,
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="bg-navy-900 text-white p-3 rounded-2xl shadow-md">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900">
          Company Car Registration
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500">
          Register company assigned car, staff credentials, and TOM card details
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-8 shadow-sm border border-slate-200 rounded-2xl space-y-6">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Registration Submitted Successfully</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Your registration for company car <strong className="text-navy-900 font-mono font-bold">{normalizePlateNumber(plateNumber)}</strong> ({carName}) has been received for verification.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-left space-y-1">
                <strong>Status: Pending Verification</strong>
                <p>
                  Fleet administration will review your car details, phone number, and branch assignment. Once authorized, you can log in to submit daily logs and fuel records.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-navy-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-navy-800 transition-colors"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Account Role Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Registration Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('staff')}
                    className={`py-3 px-4 rounded-xl border text-left transition-all ${
                      accountType === 'staff'
                        ? 'border-navy-900 bg-navy-50/60 ring-2 ring-navy-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm font-bold text-slate-900">Staff Member</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Assigned Company Car</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('management')}
                    className={`py-3 px-4 rounded-xl border text-left transition-all ${
                      accountType === 'management'
                        ? 'border-navy-900 bg-navy-50/60 ring-2 ring-navy-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm font-bold text-slate-900">Administrator / Mgr</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Privileged Passcode</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Privileged Role Sub-Selection */}
                {accountType === 'management' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-navy-950">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      Administrative Authorization
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">Privileged Role</label>
                        <select
                          value={requestedRole}
                          onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                          className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-navy-800"
                        >
                          <option value="administrator">Administrator</option>
                          <option value="fleet_manager">Fleet Manager</option>
                          <option value="department_head">Department Head</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Security Passcode <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          placeholder="e.g. VLMS-ADMIN-2026"
                          className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-navy-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      User Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 08031234567"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                </div>

                {/* Vehicle Plate & TOM Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="e.g. KJA-842XA"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      TOM Card Number <span className="text-slate-400 font-normal">(6 digits)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={tomCardNumber}
                      onChange={(e) => setTomCardNumber(e.target.value)}
                      placeholder="e.g. 804689"
                      className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                </div>

                {/* Company Car Information */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Company Car Specifications
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Car Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={carName}
                        onChange={(e) => setCarName(e.target.value)}
                        placeholder="e.g. Toyota Corolla"
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-navy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Car Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        placeholder="e.g. LE / 1.8L"
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-navy-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Car Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1990"
                        max={new Date().getFullYear() + 2}
                        required
                        value={carYear}
                        onChange={(e) => setCarYear(e.target.value)}
                        placeholder="e.g. 2022"
                        className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-navy-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Office Locations Dropdown (Exact 8 Options) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Office Branch Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={officeId}
                    onChange={(e) => setOfficeId(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  >
                    {exactOffices.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                {/* Privacy Acknowledgement */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="privacy"
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-800"
                  />
                  <label htmlFor="privacy" className="text-xs text-slate-600 leading-normal">
                    I acknowledge that odometer photographs and location coordinates are captured solely for official company car audit purposes in accordance with the{' '}
                    <Link href="/privacy" className="text-navy-900 font-semibold underline">
                      VLMS Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  {loading ? 'Submitting Registration...' : 'Submit Car Registration Request'}
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
