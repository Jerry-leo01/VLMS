'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  BookOpen,
  Building2,
} from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { VLMSService } from '@/lib/services/vlms-service';
import { Office } from '@/types/database';

export default function LoginPage() {
  const router = useRouter();
  const [authTab, setAuthTab] = useState<'signin' | 'admin_setup'>('signin');

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin Registration & Access State
  const [offices, setOffices] = useState<Office[]>([]);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminOfficeId, setAdminOfficeId] = useState('11111111-1111-1111-1111-111111111111');
  const [adminRole, setAdminRole] = useState<'administrator' | 'fleet_manager' | 'auditor'>(
    'administrator'
  );
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    VLMSService.getOffices().then((list) => {
      setOffices(list);
      if (list.length > 0) setAdminOfficeId(list[0].id);
    });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmed = identifier.trim();
      const isEmail = trimmed.includes('@');
      const supabase = createClient();

      if (isEmail) {
        // 1. Check local / hybrid production store first
        const localProfile = await VLMSService.getStaffProfileByEmail(trimmed);
        if (localProfile) {
          const role = (await VLMSService.getUserRole(localProfile.id)) || 'administrator';
          VLMSService.setActiveSession({
            userId: localProfile.id,
            role,
            fullName: localProfile.full_name,
            email: localProfile.email,
          });
          if (
            role === 'administrator' ||
            role === 'fleet_manager' ||
            role === 'department_head' ||
            role === 'auditor'
          ) {
            router.push('/management');
          } else {
            router.push('/staff');
          }
          return;
        }

        // 2. Authenticate via Supabase Auth
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });

        if (authError) {
          throw new Error(
            'Administrator account not found. Use the "Admin Registration & Access" tab above to register your administrator account.'
          );
        }

        if (data?.user) {
          const profile = await VLMSService.getStaffProfileByAuthId(data.user.id);
          const role = (await VLMSService.getUserRole(profile?.id || data.user.id)) || 'administrator';
          VLMSService.setActiveSession({
            userId: profile?.id || data.user.id,
            role,
            fullName: profile?.full_name || data.user.email || 'Administrator',
            email: data.user.email,
          });
          if (
            role === 'administrator' ||
            role === 'fleet_manager' ||
            role === 'department_head' ||
            role === 'auditor'
          ) {
            router.push('/management');
          } else {
            router.push('/staff');
          }
          return;
        }
      }

      // Plate Number Authentication for Drivers
      const normalizedPlate = normalizePlateNumber(trimmed);
      const vehicle = await VLMSService.getVehicleByPlate(normalizedPlate);

      if (!vehicle) {
        const pending = await VLMSService.getPendingRegistrationByPlate(normalizedPlate);
        if (pending) {
          setError(
            'Your vehicle registration is currently pending administrator verification. Once approved in the Admin Portal, you can sign in.'
          );
          return;
        }
        throw new Error(
          'Vehicle plate number not registered. Please submit a company car registration request first.'
        );
      }

      const asg = await VLMSService.getActiveAssignmentByVehicle(vehicle.id);
      if (!asg) {
        throw new Error(
          'No active staff assignment found for this vehicle. Contact fleet management.'
        );
      }

      VLMSService.setActiveSession({
        userId: asg.user_id,
        role: 'staff',
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        fullName: asg.user?.full_name || 'Assigned Driver',
      });

      router.push('/staff');
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { profile, role } = await VLMSService.registerAdminAccount({
        fullName: adminFullName,
        email: adminEmail,
        phoneNumber: adminPhone,
        officeId: adminOfficeId,
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
      setError(errorObj.message || 'Failed to register administrator account.');
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
          href="/"
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to VLMS
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <div className="bg-navy-900 dark:bg-blue-600 text-white p-3 rounded-2xl shadow-md">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          VLMS Authentication Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 dark:text-slate-400">
          Sign in with your assigned vehicle plate number or management email
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-6 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-8 space-y-5 transition-colors">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('admin_setup');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'admin_setup'
                  ? 'bg-white dark:bg-slate-900 text-navy-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Admin Registration
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {authTab === 'signin' ? (
            <>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Plate Number or Management Email <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Drivers enter assigned vehicle plate number; administrators enter corporate email address.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Link
                      href="/help"
                      className="text-xs text-navy-800 dark:text-blue-400 hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="mt-1">
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Enter your account security password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div>
                  New vehicle driver?{' '}
                  <Link
                    href="/register"
                    className="font-semibold text-navy-900 dark:text-blue-400 hover:underline"
                  >
                    Submit vehicle registration request
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Step-by-Step Guide for Administrator Access */}
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-navy-900 dark:text-blue-300">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Administrator Onboarding & Access Guide</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li>
                    <strong>Register Management Profile:</strong> Complete your full name, corporate email, and branch office below.
                  </li>
                  <li>
                    <strong>Select Governance Role:</strong> Choose <em>Administrator</em>, <em>Fleet Manager</em>, or <em>Auditor</em>.
                  </li>
                  <li>
                    <strong>Immediate Console Access:</strong> Upon registration, your session is authenticated and redirected directly to the Master Operations Dashboard (<code className="font-mono">/management</code>).
                  </li>
                </ol>
              </div>

              <form onSubmit={handleAdminRegister} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="adminFullName"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Administrator Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="adminFullName"
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Official first and last name for audit trail attribution.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="adminEmail"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Corporate Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Used as your primary login identifier for the Admin Module.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="adminPhone"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Phone Number
                    </label>
                    <input
                      id="adminPhone"
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="adminRole"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Management Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="adminRole"
                      value={adminRole}
                      onChange={(e) =>
                        setAdminRole(
                          e.target.value as 'administrator' | 'fleet_manager' | 'auditor'
                        )
                      }
                      className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                    >
                      <option value="administrator">Administrator</option>
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="adminOffice"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Assigned Branch Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="adminOffice"
                    value={adminOfficeId}
                    onChange={(e) => setAdminOfficeId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  >
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="adminPass"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Create Admin Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="adminPass"
                    type="password"
                    required
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Minimum 6 characters required.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {loading ? 'Provisioning Admin Account...' : 'Register & Enter Admin Module'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
