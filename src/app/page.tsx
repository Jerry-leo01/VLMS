import Link from 'next/link';
import { Car, ShieldCheck, Camera, Fuel, BarChart3, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-navy-900 dark:bg-blue-600 text-white p-2 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-navy-900 dark:text-white">VLMS</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-2 text-sm font-semibold bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              Staff Registration
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Enterprise Fleet Integrity & Audit Verification
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-navy-900 dark:text-white tracking-tight leading-tight">
            Vehicle Log Management System
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            A secure, mobile-first operations platform for vehicle staff, fleet managers, and auditors. Verify daily odometer readings with live camera OCR, record verified fuel purchases, and monitor fleet anomalies.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-colors"
            >
              <span>Access Staff & Fleet Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold shadow-sm transition-colors"
            >
              <span>Staff Registration Request</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Odometer & OCR</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Instant mobile camera capture with in-browser OCR candidate reading and tamper-evident SHA-256 evidence hashing.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">TOM Card & Personal Fuel</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Fixed-vendor TOM card workflows, receipt capture for personal funds, and smart evidence reuse when odometer is unchanged.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Anomaly Engine & Audits</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Explainable rules detection for mileage decreases, distance spikes, OCR mismatches, and duplicate photographic evidence.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Vehicle Log Management System (VLMS). All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Privacy & Data Handling</Link>
            <Link href="/help" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Help & Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
