'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { CreditCard, ArrowLeft, Shield } from 'lucide-react';

export default function TomCardsManagementPage() {
  const cards = [
    {
      id: 'tc-01',
      reference: 'TOM-LAG-001',
      masked: '7004 **** **** 1024',
      vehicle: 'KJA-842XA',
      assignedTo: 'Chukwuma Eze',
      status: 'active',
    },
    {
      id: 'tc-02',
      reference: 'TOM-ABJ-002',
      masked: '7004 **** **** 3819',
      vehicle: 'ABJ-194LK',
      assignedTo: 'Pool Fleet',
      status: 'active',
    },
    {
      id: 'tc-03',
      reference: 'TOM-PHC-003',
      masked: '7004 **** **** 8842',
      vehicle: 'PHC-552XY',
      assignedTo: 'Port Harcourt Hub',
      status: 'active',
    },
  ];

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
              <h1 className="text-xl font-bold text-slate-900">TOM Card Directory & Assignments</h1>
              <p className="text-xs text-slate-500">
                Card references, masked card identifiers, and vehicle bindings
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Card Reference</th>
                  <th className="py-3 px-4">Masked Card Number</th>
                  <th className="py-3 px-4">Assigned Vehicle</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Vendor Restriction</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.reference}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.masked}</td>
                    <td className="py-3 px-4 font-mono font-bold text-navy-950">{c.vehicle}</td>
                    <td className="py-3 px-4 text-slate-700">{c.assignedTo}</td>
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
        </main>
      </div>
    </div>
  );
}
