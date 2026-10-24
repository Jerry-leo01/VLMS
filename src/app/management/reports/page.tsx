'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { getBusinessDate } from '@/lib/utils';
import { FileDown, ArrowLeft, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function ReportsExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const exportDailyLogsCsv = async () => {
    setDownloading('logs');
    try {
      const logs = await VLMSService.getAllDailyLogs();
      const headers = ['Log ID', 'Business Date', 'Vehicle Plate', 'Staff Name', 'Confirmed KM', 'OCR KM', 'OCR Confidence', 'Status', 'Submitted At'];
      const rows = logs.map((l) => [
        l.id,
        l.business_date,
        l.vehicle?.plate_number ?? '',
        l.user?.full_name ?? '',
        l.odometer_km,
        l.ocr_reading_km ?? '',
        l.ocr_confidence ?? '',
        l.status,
        l.submitted_at,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      downloadFile(csvContent, `vlms-daily-logs-${getBusinessDate()}.csv`);
    } finally {
      setDownloading(null);
    }
  };

  const exportFuelCsv = async () => {
    setDownloading('fuel');
    try {
      const fuel = await VLMSService.getAllFuelTransactions();
      const headers = ['Transaction ID', 'Vehicle Plate', 'Staff Name', 'Payment Method', 'Vendor Name', 'Odometer KM', 'Amount NGN', 'Quantity Litres', 'Purchased At', 'Status'];
      const rows = fuel.map((f) => [
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
      downloadFile(csvContent, `vlms-fuel-transactions-${getBusinessDate()}.csv`);
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

      <div className="flex-1 flex">
        <div className="hidden lg:block">
          <ManagementSidebar />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Link
              href="/management"
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Fleet Data Exports & Reports</h1>
              <p className="text-xs text-slate-500">
                Download verified CSV reports for internal auditing and accounting reconciliation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Daily Vehicle Logs Report</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Export complete odometer submissions including verified KM readings, OCR candidate values, GPS accuracy, and submission timestamps.
                </p>
              </div>

              <button
                type="button"
                onClick={exportDailyLogsCsv}
                disabled={downloading === 'logs'}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {downloading === 'logs' ? 'Generating CSV...' : 'Download Daily Logs CSV'}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Fuel Transactions Report</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Export verified fuel purchases broken down by TOM Card and Personal Funds, including total amounts in NGN, fuel litres, filling stations, and linked odometer readings.
                </p>
              </div>

              <button
                type="button"
                onClick={exportFuelCsv}
                disabled={downloading === 'fuel'}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {downloading === 'fuel' ? 'Generating CSV...' : 'Download Fuel Transactions CSV'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
