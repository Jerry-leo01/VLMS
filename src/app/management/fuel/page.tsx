'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { FuelTransaction } from '@/types/database';
import { formatCurrency, formatOdometer, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Search, ExternalLink, Eye } from 'lucide-react';

export default function ManagementFuelPage() {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await VLMSService.getAllFuelTransactions();
        setTransactions(data);
      } catch (err) {
        console.error('Failed to load fuel transactions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.vehicle?.plate_number && t.vehicle.plate_number.toLowerCase().includes(q)) ||
      (t.user?.full_name && t.user.full_name.toLowerCase().includes(q)) ||
      t.vendor_name.toLowerCase().includes(q)
    );
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
                <h1 className="text-xl font-bold text-slate-900">Fleet Fuel Transactions</h1>
                <p className="text-xs text-slate-500">
                  Click any vehicle plate number to open the photographic receipt & odometer evidence for that transaction
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="fuelSearchInput"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Filter by Plate, Staff, or Filling Station
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="fuelSearchInput"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Purchased Date & Time</th>
                    <th className="py-3 px-4">Vehicle Plate (Evidence Link)</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Filling Station</th>
                    <th className="py-3 px-4">Total Amount (NGN)</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No fuel transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((tx) => {
                      const plate = tx.vehicle?.plate_number ?? tx.vehicle_id;
                      const evidenceHref = `/management/evidence?txId=${encodeURIComponent(
                        tx.id
                      )}&plate=${encodeURIComponent(plate)}`;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {formatDateTime(tx.purchased_at)}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={evidenceHref}
                              title={`Inspect photographic evidence for ${plate}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-blue-700 text-white font-mono font-bold text-xs shadow-xs transition-colors"
                            >
                              <span>{plate}</span>
                              <ExternalLink className="w-3 h-3 text-blue-300" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {tx.user?.full_name ?? 'Assigned Driver'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                              {tx.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">
                            {tx.vendor_name}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {tx.quantity_litres} L
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {formatOdometer(tx.odometer_km)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                  tx.status === 'flagged'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {tx.status}
                              </span>
                              <Link
                                href={evidenceHref}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                              >
                                <Eye className="w-3.5 h-3.5" /> Photo
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No fuel transactions recorded yet.
                </div>
              ) : (
                filtered.map((tx) => {
                  const plate = tx.vehicle?.plate_number ?? tx.vehicle_id;
                  const evidenceHref = `/management/evidence?txId=${encodeURIComponent(
                    tx.id
                  )}&plate=${encodeURIComponent(plate)}`;

                  return (
                    <div key={tx.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{tx.vendor_name}</span>
                        <span className="font-mono font-bold text-navy-950 text-sm">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>Plate:</span>
                          <Link
                            href={evidenceHref}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 text-white font-mono font-bold text-xs"
                          >
                            <span>{plate}</span>
                            <ExternalLink className="w-3 h-3 text-blue-300" />
                          </Link>
                        </div>
                        <span>
                          Volume: <strong className="text-slate-900">{tx.quantity_litres} L</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Staff: {tx.user?.full_name ?? 'Assigned Driver'}</span>
                        <span>Odo: {formatOdometer(tx.odometer_km)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                          {tx.payment_method.replace('_', ' ')}
                        </span>
                        <Link
                          href={evidenceHref}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect Evidence Photo →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      <ManagementBottomNav />
    </div>
  );
}
