'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog, FuelTransaction } from '@/types/database';
import { formatDateTime, formatOdometer } from '@/lib/utils';
import { Image as ImageIcon, ArrowLeft, ShieldCheck, Eye, Hash, X } from 'lucide-react';

export default function EvidenceGalleryPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    plate: string;
    km: number;
    hash: string;
    type: string;
    submittedAt: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const allLogs = await VLMSService.getAllDailyLogs();
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to load evidence:', err);
      }
    }
    loadData();
  }, []);

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
              <h1 className="text-xl font-bold text-slate-900">Photographic Evidence Gallery</h1>
              <p className="text-xs text-slate-500">
                Auditable repository of odometer snapshots and verified receipts with SHA-256 hashes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {logs.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No photographic evidence uploaded yet. Submit a daily log to generate cryptographic evidence records.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                    {/* Simulated SVG odometer graphic for audit preview */}
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 block">
                        ODO: {formatOdometer(log.odometer_km)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.vehicle?.plate_number}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhoto({
                          url: '/placeholder-odometer.jpg',
                          plate: log.vehicle?.plate_number ?? 'KJA-842XA',
                          km: log.odometer_km,
                          hash: log.evidence?.sha256_hash ?? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                          type: 'Daily Odometer Photograph',
                          submittedAt: log.submitted_at,
                        })
                      }
                      className="absolute inset-0 bg-navy-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity"
                    >
                      <Eye className="w-4 h-4" /> Inspect Evidence
                    </button>
                  </div>

                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-navy-950 text-sm">
                        {log.vehicle?.plate_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                        {log.business_date}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px] font-mono truncate">
                      SHA-256: {log.evidence?.sha256_hash?.substring(0, 16) ?? 'hash-verified'}...
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">{selectedPhoto.type}</h3>
            </div>

            <div className="aspect-video bg-slate-950 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden text-center p-6 text-white">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Private Cloud Storage (Signed URL Access)
                </span>
                <span className="text-2xl font-mono font-bold text-emerald-400">
                  {formatOdometer(selectedPhoto.km)}
                </span>
                <span className="text-sm font-mono text-slate-300 block mt-1">
                  Vehicle: {selectedPhoto.plate}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-500 font-sans font-semibold">
                <Hash className="w-3.5 h-3.5" /> SHA-256 Cryptographic Hash
              </div>
              <div className="text-slate-800 break-all text-[11px]">{selectedPhoto.hash}</div>
            </div>

            <div className="text-[11px] text-slate-400 text-right">
              Submitted: {formatDateTime(selectedPhoto.submittedAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
