'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { RegistrationRequest } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import {
  DateRangeSelection,
  getPresetDateRange,
  isDateInRange,
} from '@/lib/date-utils';
import { AdaptiveDatePicker } from '@/components/ui/AdaptiveDatePicker';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

export default function ApprovalsQueuePage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState<DateRangeSelection>(getPresetDateRange('all'));

  const loadRequests = async () => {
    try {
      const data = await VLMSService.getRegistrationRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load registration requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      const adminProfile = await VLMSService.getCurrentAdminProfile();
      await VLMSService.approveRegistration(requestId, adminProfile?.id ?? 'admin-system');
      await loadRequests();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalId) return;
    setActionInProgress(rejectionModalId);
    try {
      const adminProfile = await VLMSService.getCurrentAdminProfile();
      await VLMSService.rejectRegistration(
        rejectionModalId,
        adminProfile?.id ?? 'admin-system',
        rejectionReason
      );
      setRejectionModalId(null);
      setRejectionReason('');
      await loadRequests();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const allPastRequests = requests.filter((r) => r.status !== 'pending');

  // Filter Decision History by active Date Picker range
  const filteredPastRequests = allPastRequests.filter((r) =>
    isDateInRange(r.reviewed_at || r.created_at, historyDateRange.startDate, historyDateRange.endDate)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <Link
              href="/management"
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Staff Registration Approvals Queue</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorize staff access, verify assigned plate numbers and TOM cards
              </p>
            </div>
          </div>

          {/* Pending Queue */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Pending Verification ({pendingRequests.length})
            </h2>

            {pendingRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No pending registration requests in the queue.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors"
                  >
                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {req.user?.full_name ?? 'Staff Applicant'}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Phone: {req.user?.phone_number ?? 'None'} • {req.requested_office?.name ?? 'Office'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 dark:text-slate-400 block text-[11px]">Requested Plate</span>
                        <span className="font-mono font-bold text-navy-950 dark:text-blue-300 text-sm">
                          {req.requested_plate_number}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-slate-400 dark:text-slate-400 block text-[11px]">TOM Number</span>
                        <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                          {req.requested_tom_card || 'None specified'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleApprove(req.id)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve & Activate
                      </button>
                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => setRejectionModalId(req.id)}
                        className="py-2 px-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Decisions History with Adaptive Date Picker Filter */}
          <div className="space-y-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Decision History</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {filteredPastRequests.length}
                    {filteredPastRequests.length !== allPastRequests.length && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        of {allPastRequests.length}
                      </span>
                    )}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Review historical staff onboarding approvals and rejections
                </p>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <AdaptiveDatePicker
                  value={historyDateRange}
                  onChange={setHistoryDateRange}
                  align="right"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
              {filteredPastRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                  <p>
                    No onboarding decisions recorded for the selected window ({historyDateRange.label}).
                  </p>
                  {historyDateRange.preset !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setHistoryDateRange(getPresetDateRange('all'))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to All Time
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Staff Name</th>
                      <th className="py-3 px-4">Requested Vehicle</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reviewed Date</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPastRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {r.user?.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-950 dark:text-blue-300">
                          {r.requested_plate_number}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              r.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(r.reviewed_at || r.created_at)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {r.rejection_reason || 'Verified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Rejection Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Provide Reason for Rejection</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This reason will be stored in the audit trail and presented to the applicant.
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Detailed Rejection Explanation <span className="text-red-500">*</span>
                </label>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  State why the registration or plate assignment cannot be approved
                </span>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Confirm Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setRejectionModalId(null)}
                  className="py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ManagementBottomNav />
    </div>
  );
}
