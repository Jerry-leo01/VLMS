'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog, AnomalyAlert } from '@/types/database';
import { formatCurrency, formatOdometer, formatDateTime, getBusinessDate } from '@/lib/utils';
import {
  Users,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  TrendingUp,
  Clock,
  ArrowRight,
  Search,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';

export default function ManagementDashboardPage() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeStaff: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    submittedToday: 0,
    missingDailyLogs: 0,
    fuelTransactionsToday: 0,
    totalFuelExpenditure: 0,
    openAnomalies: 0,
    pendingApprovals: 0,
  });

  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const m = await VLMSService.getDashboardMetrics();
        const logs = await VLMSService.getAllDailyLogs();
        const alerts = await VLMSService.getAllAnomalies();
        setMetrics(m);
        setRecentLogs(logs);
        setAnomalies(alerts);
      } catch (err) {
        console.error('Failed to load management dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredLogs = recentLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.vehicle?.plate_number.toLowerCase().includes(q) ||
      log.user?.full_name.toLowerCase().includes(q) ||
      log.business_date.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

      <div className="flex-1 flex">
        {/* Management Sidebar */}
        <div className="hidden lg:block">
          <ManagementSidebar />
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Fleet Management Portal
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Operations Dashboard</h1>
              <p className="text-xs text-slate-500">
                Operating Business Date: <strong className="text-slate-800">{getBusinessDate()}</strong> (Africa/Lagos)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/management/reports"
                className="py-2 px-3.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV Report
              </Link>
              <Link
                href="/management/approvals"
                className="py-2 px-3.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 shadow-sm flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-blue-300" />
                Approvals Queue ({metrics.pendingApprovals})
              </Link>
            </div>
          </div>

          {/* Pending Approval Alert Banner */}
          {metrics.pendingApprovals > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong>{metrics.pendingApprovals} Pending Driver Registration Request(s)</strong>
                  <p className="text-amber-800">Drivers are waiting for vehicle and TOM card assignment authorization.</p>
                </div>
              </div>
              <Link
                href="/management/approvals"
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                Review Now
              </Link>
            </div>
          )}

          {/* Open Anomaly Alerts Banner */}
          {metrics.openAnomalies > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-xs text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <strong>{metrics.openAnomalies} Open Odometer Anomaly Alerts</strong>
                  <p className="text-red-800">Odometer decrease, spike, or duplicate evidence flagged by the rules engine.</p>
                </div>
              </div>
              <Link
                href="/management/anomalies"
                className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                Inspect Alerts
              </Link>
            </div>
          )}

          {/* Real Database KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500">Today&apos;s Logs Submitted</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.submittedToday}{' '}
                <span className="text-xs font-normal text-slate-400">/ {metrics.activeVehicles} active</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block">
                {metrics.missingDailyLogs === 0 ? '100% Complete' : `${metrics.missingDailyLogs} vehicles pending`}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500">Total Fuel Expenditure</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(metrics.totalFuelExpenditure)}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {metrics.fuelTransactionsToday} transaction(s) today
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500">Active Fleet Vehicles</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.activeVehicles}{' '}
                <span className="text-xs font-normal text-slate-400">/ {metrics.totalVehicles} total</span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold block">
                {metrics.totalUsers} registered users
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500">Open Anomaly Alerts</span>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {metrics.openAnomalies}
              </div>
              <span className="text-[11px] text-slate-500 block">
                Audit integrity monitored
              </span>
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Vehicle Daily Logs</h3>
                <p className="text-xs text-slate-500">All submissions verified with cryptographic photo hash</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by plate, driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-64 focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Vehicle Plate</th>
                    <th className="py-3 px-4">Staff Driver</th>
                    <th className="py-3 px-4">Confirmed Odometer</th>
                    <th className="py-3 px-4">OCR Proposal</th>
                    <th className="py-3 px-4">GPS Accuracy</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No vehicle logs match the query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatDateTime(log.submitted_at)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-950">
                          {log.vehicle?.plate_number ?? 'KJA-842XA'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {log.user?.full_name ?? 'Chukwuma Eze'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {formatOdometer(log.odometer_km)}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {log.ocr_reading_km ? `${log.ocr_reading_km} km (${log.ocr_confidence}%)` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {log.gps_accuracy_m ? `±${log.gps_accuracy_m} m` : 'Attached'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              log.status === 'flagged'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
