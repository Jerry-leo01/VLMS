'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { AnomalyAlert } from '@/types/database';
import { formatDateTime, formatAnomalyText } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Search, ArrowLeft, ShieldAlert, Eye, MessageSquare } from 'lucide-react';

export default function AnomalyManagementPage() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);
  const [newStatus, setNewStatus] = useState<'investigating' | 'resolved' | 'dismissed'>('resolved');
  const [resolutionNote, setResolutionNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadAlerts = async () => {
    try {
      const data = await VLMSService.getAllAnomalies();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load anomaly alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      await VLMSService.resolveAnomaly(selectedAlert.id, 'p-admin-01', newStatus, resolutionNote);
      setSelectedAlert(null);
      setResolutionNote('');
      await loadAlerts();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

      <div className="flex-1 flex">
        <div className="hidden lg:block">
          <ManagementSidebar />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/management"
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Odometer Anomaly Review Queue</h1>
                <p className="text-xs text-slate-500">
                  Explainable rules-based alerts for odometer decreases, distance spikes, and photo tampering
                </p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Alerts ({alerts.length})</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No anomaly alerts match the current filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-navy-950">
                          {alert.vehicle?.plate_number ?? 'Vehicle'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            alert.severity === 'high' || alert.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity} Severity
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        Rule: {alert.rule_code}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        alert.status === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : alert.status === 'investigating'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Audit Anomaly Analysis</span>
                    </div>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed">
                      {formatAnomalyText(alert.rule_code, alert.details)}
                    </p>
                  </div>

                  {alert.resolution_note && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      <strong>Resolution Note:</strong> {alert.resolution_note}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Detected: {formatDateTime(alert.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAlert(alert)}
                      className="py-1.5 px-3 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      Update / Resolve Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Resolution Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Resolve Alert: {selectedAlert.rule_code}
            </h3>
            <p className="text-xs text-slate-500">
              Select status and record an explainable supervisory note for the audit log.
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Updated Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'investigating' | 'resolved' | 'dismissed')}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-navy-800"
                >
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved (Legitimate Exception / Verified)</option>
                  <option value="dismissed">Dismissed (False Positive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Supervisor Resolution Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Verified with staff member; vehicle odometer cluster was calibrated during scheduled maintenance."
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Save Decision
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="py-2 px-4 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
