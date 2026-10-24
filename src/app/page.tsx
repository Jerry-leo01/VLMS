import Link from 'next/link';
import { Car, ShieldCheck, Camera, Fuel, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-navy-900 text-white p-2 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-navy-900">VLMS</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-navy-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-lg hover:bg-navy-800 shadow-sm"
            >
              Staff Registration
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Enterprise Fleet Integrity & Audit Verification
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-navy-900 tracking-tight leading-tight">
            Vehicle Log Management System
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            A secure, mobile-first operations platform for vehicle staff, fleet managers, and auditors. Verify daily odometer readings with live camera OCR, record verified fuel purchases, and monitor fleet anomalies.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold shadow-md transition-colors"
            >
              <span>Access Staff & Fleet Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl font-bold shadow-sm transition-colors"
            >
              <span>Staff Registration Request</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Odometer & OCR</h3>
            <p className="text-sm text-slate-600">
              Instant mobile camera capture with in-browser OCR candidate reading and tamper-evident SHA-256 evidence hashing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">TOM Card & Personal Fuel</h3>
            <p className="text-sm text-slate-600">
              Fixed-vendor TOM card workflows, receipt capture for personal funds, and smart evidence reuse when odometer is unchanged.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Anomaly Engine & Audits</h3>
            <p className="text-sm text-slate-600">
              Explainable rules detection for mileage decreases, distance spikes, OCR mismatches, and duplicate photographic evidence.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Vehicle Log Management System (VLMS). All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-800">Privacy & Data Handling</Link>
            <Link href="/help" className="hover:text-slate-800">Help & Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
