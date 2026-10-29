'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService, EvidenceGalleryItem } from '@/lib/services/vlms-service';
import { DailyLog, AnomalyAlert } from '@/types/database';
import {
  formatCurrency,
  formatOdometer,
  formatDateTime,
  getBusinessDate,
  formatEvidenceMetadata,
  formatAnomalyText,
} from '@/lib/utils';
import {
  Users,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  Eye,
  Image as ImageIcon,
  ShieldCheck,
  Hash,
  X,
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
  const [evidenceItems, setEvidenceItems] = useState<EvidenceGalleryItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceGalleryItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, logs, alerts, gallery] = await Promise.all([
          VLMSService.getDashboardMetrics(),
          VLMSService.getAllDailyLogs(),
          VLMSService.getAllAnomalies(),
          VLMSService.getEvidenceGallery(),
        ]);
        setMetrics(m);
        setRecentLogs(logs);
        setAnomalies(alerts);
        setEvidenceItems(gallery);
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
      (log.vehicle?.plate_number && log.vehicle.plate_number.toLowerCase().includes(q)) ||
      (log.user?.full_name && log.user.full_name.toLowerCase().includes(q)) ||
      log.business_date.includes(q)
    );
  });

  const getLogAnomalies = (logId: string) =>
    anomalies.filter((a) => a.daily_log_id === logId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        {/* Management Sidebar */}
        <ManagementSidebar />

        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Fleet Management Portal
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Master Operations Dashboard
              </h1>
              <p className="text-xs text-slate-500">
                Operating Business Date: <strong className="text-slate-800">{getBusinessDate()}</strong> (Africa/Lagos)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                  <strong>{metrics.pendingApprovals} Pending Staff Registration Request(s)</strong>
                  <p className="text-amber-800">
                    Staff members are waiting for vehicle and TOM card assignment authorization.
                  </p>
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
                  <strong>{metrics.openAnomalies} Open Odometer / Fuel Anomaly Alerts</strong>
                  <p className="text-red-800">
                    Entries flagged by deterministic rules (odometer decrease, low OCR confidence, manual override mismatch, or duplicate photo).
                  </p>
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
                <span className="text-xs font-normal text-slate-400">
                  / {metrics.activeVehicles} active
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block">
                {metrics.missingDailyLogs === 0
                  ? '100% Complete'
                  : `${metrics.missingDailyLogs} vehicles pending`}
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
                <span className="text-xs font-normal text-slate-400">
                  / {metrics.totalVehicles} total
                </span>
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
              <span className="text-[11px] text-slate-500 block">Audit integrity monitored</span>
            </div>
          </div>

          {/* Live Submitted Photographic Evidence Strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Submitted Photographic Evidence (Odometer & Fuel Receipts)
                </h3>
                <p className="text-xs text-slate-500">
                  Click any submitted photograph below to inspect full resolution image, SHA-256 hash, and telemetry
                </p>
              </div>
              <Link
                href="/management/evidence"
                className="text-xs font-bold text-navy-900 hover:underline flex items-center gap-1"
              >
                Open Full Gallery ({evidenceItems.length}) →
              </Link>
            </div>

            {evidenceItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No photographic evidence submitted yet. Photos captured during Daily Odometer Logs and Fuel Purchases appear here immediately.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {evidenceItems.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEvidence(item)}
                    className="group text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-navy-800 rounded-xl overflow-hidden shadow-xs transition-all flex flex-col"
                  >
                    <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                      {item.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.dataUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="text-center p-3">
                          <ImageIcon className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                          <span className="text-[11px] font-mono text-emerald-400 block font-bold">
                            {formatOdometer(item.odometerKm)}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold">
                        {item.evidenceType === 'fuel_receipt'
                          ? 'Fuel Receipt'
                          : item.evidenceType === 'fuel_odometer'
                          ? 'Fuel Odometer'
                          : 'Daily Odometer'}
                      </span>
                    </div>
                    <div className="p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-navy-950">
                          {item.vehiclePlate}
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {item.amount ? formatCurrency(item.amount) : formatOdometer(item.odometerKm)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        Staff: {item.staffName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(item.submittedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Vehicle Daily Logs</h3>
                <p className="text-xs text-slate-500">
                  All submissions verified with cryptographic photo hash and rule evaluation
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="dashboardLogFilter" className="block text-[11px] font-semibold text-slate-700">
                  Filter by Plate, Staff, or Date
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="dashboardLogFilter"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-64 focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Vehicle Plate</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Confirmed Odometer</th>
                    <th className="py-3 px-4">OCR Proposal</th>
                    <th className="py-3 px-4">Photo Evidence</th>
                    <th className="py-3 px-4">Status & Flag Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No vehicle logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const logAnomalies = getLogAnomalies(log.id);
                      const matchingGalleryItem = evidenceItems.find(
                        (e) => e.sourceRecordId === log.id && e.sourceType === 'daily_log'
                      );
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {formatDateTime(log.submitted_at)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-navy-950">
                            {log.vehicle?.plate_number ?? log.vehicle_id}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {log.user?.full_name ?? 'Assigned Driver'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            {formatOdometer(log.odometer_km)}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {log.ocr_reading_km
                              ? `${log.ocr_reading_km} km (${log.ocr_confidence}%)`
                              : 'Manual entry'}
                          </td>
                          <td className="py-3 px-4">
                            {matchingGalleryItem ? (
                              <button
                                type="button"
                                onClick={() => setSelectedEvidence(matchingGalleryItem)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[11px] border border-blue-200 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Photo
                              </button>
                            ) : (
                              <Link
                                href={`/management/evidence?plate=${encodeURIComponent(
                                  log.vehicle?.plate_number ?? ''
                                )}`}
                                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold text-[11px]"
                              >
                                <Eye className="w-3.5 h-3.5" /> Inspect
                              </Link>
                            )}
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                log.status === 'flagged'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {log.status}
                            </span>
                            {logAnomalies.length > 0 && (
                              <div className="space-y-0.5 pt-0.5">
                                {logAnomalies.map((a) => (
                                  <div
                                    key={a.id}
                                    className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                                  >
                                    <strong>{a.rule_code.replace(/_/g, ' ')}:</strong>{' '}
                                    {formatAnomalyText(a.rule_code, a.details)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Evidence Inspection Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedEvidence(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedEvidence.title}</h3>
                <p className="text-xs text-slate-500">
                  Vehicle: <strong className="font-mono">{selectedEvidence.vehiclePlate}</strong> • Staff: {selectedEvidence.staffName}
                </p>
              </div>
            </div>

            <div className="aspect-video bg-slate-950 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden">
              {selectedEvidence.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedEvidence.dataUrl}
                  alt={selectedEvidence.title}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-white">
                  <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                    Verified Evidence Record
                  </span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    {formatOdometer(selectedEvidence.odometerKm)}
                  </span>
                  <span className="text-sm font-mono text-slate-300 block mt-1">
                    Vehicle: {selectedEvidence.vehiclePlate}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-500 font-sans font-semibold">
                <Hash className="w-3.5 h-3.5" /> SHA-256 Cryptographic Hash
              </div>
              <div className="text-slate-800 break-all text-[11px]">
                {selectedEvidence.sha256Hash}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Evidence Telemetry Breakdown
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {formatEvidenceMetadata(selectedEvidence.metadata).map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-right">
              Submitted: {formatDateTime(selectedEvidence.submittedAt)}
            </div>
          </div>
        </div>
      )}

      <ManagementBottomNav />
    </div>
  );
}
