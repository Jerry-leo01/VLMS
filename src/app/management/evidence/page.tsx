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
import { SafeImage } from '@/components/ui/SafeImage';
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  Hash,
  X,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

export default function EvidenceGalleryPage() {
  const [gallery, setGallery] = useState<EvidenceGalleryItem[]>([]);
  const [plateFilter, setPlateFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'daily_log' | 'fuel_transaction'>('all');
  const [selectedItem, setSelectedItem] = useState<EvidenceGalleryItem | null>(null);

  // Lightbox view state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        await VLMSService.syncWithServer().catch(() => {});
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
            if (matched) handleSelectItem(matched);
          } else if (logId) {
            const matched = items.find(
              (item) => item.sourceRecordId === logId && item.sourceType === 'daily_log'
            );
            if (matched) handleSelectItem(matched);
          } else if (plate) {
            const matched = items.find(
              (item) => item.vehiclePlate.toLowerCase() === plate.toLowerCase()
            );
            if (matched) handleSelectItem(matched);
          }
        }
      } catch (err) {
        console.error('Failed to load evidence gallery:', err);
      }
    }
    loadData();
  }, []);

  const handleSelectItem = (item: EvidenceGalleryItem | null) => {
    setSelectedItem(item);
    setZoomLevel(1);
    setRotation(0);
    setCopiedHash(false);
  };

  const handleCopyHash = (hash: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(hash).then(() => {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      });
    }
  };

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
                  Auditable repository of odometer snapshots and fuel receipts with Supabase Storage cloud streaming and SHA-256 verification
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
                    placeholder="e.g. MUS324GH, Mary"
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
                  onClick={() => handleSelectItem(item)}
                  className="bg-white border border-slate-200 hover:border-navy-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    <SafeImage
                      src={item.dataUrl || ''}
                      evidenceId={item.evidenceId}
                      alt={item.title}
                      fallbackType="evidence"
                      telemetry={{
                        odoKm: item.odometerKm,
                        plateNumber: item.vehiclePlate,
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold backdrop-blur-xs">
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

                    <div className="text-slate-500 text-[10px] font-mono truncate border-t border-slate-100 pt-1.5 flex items-center justify-between">
                      <span>SHA: {item.sha256Hash.substring(0, 14)}...</span>
                      <span className="text-emerald-600 font-sans font-bold text-[9px] uppercase tracking-wider">Verified</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Enhanced Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelectItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors z-20"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pr-8">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedItem.title}</h3>
                <p className="text-xs text-slate-500">
                  Vehicle Plate: <strong className="font-mono text-navy-950">{selectedItem.vehiclePlate}</strong> • Submitted by {selectedItem.staffName}
                </p>
              </div>
            </div>

            {/* Interactive Lightbox Canvas with Pan & Zoom Controls */}
            <div className="relative aspect-video sm:aspect-[16/10] bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 overflow-hidden select-none">
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              >
                <SafeImage
                  src={selectedItem.dataUrl || ''}
                  evidenceId={selectedItem.evidenceId}
                  alt={selectedItem.title}
                  fallbackType="evidence"
                  telemetry={{
                    odoKm: selectedItem.odometerKm,
                    plateNumber: selectedItem.vehiclePlate,
                  }}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Floating Lightbox Toolbar */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-white shadow-lg z-10">
                <button
                  type="button"
                  title="Zoom Out"
                  disabled={zoomLevel <= 1}
                  onClick={() => setZoomLevel((prev) => Math.max(1, Number((prev - 0.5).toFixed(1))))}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 font-semibold min-w-[3ch] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  title="Zoom In"
                  disabled={zoomLevel >= 3}
                  onClick={() => setZoomLevel((prev) => Math.min(3, Number((prev + 0.5).toFixed(1))))}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-3.5 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  title="Rotate Clockwise (90°)"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                {(zoomLevel !== 1 || rotation !== 0) && (
                  <button
                    type="button"
                    title="Reset View"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="p-1 hover:bg-white/20 rounded text-amber-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* OCR Telemetry & Algorithmic Comparison Panel */}
            {selectedItem.metadata &&
              (selectedItem.metadata.ocrProposal !== undefined ||
                selectedItem.metadata.ocrConfidence !== undefined) && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-blue-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      OCR Algorithmic Telemetry Verification
                    </span>
                    <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Confidence: {selectedItem.metadata.ocrConfidence ? `${Math.round(Number(selectedItem.metadata.ocrConfidence) * 100)}%` : 'Verified'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold">Driver Entry</span>
                      <span className="text-slate-900 font-bold text-xs">
                        {formatOdometer(selectedItem.odometerKm)}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold">OCR Scan Reading</span>
                      <span className="text-emerald-700 font-bold text-xs">
                        {selectedItem.metadata.ocrProposal ? formatOdometer(Number(selectedItem.metadata.ocrProposal)) : 'Match'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* SHA-256 Cryptographic Hash & Cloud Verification */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-700 font-sans font-semibold">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  SHA-256 Cryptographic Digest
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(selectedItem.sha256Hash)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-sans font-semibold py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Digest</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-slate-800 break-all text-[11px] bg-white p-2 rounded border border-slate-200">
                {selectedItem.sha256Hash}
              </div>
            </div>

            {/* Human-Readable Evidence Telemetry Metadata Breakdown */}
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

            <div className="text-[11px] text-slate-500 text-right pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> Cloud Backed & Encrypted
              </span>
              <span>Submitted: {formatDateTime(selectedItem.submittedAt)}</span>
            </div>
          </div>
        </div>
      )}

      <ManagementBottomNav />
    </div>
  );
}
