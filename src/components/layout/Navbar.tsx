'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Car, User, LogOut, Shield, Menu, X, FileText, Fuel, LayoutGrid } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { toggleAdminSidebar } from '@/components/layout/ManagementSidebar';

interface NavbarProps {
  userRole?: 'staff' | 'department_head' | 'fleet_manager' | 'auditor' | 'administrator';
  userName?: string;
  vehiclePlate?: string;
}

export function Navbar({ userRole = 'staff', userName = 'Staff Member', vehiclePlate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManagement = ['department_head', 'fleet_manager', 'auditor', 'administrator'].includes(userRole);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href={isManagement ? '/management' : '/staff'} className="flex items-center gap-2 group">
            <div className="bg-navy-900 dark:bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-navy-900 dark:text-white">VLMS</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-800 dark:bg-slate-800 dark:text-blue-300 uppercase tracking-wider">
                {userRole.replace('_', ' ')}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {!isManagement ? (
            <>
              <Link href="/staff" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/staff/log" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Submit Daily Log
              </Link>
              <Link href="/staff/fuel" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Record Fuel
              </Link>
              <Link href="/staff/history" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                My Submissions
              </Link>
            </>
          ) : (
            <>
              <Link href="/management" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Fleet Overview
              </Link>
              <Link href="/management/approvals" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Approvals
              </Link>
              <Link href="/management/vehicles" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Vehicles
              </Link>
              <Link href="/management/anomalies" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Anomalies
              </Link>
              <Link href="/management/audit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white transition-colors">
                Audit Trail
              </Link>
            </>
          )}
        </nav>

        {/* User Info & Switchers */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{userName}</span>
            {vehiclePlate && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">Plate: {vehiclePlate}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Sign Out */}
            <Link
              href="/login"
              title="Sign Out"
              className="hidden sm:flex p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>

            {/* Mobile Menu Trigger */}
            {isManagement ? (
              <button
                type="button"
                onClick={toggleAdminSidebar}
                className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Open Management Navigation Menu"
                aria-label="Open sidebar modules"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-2 pb-4 space-y-1 shadow-xl">
          <div className="py-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            Signed in as: <strong className="text-navy-900 dark:text-white">{userName}</strong> ({userRole})
          </div>
          {!isManagement ? (
            <>
              <Link
                href="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                href="/staff/log"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Submit Daily Log
              </Link>
              <Link
                href="/staff/fuel"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Record Fuel
              </Link>
              <Link
                href="/staff/history"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                My History
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  toggleAdminSidebar();
                }}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-navy-900 text-white dark:bg-blue-600 shadow-xs mb-2"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Open Full Modules Sidebar</span>
                </div>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">All Modules</span>
              </button>

              <Link
                href="/management"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                href="/management/approvals"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Registration Approvals
              </Link>
              <Link
                href="/management/vehicles"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Vehicles Directory
              </Link>
              <Link
                href="/management/anomalies"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Anomaly Review Queue
              </Link>
            </>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/login"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
