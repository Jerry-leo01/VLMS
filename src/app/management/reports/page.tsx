'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { getBusinessDate, formatCurrency, formatOdometer } from '@/lib/utils';
import {
  DateRangeSelection,
  getPresetDateRange,
  isDateInRange,
} from '@/lib/date-utils';
import { AdaptiveDatePicker } from '@/components/ui/AdaptiveDatePicker';
import { DailyLog, FuelTransaction } from '@/types/database';
import {
  FileDown,
  ArrowLeft,
  FileSpreadsheet,
  Gauge,
  Fuel,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';

export default function ReportsExportPage() {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getPresetDateRange('all'));
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [allFuel, setAllFuel] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [logs, fuel] = await Promise.all([
          VLMSService.getAllDailyLogs(),
          VLMSService.getAllFuelTransactions(),
        ]);
        setAllLogs(logs);
        setAllFuel(fuel);
      } catch (err) {
        console.error('Failed to load export data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter datasets dynamically by active date range
  const filteredLogs = allLogs.filter((l) =>
    isDateInRange(l.business_date || l.submitted_at, dateRange.startDate, dateRange.endDate)
  );

  const filteredFuel = allFuel.filter((f) =>
    isDateInRange(f.purchased_at || f.submitted_at, dateRange.startDate, dateRange.endDate)
  );

  // Compute live preview metrics
  const totalKmRecorded = filteredLogs.reduce((acc, l) => acc + (l.odometer_km || 0), 0);
  const totalFuelSpend = filteredFuel.reduce((acc, f) => acc + (f.amount || 0), 0);
  const totalFuelLitres = filteredFuel.reduce((acc, f) => acc + (f.quantity_litres || 0), 0);

  const getDateSuffix = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${dateRange.startDate}-to-${dateRange.endDate}`;
    }
    if (dateRange.startDate) {
      return `from-${dateRange.startDate}`;
    }
    if (dateRange.endDate) {
      return `until-${dateRange.endDate}`;
    }
    return `all-time-${getBusinessDate()}`;
  };

  const exportDailyLogsCsv = async () => {
    setDownloading('logs');
    try {
      const headers = [
        'Log ID',
        'Business Date',
        'Vehicle Plate',
        'Staff Name',
        'Confirmed KM',
        'Daily Difference KM',
        'Measurement Unit',
        'Source Reading',
        'OCR KM',
        'OCR Confidence',
        'Status',
        'Submitted At',
      ];
      const rows = filteredLogs.map((l) => [
        l.id,
        l.business_date,
        l.vehicle?.plate_number ?? '',
        l.user?.full_name ?? '',
        l.odometer_km,
        l.mileage_difference_km ?? 0,
        l.source_unit ?? 'km',
        l.source_reading ?? l.odometer_km,
        l.ocr_reading_km ?? '',
        l.ocr_confidence ?? '',
        l.status,
        l.submitted_at,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      downloadFile(csvContent, `vlms-daily-logs-${getDateSuffix()}.csv`);
    } finally {
      setDownloading(null);
    }
  };

  const exportFuelCsv = async () => {
    setDownloading('fuel');
    try {
      const headers = [
        'Transaction ID',
        'Vehicle Plate',
        'Staff Name',
        'Payment Method',
        'Vendor Name',
        'Odometer KM',
        'Amount NGN',
        'Quantity Litres',
        'Purchased At',
        'Status',
      ];
      const rows = filteredFuel.map((f) => [
        f.id,
        f.vehicle?.plate_number ?? '',
        f.user?.full_name ?? '',
        f.payment_method,
        f.vendor_name,
        f.odometer_km,
        f.amount,
        f.quantity_litres,
        f.purchased_at,
        f.status,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      downloadFile(csvContent, `vlms-fuel-transactions-${getDateSuffix()}.csv`);
    } finally {
      setDownloading(null);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          {/* Header Bar with Adaptive Date Picker Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/management"
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fleet Data Exports & Reports</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Download verified CSV reports for internal auditing and accounting reconciliation
                </p>
              </div>
            </div>

            {/* Date Picker Component */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <AdaptiveDatePicker
                value={dateRange}
                onChange={setDateRange}
                align="right"
              />
            </div>
          </div>

          {/* Dynamic Export Preview Metrics Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Export Preview Metrics
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                Window: {dateRange.label}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Matching Logs
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {loading ? '...' : filteredLogs.length}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {allLogs.length}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                  Odometer KM Sum
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
                  {loading ? '...' : formatOdometer(totalKmRecorded)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  Fuel Transactions
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {loading ? '...' : filteredFuel.length}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {allFuel.length}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  Total Fuel Spending
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
                  {loading ? '...' : formatCurrency(totalFuelSpend, 'NGN')}
                </div>
              </div>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Vehicle Logs Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Export complete odometer submissions for the selected window ({filteredLogs.length} records), including verified KM readings, daily difference, source units, and GPS coordinates.
                </p>
              </div>

              <button
                type="button"
                onClick={exportDailyLogsCsv}
                disabled={downloading === 'logs' || filteredLogs.length === 0}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                {downloading === 'logs'
                  ? 'Generating CSV...'
                  : `Download Daily Logs CSV (${filteredLogs.length})`}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Fuel Transactions Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Export verified fuel purchases for the selected window ({filteredFuel.length} records) across TOM Cards and Personal Funds, including amounts in NGN, fuel litres ({totalFuelLitres.toFixed(1)} L), and filling stations.
                </p>
              </div>

              <button
                type="button"
                onClick={exportFuelCsv}
                disabled={downloading === 'fuel' || filteredFuel.length === 0}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                {downloading === 'fuel'
                  ? 'Generating CSV...'
                  : `Download Fuel Transactions CSV (${filteredFuel.length})`}
              </button>
            </div>
          </div>
        </main>
      </div>

      <ManagementBottomNav />
    </div>
  );
}
