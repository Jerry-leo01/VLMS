'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog } from '@/types/database';
import { formatOdometer, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Search, FileSpreadsheet } from 'lucide-react';

export default function ManagementLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await VLMSService.getAllDailyLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.vehicle?.plate_number && l.vehicle.plate_number.toLowerCase().includes(q)) ||
      (l.user?.full_name && l.user.full_name.toLowerCase().includes(q)) ||
      l.business_date.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

      <div className="flex-1 flex">
        <div className="hidden lg:block">
          <ManagementSidebar />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/management"
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Fleet Daily Vehicle Logs</h1>
                <p className="text-xs text-slate-500">
                  Comprehensive audit record of all official daily odometer submissions
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter plate, staff, date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-60 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Business Date</th>
                  <th className="py-3 px-4">Vehicle Plate</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Confirmed Odometer</th>
                  <th className="py-3 px-4">OCR Proposed</th>
                  <th className="py-3 px-4">GPS Accuracy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No daily logs found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{log.business_date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-navy-950">{log.vehicle?.plate_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{log.user?.full_name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatOdometer(log.odometer_km)}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {log.ocr_reading_km ? `${log.ocr_reading_km} km (${log.ocr_confidence}%)` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {log.gps_accuracy_m ? `±${log.gps_accuracy_m} m` : 'Attached'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            log.status === 'flagged' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{formatDateTime(log.submitted_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
