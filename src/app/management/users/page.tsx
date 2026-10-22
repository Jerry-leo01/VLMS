'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { Profile } from '@/types/database';
import { Users, ArrowLeft, Search, ShieldCheck } from 'lucide-react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      const u1 = await VLMSService.getStaffProfile('p-admin-01');
      const u2 = await VLMSService.getStaffProfile('p-staff-01');
      const list: Profile[] = [];
      if (u1) list.push(u1);
      if (u2) list.push(u2);
      setUsers(list);
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
              <h1 className="text-xl font-bold text-slate-900">Fleet Staff & Drivers Directory</h1>
              <p className="text-xs text-slate-500">
                User accounts, role assignments, and organizational office locations
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Office Location</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.employee_id ?? '-'}</td>
                    <td className="py-3 px-4">
                      {u.roles?.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-navy-100 text-navy-800 uppercase mr-1">
                          {r.replace('_', ' ')}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.office?.name ?? 'Corporate HQ'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {u.status}
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
