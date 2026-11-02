'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { Profile, VehicleAssignment, TomCard } from '@/types/database';
import { User, Car, CreditCard, Building, ShieldCheck, LogOut, Phone, Mail, Edit3, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [tomCard, setTomCard] = useState<TomCard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { profile: staff, assignment: asg } = await VLMSService.getCurrentStaffContext();
      if (staff) setProfile(staff);
      if (asg) {
        setAssignment(asg);
        const card = await VLMSService.getTomCardForVehicle(asg.vehicle_id);
        if (card) setTomCard(card);
      }
    }
    loadData();
  }, []);

  const handleProfileUpdated = (updated: Profile) => {
    setProfile(updated);
    setSuccessToast('Your profile information has been successfully updated.');
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name}
        vehiclePlate={assignment?.vehicle?.plate_number}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Staff Profile & Account</h1>
          {profile && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-navy-800" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Success Feedback Toast */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
                {profile?.full_name?.charAt(0) ?? 'S'}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-slate-900">{profile?.full_name ?? 'Assigned Driver'}</h2>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {profile?.phone_number ?? 'No phone added'}
                  </span>
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {profile.email}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3.5 h-3.5" /> Account Verified & Active
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="sm:hidden self-start py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Car className="w-4 h-4 text-navy-800" /> Assigned Company Car
              </span>
              <span className="font-mono font-bold text-navy-950">
                {assignment?.vehicle?.plate_number ?? 'Unassigned'} {assignment?.vehicle ? `(${assignment.vehicle.car_name || assignment.vehicle.make} ${assignment.vehicle.model})` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-navy-800" /> Assigned TOM Number
              </span>
              <span className="font-mono font-bold text-navy-950 bg-slate-100 px-2.5 py-0.5 rounded">
                {tomCard?.masked_card_number ?? profile?.tom_card?.masked_card_number ?? 'Not assigned'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Building className="w-4 h-4 text-navy-800" /> Operating Office
              </span>
              <span className="font-semibold text-slate-900">
                {profile?.office?.name ?? 'Corporate Branch'}
              </span>
            </div>

            {profile?.employee_id && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 flex items-center gap-2">
                  <User className="w-4 h-4 text-navy-800" /> Employee ID
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  {profile.employee_id}
                </span>
              </div>
            )}
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

      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      <BottomNav />
    </div>
  );
}
