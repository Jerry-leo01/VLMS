'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { FuelTransaction } from '@/types/database';
import { formatCurrency, formatOdometer, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Search, Fuel } from 'lucide-react';

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
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

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
                  Audit trail of all recorded TOM Card and personal-fund fuel expenditures
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter vendor, plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-60 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Purchased Date</th>
                    <th className="py-3 px-4">Vehicle Plate</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Vendor / Station</th>
                    <th className="py-3 px-4">Total Amount (NGN)</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No fuel transactions found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">{formatDateTime(tx.purchased_at)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-950">{tx.vehicle?.plate_number}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{tx.user?.full_name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                            {tx.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">{tx.vendor_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.quantity_litres} L</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{formatOdometer(tx.odometer_km)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              tx.status === 'flagged' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No fuel transactions found.</div>
              ) : (
                filtered.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{tx.vendor_name}</span>
                      <span className="font-mono font-bold text-navy-950 text-sm">{formatCurrency(tx.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span>Vehicle: <strong className="font-mono text-slate-900">{tx.vehicle?.plate_number}</strong></span>
                      <span>Volume: <strong className="text-slate-900">{tx.quantity_litres} L</strong></span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {tx.payment_method.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(tx.purchased_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      <ManagementBottomNav />
    </div>
  );
}
