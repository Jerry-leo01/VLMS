'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { AuditEvent } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { History, ArrowLeft, Shield, Search } from 'lucide-react';

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await VLMSService.getAuditEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load audit events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = events.filter((ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.action.toLowerCase().includes(q) ||
      ev.entity_type.toLowerCase().includes(q) ||
      (ev.actor?.full_name && ev.actor.full_name.toLowerCase().includes(q))
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
                <h1 className="text-xl font-bold text-slate-900">Immutable Audit Trail</h1>
                <p className="text-xs text-slate-500">
                  Cryptographically referenced append-only history of administrative decisions & submissions
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter action, actor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatDateTime(ev.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {ev.actor?.full_name ?? 'System Administrator'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ev.entity_type} ({ev.entity_id.substring(0, 12)}...)
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(ev.after_data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
