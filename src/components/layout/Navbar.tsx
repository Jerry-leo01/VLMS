'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, User, LogOut, Shield, Menu, X, FileText, Fuel } from 'lucide-react';

interface NavbarProps {
  userRole?: 'staff' | 'department_head' | 'fleet_manager' | 'auditor' | 'administrator';
  userName?: string;
  vehiclePlate?: string;
}

export function Navbar({ userRole = 'staff', userName = 'Staff Member', vehiclePlate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManagement = ['department_head', 'fleet_manager', 'auditor', 'administrator'].includes(userRole);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href={isManagement ? '/management' : '/staff'} className="flex items-center gap-2">
            <div className="bg-navy-900 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-navy-900">VLMS</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-navy-100 text-navy-800 uppercase">
                {userRole.replace('_', ' ')}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {!isManagement ? (
            <>
              <Link href="/staff" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/staff/log" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Submit Daily Log
              </Link>
              <Link href="/staff/fuel" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Record Fuel
              </Link>
              <Link href="/staff/history" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                My Submissions
              </Link>
            </>
          ) : (
            <>
              <Link href="/management" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Fleet Overview
              </Link>
              <Link href="/management/approvals" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Approvals
              </Link>
              <Link href="/management/vehicles" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Vehicles
              </Link>
              <Link href="/management/anomalies" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Anomalies
              </Link>
              <Link href="/management/audit" className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors">
                Audit Trail
              </Link>
            </>
          )}
        </nav>

        {/* User Info & Switchers */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-900">{userName}</span>
            {vehiclePlate && (
              <span className="text-xs font-mono text-slate-500 font-medium">Assigned: {vehiclePlate}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/login"
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="py-2 border-b border-slate-100 text-sm text-slate-600">
            Signed in as: <strong className="text-navy-900">{userName}</strong> ({userRole})
          </div>
          {!isManagement ? (
            <>
              <Link
                href="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/staff/log"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Submit Daily Log
              </Link>
              <Link
                href="/staff/fuel"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Record Fuel
              </Link>
              <Link
                href="/staff/history"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                My History
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/management"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Fleet Dashboard
              </Link>
              <Link
                href="/management/approvals"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Registration Approvals
              </Link>
              <Link
                href="/management/vehicles"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Vehicles Directory
              </Link>
              <Link
                href="/management/anomalies"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Anomalies
              </Link>
              <Link
                href="/management/audit"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Audit Trail
              </Link>
            </>
          )}
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/login"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
