'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, AlertCircle, ArrowRight } from 'lucide-react';
import { normalizePlateNumber } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('KJA-842XA');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalized = normalizePlateNumber(identifier);

      // Check demo credentials or Supabase
      if (normalized === 'KJA-842XA' || identifier.toLowerCase().includes('staff') || identifier.toLowerCase().includes('chukwuma')) {
        // Staff user
        router.push('/staff');
      } else if (identifier.toLowerCase().includes('admin') || identifier.toLowerCase().includes('adeleke')) {
        // Administrator
        router.push('/management');
      } else if (normalized === 'ABJ-194LK' || identifier.toLowerCase().includes('pending')) {
        setError('Your account is currently pending administrator verification. You cannot submit logs until approved.');
      } else {
        // Default login route for testing
        router.push('/staff');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (role: 'staff' | 'admin' | 'pending') => {
    if (role === 'staff') {
      setIdentifier('KJA-842XA');
      setPassword('password123');
    } else if (role === 'admin') {
      setIdentifier('admin@vlms.fleet');
      setPassword('password123');
    } else {
      setIdentifier('ABJ-194LK');
      setPassword('password123');
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
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to VLMS
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-navy-900 dark:bg-blue-600 text-white p-3 rounded-2xl shadow-md">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign In to VLMS
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Enter your vehicle plate registration number or authorized email
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-8 space-y-6 transition-colors">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Plate Number / Username / Email <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. KJA-842XA or staff@vlms.ng"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500">*</span>
                </label>
                <Link href="/help" className="text-xs text-navy-800 dark:text-blue-400 hover:underline">
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
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500 transition-colors"
                />
              </div>
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

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Quick Test Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoRole('staff')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
              >
                Staff Member
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('admin')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
              >
                Fleet Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('pending')}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
              >
                Pending User
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            New vehicle staff?{' '}
            <Link href="/register" className="font-semibold text-navy-900 dark:text-blue-400 hover:underline">
              Submit registration request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
