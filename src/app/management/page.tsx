'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService, EvidenceGalleryItem, DashboardMetrics } from '@/lib/services/vlms-service';
import { DailyLog, AnomalyAlert, FuelTransaction } from '@/types/database';
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
  KeyRound,
  Gauge,
  RotateCcw,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { AdminTotpGeneratorModal } from '@/components/admin/AdminTotpGeneratorModal';
import { AdaptiveDatePicker } from '@/components/ui/AdaptiveDatePicker';
import { DateRangeSelection, getPresetDateRange, isDateInRange } from '@/lib/date-utils';
import { SafeImage } from '@/components/ui/SafeImage';

export default function ManagementDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeStaff: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    submittedLogs: 0,
    submittedToday: 0,
    missingDailyLogs: 0,
    uniqueVehiclesLogged: 0,
    fuelTransactionsCount: 0,
    fuelTransactionsToday: 0,
    totalFuelExpenditure: 0,
    totalFuelExpenditureAllTime: 0,
    totalLitres: 0,
    openAnomalies: 0,
    totalAnomaliesInRange: 0,
    resolvedAnomaliesInRange: 0,
    vehiclesActiveInRange: 0,
    driversActiveInRange: 0,
    pendingApprovals: 0,
  });

  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceGalleryItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [allFuel, setAllFuel] = useState<FuelTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getPresetDateRange('all'));
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceGalleryItem | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const handleSelectEvidence = (item: EvidenceGalleryItem | null) => {
    setSelectedEvidence(item);
    setLightboxZoom(1);
    setLightboxRotation(0);
    setCopiedHash(false);
  };

  const handleCopyHash = (hash: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(hash).then(() => {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      });
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        await VLMSService.syncWithServer().catch(() => {});
        const [m, logs, alerts, gallery, fuel] = await Promise.all([
          VLMSService.getDashboardMetrics({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }),
          VLMSService.getAllDailyLogs(),
          VLMSService.getAllAnomalies(),
          VLMSService.getEvidenceGallery(),
          VLMSService.getAllFuelTransactions(),
        ]);
        setMetrics(m);
        setRecentLogs(logs);
        setAnomalies(alerts);
        setEvidenceItems(gallery);
        setAllFuel(fuel);
      } catch (err) {
        console.error('Failed to load management dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateRange.startDate, dateRange.endDate, dateRange.preset]);

  const filteredLogs = recentLogs.filter((log) => {
    const matchesDate = isDateInRange(
      log.business_date || log.submitted_at,
      dateRange.startDate,
      dateRange.endDate
    );
    if (!matchesDate) return false;

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

  const latestMileageAlerts = anomalies.filter(
    (a) =>
      (a.rule_code === 'DAILY_MILEAGE_DIFF' || a.rule_code === 'FUEL_PURCHASE_VARIANCE') &&
      isDateInRange(a.created_at, dateRange.startDate, dateRange.endDate)
  );

  const isSingleDay =
    dateRange.preset === 'today' ||
    (Boolean(dateRange.startDate) &&
      Boolean(dateRange.endDate) &&
      dateRange.startDate === dateRange.endDate);

  const filteredEvidence = evidenceItems.filter((item) =>
    isDateInRange(item.businessDate || item.submittedAt, dateRange.startDate, dateRange.endDate)
  );

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
              <AdaptiveDatePicker
                value={dateRange}
                onChange={setDateRange}
                align="right"
              />
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-blue-200" />
                <span>Admin Onboarding PIN (60s)</span>
              </button>
              <Link
                href="/management/reports"
                className="py-2 px-3.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV Report
              </Link>
            </div>
          </div>

          {/* Open Anomaly Alerts Banner */}
          {metrics.openAnomalies > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-xs text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <strong>{metrics.openAnomalies} Open Operational Anomaly Alerts</strong>
                  <p className="text-red-800">
                    Entries flagged by standardized operational rules (Daily Mileage Difference and Fuel Purchase Variance).
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

          {/* Daily Mileage & Fuel Purchase Variance Alerts Feed */}
          {latestMileageAlerts.length > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  Daily Mileage & Fuel Purchase Variance Alerts
                </span>
                <span className="text-[11px] text-blue-700 font-medium">Standardized Feed</span>
              </div>
              <div className="space-y-1.5">
                {latestMileageAlerts.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 bg-white rounded-lg border border-blue-100 text-xs text-slate-800 font-medium flex items-center justify-between shadow-2xs"
                  >
                    <span>{formatAnomalyText(a.rule_code, a.details)}</span>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                      {formatDateTime(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Database KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Daily Logs & Fleet Submission Progress */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {dateRange.preset === 'today'
                    ? "Today's Logs Submitted"
                    : dateRange.preset === 'all'
                    ? 'Total Logs Submitted'
                    : 'Logs Submitted'}
                </span>
                {dateRange.preset !== 'all' && dateRange.preset !== 'today' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 shrink-0 truncate max-w-[110px]">
                    {dateRange.label}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {isSingleDay ? (
                  <>
                    {metrics.submittedLogs ?? metrics.submittedToday}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {metrics.activeVehicles} active
                    </span>
                  </>
                ) : dateRange.preset === 'all' ? (
                  <>
                    {metrics.submittedLogs ?? recentLogs.length}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      total logs
                    </span>
                  </>
                ) : (
                  <>
                    {metrics.submittedLogs}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      logs ({metrics.uniqueVehiclesLogged ?? 0} veh.)
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block truncate">
                {isSingleDay
                  ? metrics.missingDailyLogs === 0
                    ? '100% Complete'
                    : `${metrics.missingDailyLogs} vehicle${metrics.missingDailyLogs === 1 ? '' : 's'} pending`
                  : `${metrics.uniqueVehiclesLogged ?? 0} of ${metrics.activeVehicles} active vehicles logged`}
              </span>
            </div>

            {/* Card 2: Fuel Expenditure & Transactions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {dateRange.preset === 'today'
                    ? "Today's Fuel Spend"
                    : dateRange.preset === 'all'
                    ? 'Total Fuel Expenditure'
                    : 'Fuel Expenditure'}
                </span>
                {dateRange.preset !== 'all' && dateRange.preset !== 'today' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0 truncate max-w-[110px]">
                    {dateRange.label}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 truncate">
                {formatCurrency(metrics.totalFuelExpenditure)}
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                {dateRange.preset === 'today'
                  ? `${metrics.fuelTransactionsCount ?? metrics.fuelTransactionsToday} transaction(s) today`
                  : dateRange.preset === 'all'
                  ? `${metrics.fuelTransactionsCount ?? allFuel.length} total transaction(s)`
                  : `${metrics.fuelTransactionsCount ?? 0} transaction(s) in period`}
                {metrics.totalLitres > 0 && ` • ${Math.round(metrics.totalLitres).toLocaleString()} L`}
              </span>
            </div>

            {/* Card 3: Active Fleet Vehicles & Fleet Utilization */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {dateRange.preset === 'all'
                    ? 'Active Fleet Vehicles'
                    : dateRange.preset === 'today'
                    ? 'Active Fleet Today'
                    : 'Fleet Utilization'}
                </span>
                {dateRange.preset !== 'all' && dateRange.preset !== 'today' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 shrink-0 truncate max-w-[110px]">
                    {dateRange.label}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {dateRange.preset === 'all' ? (
                  <>
                    {metrics.activeVehicles}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {metrics.totalVehicles} total
                    </span>
                  </>
                ) : (
                  <>
                    {metrics.vehiclesActiveInRange ?? 0}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {metrics.activeVehicles} active
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-blue-600 font-semibold block truncate">
                {dateRange.preset === 'all'
                  ? `${metrics.totalUsers} registered users`
                  : `${metrics.driversActiveInRange ?? 0} driver(s) active in period`}
              </span>
            </div>

            {/* Card 4: Anomaly Alerts & Audit Integrity */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {dateRange.preset === 'all'
                    ? 'Open Anomaly Alerts'
                    : dateRange.preset === 'today'
                    ? "Today's Anomaly Alerts"
                    : 'Anomaly Alerts'}
                </span>
                {dateRange.preset !== 'all' && dateRange.preset !== 'today' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 shrink-0 truncate max-w-[110px]">
                    {dateRange.label}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {metrics.openAnomalies}
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                {dateRange.preset === 'all'
                  ? 'Audit integrity monitored'
                  : `${metrics.totalAnomaliesInRange ?? 0} flagged (${metrics.resolvedAnomaliesInRange ?? 0} resolved)`}
              </span>
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

            {filteredEvidence.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {dateRange.preset !== 'all'
                  ? `No photographic evidence submitted for the selected date window (${dateRange.label}).`
                  : 'No photographic evidence submitted yet. Photos captured during Daily Odometer Logs and Fuel Purchases appear here immediately.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredEvidence.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectEvidence(item)}
                    className="group text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-navy-800 rounded-xl overflow-hidden shadow-xs transition-all flex flex-col"
                  >
                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      <SafeImage
                        src={item.dataUrl || ''}
                        evidenceId={item.evidenceId}
                        alt={item.title}
                        fallbackType="evidence"
                        telemetry={{
                          odoKm: item.odometerKm,
                          plateNumber: item.vehiclePlate,
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
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

            {/* Active Date Filter Indicator */}
            {dateRange.preset !== 'all' && (
              <div className="mx-4 sm:mx-5 my-3 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Active Date Window: <strong>{dateRange.label}</strong> — showing {filteredLogs.length} matching log{filteredLogs.length === 1 ? '' : 's'}
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
                                onClick={() => handleSelectEvidence(matchingGalleryItem)}
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

      {/* Evidence Inspection Modal with Interactive Lightbox */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelectEvidence(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors z-20"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pr-8">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedEvidence.title}</h3>
                <p className="text-xs text-slate-500">
                  Vehicle: <strong className="font-mono text-navy-950">{selectedEvidence.vehiclePlate}</strong> • Staff: {selectedEvidence.staffName}
                </p>
              </div>
            </div>

            {/* Interactive Lightbox Canvas */}
            <div className="relative aspect-video sm:aspect-[16/10] bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 overflow-hidden select-none">
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                }}
              >
                <SafeImage
                  src={selectedEvidence.dataUrl || ''}
                  evidenceId={selectedEvidence.evidenceId}
                  alt={selectedEvidence.title}
                  fallbackType="evidence"
                  telemetry={{
                    odoKm: selectedEvidence.odometerKm,
                    plateNumber: selectedEvidence.vehiclePlate,
                  }}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Floating Lightbox Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-white shadow-lg z-10">
                <button
                  type="button"
                  title="Zoom Out"
                  disabled={lightboxZoom <= 1}
                  onClick={() => setLightboxZoom((prev) => Math.max(1, Number((prev - 0.5).toFixed(1))))}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 font-semibold min-w-[3ch] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  title="Zoom In"
                  disabled={lightboxZoom >= 3}
                  onClick={() => setLightboxZoom((prev) => Math.min(3, Number((prev + 0.5).toFixed(1))))}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-3.5 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  title="Rotate Clockwise (90°)"
                  onClick={() => setLightboxRotation((prev) => (prev + 90) % 360)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                {(lightboxZoom !== 1 || lightboxRotation !== 0) && (
                  <button
                    type="button"
                    title="Reset View"
                    onClick={() => {
                      setLightboxZoom(1);
                      setLightboxRotation(0);
                    }}
                    className="p-1 hover:bg-white/20 rounded text-amber-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* OCR Telemetry Comparison Panel */}
            {selectedEvidence.metadata &&
              (selectedEvidence.metadata.ocrProposal !== undefined ||
                selectedEvidence.metadata.ocrConfidence !== undefined) && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-blue-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      OCR Algorithmic Telemetry Verification
                    </span>
                    <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Confidence: {selectedEvidence.metadata.ocrConfidence ? `${Math.round(Number(selectedEvidence.metadata.ocrConfidence) * 100)}%` : 'Verified'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold">Driver Entry</span>
                      <span className="text-slate-900 font-bold text-xs">
                        {formatOdometer(selectedEvidence.odometerKm)}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold">OCR Scan Reading</span>
                      <span className="text-emerald-700 font-bold text-xs">
                        {selectedEvidence.metadata.ocrProposal ? formatOdometer(Number(selectedEvidence.metadata.ocrProposal)) : 'Match'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* SHA-256 Cryptographic Hash Digest */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-700 font-sans font-semibold">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  SHA-256 Cryptographic Digest
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(selectedEvidence.sha256Hash)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-sans font-semibold py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Digest</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-slate-800 break-all text-[11px] bg-white p-2 rounded border border-slate-200">
                {selectedEvidence.sha256Hash}
              </div>
            </div>

            {/* Evidence Telemetry Breakdown */}
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

            <div className="text-[11px] text-slate-500 text-right pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> Cloud Backed & Encrypted
              </span>
              <span>Submitted: {formatDateTime(selectedEvidence.submittedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOTP 60-Second Setup PIN Modal */}
      <AdminTotpGeneratorModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
      />

      <ManagementBottomNav />
    </div>
  );
}
