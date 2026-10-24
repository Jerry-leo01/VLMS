import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft, Fuel, Camera, AlertCircle, Phone, Mail } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="font-bold text-navy-900 dark:text-white">Support & Helpdesk</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6 flex-1 text-slate-700 dark:text-slate-300 text-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <HelpCircle className="w-4 h-4" />
            Operational Guide & FAQ
          </div>
          <h1 className="text-3xl font-extrabold text-navy-900 dark:text-white">Staff & Fleet Support</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Need assistance recording an odometer reading or submitting fuel transactions?</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-navy-800 dark:text-blue-400" />
              What should I do if the camera won&apos;t open or permission was denied?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If your mobile browser denies camera access, open your browser settings (Chrome / Safari), navigate to Site Settings &gt; Camera, and allow access for the VLMS application. Alternatively, you can tap &ldquo;Choose Image File&rdquo; to pick a freshly taken photograph from your device storage.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-navy-800 dark:text-blue-400" />
              Can I record more than one fuel purchase in a single day?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Yes. While the system restricts daily odometer logs to exactly one official entry per vehicle per business date, authorized staff members are permitted to submit multiple fuel purchases (TOM Card or Personal Funds) as needed throughout the day.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-navy-800 dark:text-blue-400" />
              Why is my registration status marked as &ldquo;Pending&rdquo;?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              For fleet asset security, every new staff registration must be verified and approved by the Fleet Administrator before vehicle logs or fuel transactions can be submitted. Contact your fleet supervisor if your account has not been approved within 24 hours.
            </p>
          </div>

          <div className="bg-navy-900 dark:bg-slate-900 border border-transparent dark:border-slate-800 text-white p-6 rounded-2xl shadow-sm space-y-3 transition-colors">
            <h3 className="text-base font-bold">Fleet Operations Helpdesk</h3>
            <p className="text-xs text-slate-300 dark:text-slate-400">
              For urgent technical assistance, lost TOM cards, or vehicle reassignment:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-800 px-3 py-2 rounded-lg">
                <Phone className="w-4 h-4 text-blue-300" /> +234 (0) 1 800-FLEET
              </div>
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-800 px-3 py-2 rounded-lg">
                <Mail className="w-4 h-4 text-blue-300" /> support@vlms.fleet.ng
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} Vehicle Log Management System (VLMS). All rights reserved.
      </footer>
    </div>
  );
}
