'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog, VehicleAssignment, Profile } from '@/types/database';
import { formatOdometer, formatDateTime, getBusinessDate } from '@/lib/utils';
import {
  Car,
  CheckCircle2,
  Clock,
  Camera,
  Fuel,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  MapPin,
} from 'lucide-react';

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<VehicleAssignment | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFuelPrompt, setShowFuelPrompt] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { profile: staffProfile, assignment: asg } =
          await VLMSService.getCurrentStaffContext();
        if (staffProfile) setProfile(staffProfile);
        if (asg) {
          setAssignment(asg);
          const log = await VLMSService.getTodayLog(asg.vehicle_id);
          if (log) {
            setTodayLog(log);
            // Trigger repeat login fuel prompt if log already submitted
            setShowFuelPrompt(true);
          }
        }
      } catch (err) {
        console.error('Failed to load staff data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Navbar
        userRole="staff"
        userName={profile?.full_name}
        vehiclePlate={assignment?.vehicle?.plate_number}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-6 space-y-6 flex-1 pb-24 md:pb-8">
        {/* Welcome Banner */}
        <div className="bg-navy-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Staff Vehicle Portal
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {profile?.full_name ?? 'Assigned Driver'}
            </h1>
            <p className="text-xs text-slate-300">
              {profile?.office?.name ?? 'Corporate Branch'} • Business Date: {getBusinessDate()}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 text-center sm:text-right shrink-0">
            <span className="text-[11px] text-slate-300 block font-medium">Assigned Vehicle</span>
            <span className="text-lg font-mono font-bold text-white tracking-wide">
              {assignment?.vehicle?.plate_number ?? 'Unassigned'}
            </span>
            <span className="text-[10px] text-blue-200 block">
              {assignment?.vehicle?.make} {assignment?.vehicle?.model}
            </span>
          </div>
        </div>

        {/* Repeat Login Prompt: Did you purchase fuel? */}
        {todayLog && showFuelPrompt && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Fuel className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Daily Log Recorded
                </span>
                <h3 className="text-base font-bold text-navy-900">
                  Today&apos;s vehicle log has already been submitted ({formatOdometer(todayLog.odometer_km)})
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Did you purchase fuel for vehicle <span className="font-mono font-semibold">{assignment?.vehicle?.plate_number}</span> today?
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/staff/fuel"
                className="flex-1 py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl text-center shadow-sm flex items-center justify-center gap-1.5"
              >
                <Fuel className="w-4 h-4 text-emerald-400" /> Yes, Record Fuel Purchase
              </Link>
              <button
                type="button"
                onClick={() => setShowFuelPrompt(false)}
                className="py-2.5 px-5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl text-center"
              >
                No, Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Today's Daily Log Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-navy-800" />
              Today&apos;s Daily Log Status
            </h2>
            {todayLog ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5" /> Action Required
              </span>
            )}
          </div>

          {todayLog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Confirmed Odometer</span>
                  <span className="text-lg font-mono font-bold text-navy-950">
                    {formatOdometer(todayLog.odometer_km)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Submission Time</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {formatDateTime(todayLog.submitted_at)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="text-xs font-semibold uppercase text-emerald-700">
                    {todayLog.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/staff/fuel"
                  className="flex-1 py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Fuel className="w-4 h-4 text-emerald-400" />
                  Record Additional Fuel Purchase
                </Link>
                <Link
                  href="/staff/history"
                  className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold text-center"
                >
                  View My Log History
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>Attention:</strong> You have not submitted the mandatory vehicle odometer log for today ({getBusinessDate()}). Please capture your vehicle&apos;s odometer dashboard before starting your daily operations.
              </div>

              <Link
                href="/staff/log"
                className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                Submit Today&apos;s Daily Log Now
              </Link>
            </div>
          )}
        </div>

        {/* Quick Operational Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/staff/fuel"
            className="p-5 bg-white border border-slate-200 hover:border-navy-400 rounded-2xl shadow-sm space-y-2 group transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Fuel className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-navy-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Purchase Fuel</h3>
            <p className="text-xs text-slate-500">
              Submit TOM Card or Personal-Fund purchase with odometer verification and receipt capture.
            </p>
          </Link>

          <Link
            href="/staff/history"
            className="p-5 bg-white border border-slate-200 hover:border-navy-400 rounded-2xl shadow-sm space-y-2 group transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-navy-900 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Submission History</h3>
            <p className="text-xs text-slate-500">
              Review your past daily logs, odometer readings, and verified fuel receipts.
            </p>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
