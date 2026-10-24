'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { Profile, VehicleAssignment, TomCard } from '@/types/database';
import { User, Car, CreditCard, Building, ShieldCheck, LogOut, Phone } from 'lucide-react';
import Link from 'next/link';

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [tomCard, setTomCard] = useState<TomCard | null>(null);

  useEffect(() => {
    async function loadData() {
      const staff = await VLMSService.getStaffProfile('p-staff-01');
      const asg = await VLMSService.getActiveAssignment('p-staff-01');
      if (staff) setProfile(staff);
      if (asg) {
        setAssignment(asg);
        const card = await VLMSService.getTomCardForVehicle(asg.vehicle_id);
        if (card) setTomCard(card);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name ?? 'Chukwuma Eze'}
        vehiclePlate={assignment?.vehicle?.plate_number ?? 'KJA-842XA'}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1">
        <h1 className="text-xl font-bold text-slate-900">Staff Profile & Account</h1>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="w-14 h-14 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-lg">
              {profile?.full_name.charAt(0) ?? 'C'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{profile?.full_name ?? 'Chukwuma Eze'}</h2>
              <span className="text-xs text-slate-500 block">
                Phone: {profile?.phone_number ?? profile?.employee_id ?? 'Not provided'}
              </span>
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" /> Account Verified & Active
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Car className="w-4 h-4 text-navy-800" /> Assigned Company Car
              </span>
              <span className="font-mono font-bold text-navy-950">
                {assignment?.vehicle?.plate_number ?? 'KJA-842XA'} ({assignment?.vehicle?.car_name || assignment?.vehicle?.make} {assignment?.vehicle?.model})
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-navy-800" /> Assigned TOM Card
              </span>
              <span className="font-mono font-bold text-navy-950">
                {tomCard?.masked_card_number ?? '7004 **** **** 1024'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Building className="w-4 h-4 text-navy-800" /> Operating Office
              </span>
              <span className="font-semibold text-slate-900">
                {profile?.office?.name ?? 'Lagos Corporate HQ'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
