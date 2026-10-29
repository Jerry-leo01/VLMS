'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { Vehicle, Profile, VehicleStatus } from '@/types/database';
import { formatOdometer, formatDateTime } from '@/lib/utils';
import {
  Car,
  ArrowLeft,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  CreditCard,
  Gauge,
  Calendar,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function VehiclesManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Vehicle Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newStatus, setNewStatus] = useState<VehicleStatus>('active');
  const [newTomCard, setNewTomCard] = useState('');
  const [newAssignedUserId, setNewAssignedUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [vList, pList] = await Promise.all([
        VLMSService.getVehicles(),
        VLMSService.getAllProfiles(),
      ]);
      setVehicles(vList);
      setProfiles(pList);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.plate_number.toLowerCase().includes(q) ||
      (v.make && v.make.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.assigned_user?.full_name && v.assigned_user.full_name.toLowerCase().includes(q))
    );
  });

  const handleToggleCard = (id: string) => {
    setExpandedVehicleId((prev) => (prev === id ? null : id));
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await VLMSService.registerVehicle({
        plateNumber: newPlate,
        make: newMake,
        model: newModel,
        year: parseInt(newYear, 10) || new Date().getFullYear(),
        status: newStatus,
        tomCardNumber: newTomCard.trim() || undefined,
        assignedUserId: newAssignedUserId || undefined,
      });
      setShowAddModal(false);
      setNewPlate('');
      setNewMake('');
      setNewModel('');
      setNewTomCard('');
      setNewAssignedUserId('');
      await loadData();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setFormError(errorObj.message || 'Failed to register vehicle.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/management"
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Fleet Vehicle Directory</h1>
                <p className="text-xs text-slate-500">
                  Tap or click any vehicle card to drill down into full specifications, assigned staff, and odometer telemetry
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="vehicleDirectorySearch"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Filter by Plate, Staff, or Model
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="vehicleDirectorySearch"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 w-56 focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="py-2 px-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Register Vehicle</span>
              </button>
            </div>
          </div>

          {/* Mobile-Responsive Collapsible Card Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">No Vehicles Registered Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vehicles approved from the Staff Registration Queue or added via the &ldquo;Register Vehicle&rdquo; button above appear here as interactive cards.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {filtered.map((v) => {
                const isExpanded = expandedVehicleId === v.id;
                const staffName = v.assigned_user?.full_name || 'Unassigned Fleet Pool';

                return (
                  <div
                    key={v.id}
                    className={`bg-white border rounded-2xl transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-navy-900 ring-2 ring-navy-900/15 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Collapsed View: Strictly Plate Number, Staff Name, and Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleCard(v.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="px-3 py-1.5 rounded-xl bg-navy-900 text-white font-mono font-bold text-sm tracking-wider shadow-xs shrink-0">
                          {v.plate_number}
                        </div>

                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Assigned Staff
                          </span>
                          <span className="text-sm font-bold text-slate-900 break-words block">
                            {staffName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            v.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'maintenance'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.status}
                        </span>
                        <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Drill-Down View: All additional vehicle and user information */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/60 space-y-4 text-xs animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Car className="w-3.5 h-3.5 text-navy-800" /> Vehicle Specifications
                            </span>
                            <div className="font-bold text-slate-900 text-sm">
                              {v.make || 'Standard'} {v.model || 'Fleet'}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              Manufacturing Year: <strong>{v.year ?? 'N/A'}</strong>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Gauge className="w-3.5 h-3.5 text-emerald-600" /> Latest Verified Odometer
                            </span>
                            <div className="font-mono font-bold text-navy-950 text-sm">
                              {v.latest_odometer_km
                                ? formatOdometer(v.latest_odometer_km)
                                : 'No log recorded yet'}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              Canonical Metric (KM)
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-blue-600" /> Assigned Driver Details
                            </span>
                            <div className="font-bold text-slate-900">
                              {v.assigned_user?.full_name || 'Unassigned'}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              Phone: {v.assigned_user?.phone_number || 'Not provided'}
                            </div>
                            {v.assigned_user?.employee_id && (
                              <div className="text-slate-500 text-[11px] font-mono">
                                ID: {v.assigned_user.employee_id}
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-navy-800" /> Branch & TOM Card
                            </span>
                            <div className="font-bold text-slate-900">
                              {v.assigned_office?.name || 'Corporate Fleet Pool'}
                            </div>
                            <div className="text-slate-600 text-[11px] flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              TOM Card:{' '}
                              <strong className="font-mono text-navy-900">
                                {v.tom_card?.masked_card_number || 'None assigned'}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Registered: {formatDateTime(v.created_at)}
                          </span>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/management/evidence?plate=${encodeURIComponent(
                                v.plate_number
                              )}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-300" />
                              Inspect Vehicle Evidence
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Register Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">Register Fleet Vehicle</h3>
              <p className="text-xs text-slate-500">
                Add a company vehicle and optionally bind it to an active staff member and TOM card
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="vPlate" className="block font-semibold text-slate-800">
                  Vehicle Plate Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="vPlate"
                  type="text"
                  required
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Official state license plate registration.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vMake" className="block font-semibold text-slate-800">
                    Vehicle Make <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="vMake"
                    type="text"
                    required
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Manufacturer brand.</p>
                </div>

                <div>
                  <label htmlFor="vModel" className="block font-semibold text-slate-800">
                    Vehicle Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="vModel"
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Model name and trim.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vYear" className="block font-semibold text-slate-800">
                    Model Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="vYear"
                    type="number"
                    required
                    min="1995"
                    max={new Date().getFullYear() + 1}
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                <div>
                  <label htmlFor="vStatus" className="block font-semibold text-slate-800">
                    Operational Status
                  </label>
                  <select
                    id="vStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as VehicleStatus)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vTom" className="block font-semibold text-slate-800">
                    TOM Card Number (Optional)
                  </label>
                  <input
                    id="vTom"
                    type="text"
                    maxLength={6}
                    value={newTomCard}
                    onChange={(e) => setNewTomCard(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">6 numeric digits.</p>
                </div>

                <div>
                  <label htmlFor="vDriver" className="block font-semibold text-slate-800">
                    Assign Staff Member
                  </label>
                  <select
                    id="vDriver"
                    value={newAssignedUserId}
                    onChange={(e) => setNewAssignedUserId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  >
                    <option value="">Unassigned Pool</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Vehicle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ManagementBottomNav />
    </div>
  );
}
