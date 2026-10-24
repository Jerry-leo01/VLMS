'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog, FuelTransaction, Profile, VehicleAssignment } from '@/types/database';
import { formatCurrency, formatOdometer, formatDateTime } from '@/lib/utils';
import { Camera, Fuel, Clock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StaffHistoryPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'fuel'>('logs');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [fuelTx, setFuelTx] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const staff = await VLMSService.getStaffProfile('p-staff-01');
        const asg = await VLMSService.getActiveAssignment('p-staff-01');
        const allLogs = await VLMSService.getAllDailyLogs();
        const allFuel = await VLMSService.getAllFuelTransactions();

        if (staff) setProfile(staff);
        if (asg) setAssignment(asg);
        setLogs(allLogs);
        setFuelTx(allFuel);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name ?? 'Chukwuma Eze'}
        vehiclePlate={assignment?.vehicle?.plate_number ?? 'KJA-842XA'}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href="/staff"
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Submissions History</h1>
            <p className="text-xs text-slate-500">
              Verified daily vehicle logs and fuel transaction receipts
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'logs'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" /> Daily Odometer Logs ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fuel')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'fuel'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Fuel className="w-4 h-4" /> Fuel Purchases ({fuelTx.length})
          </button>
        </div>

        {activeTab === 'logs' ? (
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No daily logs recorded yet.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-navy-950">
                        {log.vehicle?.plate_number ?? 'KJA-842XA'}
                      </span>
                      <span className="text-xs text-slate-500">• {log.business_date}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Odometer:{' '}
                      <strong className="text-slate-900 font-mono text-sm">
                        {formatOdometer(log.odometer_km)}
                      </strong>{' '}
                      {log.ocr_reading_km && (
                        <span className="text-slate-400">
                          (OCR: {log.ocr_reading_km} km • {log.ocr_confidence}%)
                        </span>
                      )}
                    </div>
                    {log.comment && (
                      <p className="text-xs text-slate-500 italic">&ldquo;{log.comment}&rdquo;</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        log.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'flagged'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(log.submitted_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {fuelTx.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No fuel transactions recorded yet.
              </div>
            ) : (
              fuelTx.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{tx.vendor_name}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-600 uppercase">
                        {tx.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Amount: <strong className="text-slate-900">{formatCurrency(tx.amount)}</strong>{' '}
                      ({tx.quantity_litres} Litres) • Odometer: {formatOdometer(tx.odometer_km)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        tx.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'flagged'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tx.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(tx.submitted_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
