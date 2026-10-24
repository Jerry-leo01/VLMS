'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { CreditCard, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function TomCardsManagementPage() {
  const cards = [
    {
      id: 'tc-01',
      tomNumber: '804689',
      vehicle: 'KJA-842XA',
      assignedTo: 'Chukwuma Eze',
      status: 'active',
    },
    {
      id: 'tc-02',
      tomNumber: '804690',
      vehicle: 'ABJ-194LK',
      assignedTo: 'Pool Fleet',
      status: 'active',
    },
    {
      id: 'tc-03',
      tomNumber: '804691',
      vehicle: 'PHC-552XY',
      assignedTo: 'Port Harcourt Hub',
      status: 'active',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

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
              <h1 className="text-xl font-bold text-slate-900">TOM Number Directory & Fleet Assignments</h1>
              <p className="text-xs text-slate-500">
                Standardized 6-digit numeric TOM numbers and dedicated vehicle bindings
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">TOM Number (6 Digits)</th>
                    <th className="py-3 px-4">Assigned Vehicle</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4">Vendor Policy</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cards.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {c.tomNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-navy-950">{c.vehicle}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{c.assignedTo}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">TOTAL ENERGIES FILLING STATION</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {cards.map((c) => (
                <div key={c.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">TOM Number</span>
                      <span className="font-mono font-bold text-navy-950 text-base bg-slate-100 px-2.5 py-0.5 rounded">
                        {c.tomNumber}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 pt-1">
                    <span>Vehicle: <strong className="font-mono text-slate-900">{c.vehicle}</strong></span>
                    <span>Staff: <strong className="text-slate-900">{c.assignedTo}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <ManagementBottomNav />
    </div>
  );
}
