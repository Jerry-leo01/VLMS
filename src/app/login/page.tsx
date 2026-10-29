'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, AlertCircle, ArrowRight } from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { VLMSService } from '@/lib/services/vlms-service';

export default function LoginPage() {
  const router = useRouter();

  // Unified Sign In State (Drivers enter plate number; Admins enter corporate email)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            'Administrator account not found. If you need a management account, complete the 60-second supervised setup on the registration page.'
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
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

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

          <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div>
              New user?{' '}
              <Link
                href="/register"
                className="font-semibold text-navy-900 dark:text-blue-400 hover:underline"
              >
                Register vehicle or setup admin access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
