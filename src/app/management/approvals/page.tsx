'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { RegistrationRequest } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { Users, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function ApprovalsQueuePage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Link
              href="/management"
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Staff Registration Approvals Queue</h1>
              <p className="text-xs text-slate-500">
                Authorize staff access, verify assigned plate numbers and TOM cards
              </p>
            </div>
          </div>

          {/* Pending Queue */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Pending Verification ({pendingRequests.length})
            </h2>

            {pendingRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No pending registration requests in the queue.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {req.user?.full_name ?? 'Staff Applicant'}
                        </h3>
                        <span className="text-xs text-slate-500">
                          Phone: {req.user?.phone_number ?? 'None'} • {req.requested_office?.name ?? 'Office'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-400 block">Requested Plate</span>
                        <span className="font-mono font-bold text-navy-950 text-sm">
                          {req.requested_plate_number}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-400 block">TOM Number</span>
                        <span className="font-mono text-slate-700 font-bold">
                          {req.requested_tom_card || 'None specified'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleApprove(req.id)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve & Activate
                      </button>
                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => setRejectionModalId(req.id)}
                        className="py-2 px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Decisions History */}
          <div className="space-y-4 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Decision History ({pastRequests.length})
            </h2>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Requested Vehicle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reviewed Date</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.user?.full_name}</td>
                      <td className="py-3 px-4 font-mono">{r.requested_plate_number}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(r.reviewed_at)}</td>
                      <td className="py-3 px-4 text-slate-500">{r.rejection_reason || 'Verified'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Rejection Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Provide Reason for Rejection</h3>
            <p className="text-xs text-slate-500">
              This reason will be stored in the audit trail and presented to the applicant.
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Detailed Rejection Explanation <span className="text-red-500">*</span>
                </label>
                <span className="block text-[11px] text-slate-500 mb-1.5">
                  State why the registration or plate assignment cannot be approved
                </span>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirm Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setRejectionModalId(null)}
                  className="py-2 px-4 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
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
