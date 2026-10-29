'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService, EvidenceGalleryItem } from '@/lib/services/vlms-service';
import {
  formatDateTime,
  formatOdometer,
  formatCurrency,
  formatEvidenceMetadata,
} from '@/lib/utils';
import {
  Image as ImageIcon,
  ArrowLeft,
  ShieldCheck,
  Eye,
  Hash,
  X,
  Filter,
} from 'lucide-react';

export default function EvidenceGalleryPage() {
  const [gallery, setGallery] = useState<EvidenceGalleryItem[]>([]);
  const [plateFilter, setPlateFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'daily_log' | 'fuel_transaction'>('all');
  const [selectedItem, setSelectedItem] = useState<EvidenceGalleryItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const items = await VLMSService.getEvidenceGallery();
        setGallery(items);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const txId = params.get('txId');
          const logId = params.get('logId');
          const plate = params.get('plate');

          if (plate) {
            setPlateFilter(plate);
          }

          if (txId) {
            const matched = items.find(
              (item) => item.sourceRecordId === txId && item.sourceType === 'fuel_transaction'
            );
            if (matched) setSelectedItem(matched);
          } else if (logId) {
            const matched = items.find(
              (item) => item.sourceRecordId === logId && item.sourceType === 'daily_log'
            );
            if (matched) setSelectedItem(matched);
          } else if (plate) {
            const matched = items.find(
              (item) => item.vehiclePlate.toLowerCase() === plate.toLowerCase()
            );
            if (matched) setSelectedItem(matched);
          }
        }
      } catch (err) {
        console.error('Failed to load evidence gallery:', err);
      }
    }
    loadData();
  }, []);

  const filteredGallery = gallery.filter((item) => {
    if (typeFilter !== 'all' && item.sourceType !== typeFilter) return false;
    if (plateFilter.trim()) {
      const q = plateFilter.trim().toLowerCase();
      return (
        item.vehiclePlate.toLowerCase().includes(q) ||
        item.staffName.toLowerCase().includes(q) ||
        (item.vendorName && item.vendorName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/management"
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Photographic Evidence Gallery</h1>
                <p className="text-xs text-slate-500">
                  Auditable repository of odometer snapshots and fuel receipts with SHA-256 cryptographic verification
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="evidenceFilterInput"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Filter by Plate or Staff Name
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="evidenceFilterInput"
                    type="text"
                    value={plateFilter}
                    onChange={(e) => setPlateFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 w-48 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  {plateFilter && (
                    <button
                      type="button"
                      onClick={() => setPlateFilter('')}
                      className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="evidenceTypeSelect"
                  className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" /> Evidence Source
                </label>
                <select
                  id="evidenceTypeSelect"
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(
                      e.target.value as 'all' | 'daily_log' | 'fuel_transaction'
                    )
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-800"
                >
                  <option value="all">All Evidence ({gallery.length})</option>
                  <option value="daily_log">Daily Odometer Logs</option>
                  <option value="fuel_transaction">Fuel Purchase Receipts</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGallery.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs">
                No photographic evidence matches the current filter. Captured odometer photos and fuel receipts appear here automatically upon submission.
              </div>
            ) : (
              filteredGallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white border border-slate-200 hover:border-navy-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                    {item.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.dataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          ODO: {formatOdometer(item.odometerKm)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.vehiclePlate}
                        </span>
                      </div>
                    )}

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold">
                      {item.sourceType === 'fuel_transaction'
                        ? 'Fuel Receipt Evidence'
                        : 'Daily Odometer Photo'}
                    </span>

                    <div className="absolute inset-0 bg-navy-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity">
                      <Eye className="w-4 h-4" /> Inspect Full Evidence
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-navy-950 text-sm">
                        {item.vehiclePlate}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                        {item.businessDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                      <span className="truncate">{item.staffName}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {item.amount ? formatCurrency(item.amount) : formatOdometer(item.odometerKm)}
                      </span>
                    </div>

                    {item.vendorName && (
                      <div className="text-[11px] text-emerald-800 font-semibold truncate">
                        Station: {item.vendorName}
                      </div>
                    )}

                    <div className="text-slate-500 text-[10px] font-mono truncate border-t border-slate-100 pt-1.5">
                      SHA-256: {item.sha256Hash.substring(0, 18)}...
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Evidence Inspection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedItem.title}</h3>
                <p className="text-xs text-slate-500">
                  Vehicle Plate: <strong className="font-mono text-navy-950">{selectedItem.vehiclePlate}</strong> • Submitted by {selectedItem.staffName}
                </p>
              </div>
            </div>

            <div className="aspect-video bg-slate-950 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden">
              {selectedItem.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.dataUrl}
                  alt={selectedItem.title}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-white">
                  <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                    Cryptographically Verified Evidence Record
                  </span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    {formatOdometer(selectedItem.odometerKm)}
                  </span>
                  <span className="text-sm font-mono text-slate-300 block mt-1">
                    Vehicle: {selectedItem.vehiclePlate}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-600 font-sans font-semibold">
                <Hash className="w-3.5 h-3.5" /> SHA-256 Cryptographic Hash
              </div>
              <div className="text-slate-800 break-all text-[11px]">{selectedItem.sha256Hash}</div>
            </div>

            {/* Human-Readable Evidence Metadata Inspection Card */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Evidence Telemetry Breakdown
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {formatEvidenceMetadata(selectedItem.metadata).map((meta, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      {meta.label}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">{meta.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-right">
              Submitted: {formatDateTime(selectedItem.submittedAt)}
            </div>
          </div>
        </div>
      )}

      <ManagementBottomNav />
    </div>
  );
}
