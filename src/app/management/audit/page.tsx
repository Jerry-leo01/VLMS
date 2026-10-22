'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { AuditEvent } from '@/types/database';
import { formatDateTime, formatAuditActionText } from '@/lib/utils';
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

          {/* Responsive Audit Events List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Authorized Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Plain Text Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No audit events match the query.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {formatDateTime(ev.created_at)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {ev.actor?.full_name ?? 'System Administrator'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-normal leading-relaxed">
                          {formatAuditActionText(ev.action, ev.entity_type, ev.after_data, ev.before_data)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Clean cards with legible spacing */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No audit events found.
                </div>
              ) : (
                filtered.map((ev) => (
                  <div key={ev.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-900">
                        {ev.actor?.full_name ?? 'System Administrator'}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatDateTime(ev.created_at)}
                      </span>
                    </div>
                    <span className="inline-block font-mono text-[10px] font-bold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                      {ev.action}
                    </span>
                    <p className="text-slate-700 leading-relaxed font-normal text-xs">
                      {formatAuditActionText(ev.action, ev.entity_type, ev.after_data, ev.before_data)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
