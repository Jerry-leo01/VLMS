'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  UserPlus,
} from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { VLMSService } from '@/lib/services/vlms-service';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const [regMode, setRegMode] = useState<'staff' | 'admin'>('staff');

  // Staff Registration Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [tomCardNumber, setTomCardNumber] = useState('');
  const [officeId, setOfficeId] = useState('11111111-1111-1111-1111-111111111111');
  const [carName, setCarName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('2023');
  const [password, setPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Admin Registration State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'administrator' | 'fleet_manager' | 'auditor'>(
    'administrator'
  );

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

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!privacyAccepted) {
      setError('You must accept the privacy policy to proceed.');
      return;
    }

    if (tomCardNumber.trim() && !/^\d{6}$/.test(tomCardNumber.trim())) {
      setError('TOM Card number must be exactly 6 numeric digits.');
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
        carYear: parseInt(carYear, 10) || 2023,
        requestedRole: 'staff',
      });

      setSubmitted(true);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!privacyAccepted) {
      setError('You must accept the privacy policy to proceed.');
      return;
    }

    setLoading(true);
    try {
      const { profile, role } = await VLMSService.registerAdminAccount({
        fullName,
        email: adminEmail,
        phoneNumber,
        officeId,
        role: adminRole,
      });

      VLMSService.setActiveSession({
        userId: profile.id,
        role,
        fullName: profile.full_name,
        email: profile.email,
      });

      router.push('/management');
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Administrator registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative">
      {/* Top Bar with Brand Link & Theme Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
      </div>
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to VLMS
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="bg-navy-900 dark:bg-blue-600 text-white p-3 rounded-2xl shadow-md">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          VLMS Onboarding & Registration
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Register assigned company vehicles or provision management accounts
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-slate-900 py-6 sm:py-8 px-4 sm:px-8 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6 transition-colors">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Registration Submitted Successfully
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                Your registration for company car{' '}
                <strong className="text-navy-900 dark:text-blue-400 font-mono font-bold">
                  {normalizePlateNumber(plateNumber)}
                </strong>{' '}
                ({carName}) has been received for verification.
              </p>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200 text-left space-y-1">
                <strong>Status: Pending Administrator Approval</strong>
                <p>
                  Fleet administration will review your car details, phone number, and branch assignment in the Approvals Queue. Once authorized, you can sign in using your plate number.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                Proceed to Sign In Portal
              </Link>
            </div>
          ) : (
            <>
              {/* Registration Type Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('staff');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    regMode === 'staff'
                      ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Staff Vehicle Registration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('admin');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    regMode === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Administrator Access Setup
                </button>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs sm:text-sm text-red-800 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {regMode === 'staff' ? (
                <>
                  {/* Staff Registration Banner */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Staff Company Car Registration
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Register your profile and assigned vehicle details. Submissions are queued for fleet administration verification before access is granted.
                    </p>
                  </div>

                  <form onSubmit={handleStaffSubmit} className="space-y-4">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="staffFullName"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="staffFullName"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Driver first and surname.
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor="staffPhone"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          User Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="staffPhone"
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Active mobile contact number.
                        </p>
                      </div>
                    </div>

                    {/* Vehicle Plate & TOM Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="staffPlate"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Vehicle Plate Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="staffPlate"
                          type="text"
                          required
                          value={plateNumber}
                          onChange={(e) => setPlateNumber(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-mono uppercase text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Official registration plate number.
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor="staffTomCard"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          TOM Card Number <span className="text-slate-500 font-normal">(6 digits)</span>
                        </label>
                        <input
                          id="staffTomCard"
                          type="text"
                          maxLength={6}
                          value={tomCardNumber}
                          onChange={(e) => setTomCardNumber(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          6-digit numeric fuel card reference.
                        </p>
                      </div>
                    </div>

                    {/* Company Car Information */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Company Car Specifications
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="carName"
                            className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            Car Make / Brand <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="carName"
                            type="text"
                            required
                            value={carName}
                            onChange={(e) => setCarName(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                          />
                          <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                            Vehicle manufacturer name.
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor="carModel"
                            className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            Car Model <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="carModel"
                            type="text"
                            required
                            value={carModel}
                            onChange={(e) => setCarModel(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                          />
                          <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                            Model series and trim.
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor="carYear"
                            className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            Car Year <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="carYear"
                            type="number"
                            min="1990"
                            max={new Date().getFullYear() + 2}
                            required
                            value={carYear}
                            onChange={(e) => setCarYear(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                          />
                          <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                            4-digit model year.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Office Locations Dropdown */}
                    <div>
                      <label
                        htmlFor="staffOffice"
                        className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Office Branch Location <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="staffOffice"
                        value={officeId}
                        onChange={(e) => setOfficeId(e.target.value)}
                        className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
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
                      <label
                        htmlFor="staffPassword"
                        className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="staffPassword"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        Enter at least 6 characters for account security.
                      </p>
                    </div>

                    {/* Privacy Acknowledgement */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        id="privacy"
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-navy-900 focus:ring-navy-800 dark:bg-slate-800"
                      />
                      <label
                        htmlFor="privacy"
                        className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
                      >
                        I acknowledge that odometer photographs and location coordinates are captured solely for official company car audit purposes in accordance with the{' '}
                        <Link
                          href="/privacy"
                          className="text-navy-900 dark:text-blue-400 font-semibold underline"
                        >
                          VLMS Privacy Policy
                        </Link>
                        .
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      {loading ? 'Submitting Registration...' : 'Submit Car Registration Request'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Step-by-Step Admin Registration & Access Guide */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-navy-900 dark:text-blue-300">
                      <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>How Administrators Register & Gain Access</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <li>
                        <strong>Complete Management Profile:</strong> Provide your full name, corporate email address, phone number, and branch office below.
                      </li>
                      <li>
                        <strong>Assign Administrative Role:</strong> Select <em>Administrator</em>, <em>Fleet Manager</em>, or <em>Auditor</em>.
                      </li>
                      <li>
                        <strong>Direct Module Redirect:</strong> Submitting this form provisions your active management profile, records an immutable audit event, and signs you directly into the Admin Module (<code className="font-mono">/management</code>).
                      </li>
                    </ol>
                  </div>

                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admName"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Administrator Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="admName"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Full name for governance logs.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="admEmail"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Corporate Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="admEmail"
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        />
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                          Used to sign into the Admin Module.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admPhone"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Official Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="admPhone"
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admRoleSelect"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Administrative Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="admRoleSelect"
                          value={adminRole}
                          onChange={(e) =>
                            setAdminRole(
                              e.target.value as 'administrator' | 'fleet_manager' | 'auditor'
                            )
                          }
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        >
                          <option value="administrator">Administrator</option>
                          <option value="fleet_manager">Fleet Manager</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="admOfficeSelect"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Office Branch Location <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="admOfficeSelect"
                          value={officeId}
                          onChange={(e) => setOfficeId(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        >
                          {exactOffices.map((off) => (
                            <option key={off.id} value={off.id}>
                              {off.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="admPasswordInput"
                          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="admPasswordInput"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="mt-1 w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        id="privacyAdmin"
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-navy-900 focus:ring-navy-800 dark:bg-slate-800"
                      />
                      <label
                        htmlFor="privacyAdmin"
                        className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
                      >
                        I acknowledge administrative governance responsibilities and the{' '}
                        <Link
                          href="/privacy"
                          className="text-navy-900 dark:text-blue-400 font-semibold underline"
                        >
                          VLMS Privacy Policy
                        </Link>
                        .
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>
                        {loading ? 'Provisioning Admin Access...' : 'Register & Access Admin Module'}
                      </span>
                    </button>
                  </form>
                </>
              )}

              <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                Already registered?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-navy-900 dark:text-blue-400 hover:underline"
                >
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
