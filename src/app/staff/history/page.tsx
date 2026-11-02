'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog, FuelTransaction, Profile, VehicleAssignment } from '@/types/database';
import { formatCurrency, formatOdometer, formatDateTime } from '@/lib/utils';
import { Camera, Fuel, Clock, CheckCircle2, AlertTriangle, ArrowLeft, Filter, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { AdaptiveDatePicker } from '@/components/ui/AdaptiveDatePicker';
import { DateRangeSelection, getPresetDateRange, isDateInRange } from '@/lib/date-utils';

export default function StaffHistoryPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'fuel'>('logs');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [fuelTx, setFuelTx] = useState<FuelTransaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getPresetDateRange('all'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { profile: staff, assignment: asg } = await VLMSService.getCurrentStaffContext();
        const allLogs = await VLMSService.getAllDailyLogs();
        const allFuel = await VLMSService.getAllFuelTransactions();

        if (staff) setProfile(staff);
        if (asg) setAssignment(asg);

        const filteredLogs = asg
          ? allLogs.filter((l) => l.vehicle_id === asg.vehicle_id)
          : allLogs;
        const filteredFuel = asg
          ? allFuel.filter((f) => f.vehicle_id === asg.vehicle_id)
          : allFuel;

        setLogs(filteredLogs);
        setFuelTx(filteredFuel);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) =>
    isDateInRange(log.business_date || log.submitted_at, dateRange.startDate, dateRange.endDate)
  );

  const filteredFuel = fuelTx.filter((tx) =>
    isDateInRange(tx.purchased_at || tx.submitted_at, dateRange.startDate, dateRange.endDate)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name}
        vehiclePlate={assignment?.vehicle?.plate_number}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1">
        {/* Header with Title and Adaptive Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/staff"
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
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

          <div className="flex items-center justify-end">
            <AdaptiveDatePicker
              value={dateRange}
              onChange={setDateRange}
              align="right"
            />
          </div>
        </div>

        {/* Active Date Filter Indicator */}
        {dateRange.preset !== 'all' && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 font-medium">
              <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Active Date Window: <strong>{dateRange.label}</strong> — showing{' '}
                {activeTab === 'logs'
                  ? `${filteredLogs.length} matching log${filteredLogs.length === 1 ? '' : 's'}`
                  : `${filteredFuel.length} matching transaction${filteredFuel.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDateRange(getPresetDateRange('all'))}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to All Time
            </button>
          </div>
        )}

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
            <Camera className="w-4 h-4" /> Daily Odometer Logs ({filteredLogs.length})
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
            <Fuel className="w-4 h-4" /> Fuel Purchases ({filteredFuel.length})
          </button>
        </div>

        {activeTab === 'logs' ? (
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
                <p>
                  {dateRange.preset !== 'all'
                    ? `No daily logs found for the selected period (${dateRange.label}).`
                    : 'No daily logs recorded yet.'}
                </p>
                {dateRange.preset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDateRange(getPresetDateRange('all'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to All Time
                  </button>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-navy-950">
                        {log.vehicle?.plate_number ?? assignment?.vehicle?.plate_number ?? 'Assigned Vehicle'}
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
            {filteredFuel.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
                <p>
                  {dateRange.preset !== 'all'
                    ? `No fuel transactions found for the selected period (${dateRange.label}).`
                    : 'No fuel transactions recorded yet.'}
                </p>
                {dateRange.preset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDateRange(getPresetDateRange('all'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to All Time
                  </button>
                )}
              </div>
            ) : (
              filteredFuel.map((tx) => (
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
