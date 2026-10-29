'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { Profile, Office, UserRole, UserStatus } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import {
  Users,
  ArrowLeft,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Phone,
  Mail,
  Building2,
  Car,
  CreditCard,
  UserCheck,
  KeyRound,
  Info,
} from 'lucide-react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminGuide, setShowAdminGuide] = useState(false);

  // Provision Admin/Manager Modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [officeId, setOfficeId] = useState('off-01');
  const [role, setRole] = useState<'administrator' | 'fleet_manager'>('administrator');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [allUsers, allOffices] = await Promise.all([
        VLMSService.getAllProfiles(),
        VLMSService.getOffices(),
      ]);
      setUsers(allUsers);
      setOffices(allOffices);
      if (allOffices.length > 0) {
        setOfficeId(allOffices[0].id);
      }
    } catch (err) {
      console.error('Failed to load staff profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedUserId((prev) => (prev === id ? null : id));
  };

  const handleProvisionAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phoneNumber.trim()) return;
    setSubmitting(true);
    try {
      const adminSession = await VLMSService.getCurrentAdminProfile();
      await VLMSService.provisionAdminUser({
        requesterAdminId: adminSession?.id ?? 'admin-system',
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        employeeId: employeeId.trim(),
        officeId,
        role,
      });
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setEmployeeId('');
      setShowProvisionModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoleOrStatus = async (
    targetUserId: string,
    newRoles: UserRole[],
    newStatus: UserStatus
  ) => {
    try {
      const adminSession = await VLMSService.getCurrentAdminProfile();
      await VLMSService.updateUserRoleAndStatus({
        actorId: adminSession?.id ?? 'admin-system',
        userId: targetUserId,
        role: newRoles[0],
        status: newStatus,
      });
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && !u.roles?.includes(roleFilter as UserRole)) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.office?.name && u.office.name.toLowerCase().includes(q)) ||
      (u.assigned_vehicle?.plate_number && u.assigned_vehicle.plate_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <Link
                href="/management"
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Fleet Staff Directory</h1>
                <p className="text-xs text-slate-500">
                  Click any staff member&apos;s name or card to expand their complete profile, vehicle assignment, and role controls
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdminGuide((v) => !v)}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Info className="w-4 h-4 text-blue-600" />
                <span>Admin Access Guide</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProvisionModal(true)}
                className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Provision Admin / Manager</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Admin Access & Onboarding Guide */}
          {showAdminGuide && (
            <div className="bg-gradient-to-br from-navy-950 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">How Administrators Register & Gain Access to the Admin Module</h2>
                    <p className="text-[11px] text-slate-300">
                      Three verified workflows for granting and accessing `/management` administrative controls
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase">
                    Path 1 • Self-Service Onboarding
                  </span>
                  <h3 className="font-bold text-white">Register as Administrator</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Navigate to <Link href="/register" className="underline text-blue-300 font-semibold">/register</Link> and select the <strong>Administrator Onboarding</strong> tab. Enter your Full Name, Corporate Email, Phone Number, Employee ID, and Office Branch to immediately activate your Administrator session and open the Management Dashboard.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                    Path 2 • Direct Admin Provisioning
                  </span>
                  <h3 className="font-bold text-white">Provision via Staff Directory</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    An existing administrator clicks <strong>&ldquo;Provision Admin / Manager&rdquo;</strong> at the top of this page to create an active profile with the <code className="text-emerald-300">administrator</code> or <code className="text-emerald-300">fleet_manager</code> role, or expands any staff card below to promote their role.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                    Path 3 • Returning Admin Sign-In
                  </span>
                  <h3 className="font-bold text-white">Sign In at /login</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Registered administrators sign in at <Link href="/login" className="underline text-amber-300 font-semibold">/login</Link> by selecting the <strong>Management / Admin</strong> portal and entering their registered corporate email or phone number.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Search Staff Member by Name, Phone, Email, or Office
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Role Filter
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="administrator">Administrators</option>
                  <option value="fleet_manager">Fleet Managers</option>
                  <option value="staff">Staff Drivers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile-Responsive Collapsible Card Grid */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
              Loading staff directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">No Staff Profiles Registered Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The production database has been sanitized of all demo profiles. Staff drivers can register via <Link href="/register" className="text-blue-600 underline font-semibold">/register</Link> or you can provision an administrator account now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProvisionModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Provision First Administrator</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {filteredUsers.map((u) => {
                const isExpanded = expandedUserId === u.id;
                const roles = u.roles && u.roles.length > 0 ? u.roles : (['staff'] as UserRole[]);

                return (
                  <div
                    key={u.id}
                    className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-navy-800 ring-2 ring-navy-900/10 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {/* COLLAPSED CARD HEADER: Only Full Name and Assigned Roles */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(u.id)}
                      aria-expanded={isExpanded}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-navy-950 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                          {u.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Full Name
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-900 break-words block">
                            {u.full_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-wrap justify-end gap-1">
                          {roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                r === 'administrator'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : r === 'fleet_manager'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {r.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* EXPANDED DRILL-DOWN PROFILE VIEW */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/60 space-y-4 text-xs animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> Corporate Email
                            </span>
                            <p className="font-semibold text-slate-900 break-all">
                              {u.email || 'Not provided'}
                            </p>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> Phone Number
                            </span>
                            <p className="font-mono font-bold text-slate-900">
                              {u.phone_number || 'Not provided'}
                            </p>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" /> Assigned Office Branch
                            </span>
                            <p className="font-semibold text-slate-900">
                              {u.office?.name ?? 'Corporate HQ'}
                            </p>
                            {u.employee_id && (
                              <span className="text-[11px] font-mono text-slate-500 block">
                                Employee ID: {u.employee_id}
                              </span>
                            )}
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-400" /> Account Status
                            </span>
                            <div className="flex items-center justify-between pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  u.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : u.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {u.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Joined {formatDateTime(u.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400" /> Assigned Vehicle
                            </span>
                            {u.assigned_vehicle ? (
                              <div>
                                <span className="font-mono font-bold text-navy-950 text-sm block">
                                  {u.assigned_vehicle.plate_number}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {u.assigned_vehicle.make} {u.assigned_vehicle.model}
                                </span>
                              </div>
                            ) : (
                              <p className="text-slate-500 font-medium">No dedicated vehicle assigned</p>
                            )}
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400" /> Assigned TOM Card
                            </span>
                            {u.tom_card ? (
                              <div>
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs inline-block">
                                  TOM #{u.tom_card.masked_card_number}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  TOTAL ENERGIES FILLING STATION
                                </span>
                              </div>
                            ) : (
                              <p className="text-slate-500 font-medium">No TOM card bound</p>
                            )}
                          </div>
                        </div>

                        {/* Role & Access Promotion Bar */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-slate-800 block">
                              Administrative Role & Access Control
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Grant or update role permissions for this user
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(['staff', 'fleet_manager', 'administrator'] as UserRole[]).map((roleOption) => {
                              const active = roles.includes(roleOption);
                              return (
                                <button
                                  key={roleOption}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRoleOrStatus(u.id, [roleOption], 'active')
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                    active
                                      ? 'bg-navy-950 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {roleOption.replace('_', ' ')}
                                </button>
                              );
                            })}
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

      {/* Provision Administrator / Manager Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-navy-900" />
                <h3 className="text-base font-bold text-slate-900">
                  Provision Administrator / Manager
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <span className="block text-[11px] text-slate-500 mb-1">
                  Enter the administrator&apos;s official first and last name
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <span className="block text-[10px] text-slate-500 mb-1">
                    Official work email address
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <span className="block text-[10px] text-slate-500 mb-1">
                    11-digit mobile number
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Employee Staff ID</label>
                  <span className="block text-[10px] text-slate-500 mb-1">
                    Internal staff identification code
                  </span>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Assigned Role</label>
                  <span className="block text-[10px] text-slate-500 mb-1">
                    Management authorization level
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'administrator' | 'fleet_manager')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                  >
                    <option value="administrator">Administrator (Full Access)</option>
                    <option value="fleet_manager">Fleet Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Office Branch</label>
                <select
                  value={officeId}
                  onChange={(e) => setOfficeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-800"
                >
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.address ? `— ${o.address}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-navy-950 hover:bg-navy-900 text-white rounded-xl font-bold shadow-sm transition-colors"
                >
                  {submitting ? 'Provisioning...' : 'Activate Admin Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
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
