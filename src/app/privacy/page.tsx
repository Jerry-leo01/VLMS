import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, FileText } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-navy-900">
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
          <span className="font-bold text-navy-900">VLMS Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6 flex-1 text-slate-700 leading-relaxed text-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Compliance & Privacy Information
          </div>
          <h1 className="text-3xl font-extrabold text-navy-900">Privacy & Data Governance Policy</h1>
          <p className="text-xs text-slate-500">Effective Date: October 2026 • Operating Jurisdiction: Nigeria (NDPR Compliant)</p>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-navy-900">1. Purpose of Data Collection</h2>
          <p className="text-xs text-slate-600">
            The Vehicle Log Management System (VLMS) is deployed exclusively to verify official fleet vehicle movements, record business mileage, ensure accurate fuel accounting, and prevent duplicate or fraudulent expense claims.
          </p>

          <h2 className="text-base font-bold text-navy-900">2. Photographic Evidence & In-Browser OCR</h2>
          <p className="text-xs text-slate-600">
            Authorized staff photograph vehicle dashboard odometers and fuel receipts. OCR processing runs in-browser to propose reading values. Captured photographs are stored in private, encrypted cloud storage buckets. Access is strictly granted to authorized fleet managers, auditors, and department heads via short-lived signed URLs. Permanent public URLs are never generated.
          </p>

          <h2 className="text-base font-bold text-navy-900">3. Geolocation Data</h2>
          <p className="text-xs text-slate-600">
            VLMS captures single-point GPS latitude, longitude, and accuracy metrics <strong>only at the exact moment</strong> when an odometer log is submitted. VLMS does <strong>not</strong> perform continuous or background location tracking.
          </p>

          <h2 className="text-base font-bold text-navy-900">4. Retention and Audit Logs</h2>
          <p className="text-xs text-slate-600">
            All submitted entries and administrative actions (approvals, rejections, anomaly reviews) are logged in an immutable, append-only audit trail retained in accordance with corporate asset compliance and statutory audit requirements.
          </p>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Vehicle Log Management System (VLMS). All rights reserved.
      </footer>
    </div>
  );
}
