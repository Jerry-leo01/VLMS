'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  Car,
  CreditCard,
  FileSpreadsheet,
  Fuel,
  Image as ImageIcon,
  MapPin,
  AlertTriangle,
  History,
  FileDown,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const OPEN_SIDEBAR_EVENT = 'vlms:open-admin-sidebar';
export const CLOSE_SIDEBAR_EVENT = 'vlms:close-admin-sidebar';

export function toggleAdminSidebar() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_SIDEBAR_EVENT));
  }
}

export function ManagementSidebar() {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setMobileDrawerOpen(true);
    const handleClose = () => setMobileDrawerOpen(false);

    window.addEventListener(OPEN_SIDEBAR_EVENT, handleOpen);
    window.addEventListener(CLOSE_SIDEBAR_EVENT, handleClose);
    return () => {
      window.removeEventListener(OPEN_SIDEBAR_EVENT, handleOpen);
      window.removeEventListener(CLOSE_SIDEBAR_EVENT, handleClose);
    };
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const menuSections = [
    {
      title: 'Operations',
      items: [
        { href: '/management', label: 'Master Dashboard', icon: LayoutDashboard, isPrimary: true },
        { href: '/management/approvals', label: 'Registration Queue', icon: CheckCircle2, isPrimary: true },
        { href: '/management/logs', label: 'Daily Vehicle Logs', icon: FileSpreadsheet, isPrimary: false },
        { href: '/management/fuel', label: 'Fuel Transactions', icon: Fuel, isPrimary: false },
      ],
    },
    {
      title: 'Fleet Assets',
      items: [
        { href: '/management/vehicles', label: 'Vehicles Directory', icon: Car, isPrimary: true },
        { href: '/management/users', label: 'Fleet Staff', icon: Users, isPrimary: false },
        { href: '/management/tom-cards', label: 'TOM Cards', icon: CreditCard, isPrimary: false },
      ],
    },
    {
      title: 'Compliance & Audits',
      items: [
        { href: '/management/anomalies', label: 'Anomaly Alerts', icon: AlertTriangle, isPrimary: true },
        { href: '/management/evidence', label: 'Evidence Gallery', icon: ImageIcon, isPrimary: false },
        { href: '/management/map', label: 'Fleet GPS Map', icon: MapPin, isPrimary: false },
        { href: '/management/audit', label: 'Audit Trail', icon: History, isPrimary: false },
        { href: '/management/reports', label: 'Reports & Export', icon: FileDown, isPrimary: false },
      ],
    },
  ];

  const renderNavLinks = () => (
    <div className="space-y-6">
      {menuSections.map((section) => (
        <div key={section.title}>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {section.title}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/management'
                  ? pathname === '/management'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-navy-800 text-white font-bold shadow-xs dark:bg-slate-800 dark:text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </div>
                  {item.isPrimary && (
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Primary
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 flex-1">{renderNavLinks()}</div>
      </aside>

      {/* Mobile Off-Canvas Drawer (Shown when mobile user taps Menu / All Links) */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 dark:bg-slate-950 text-slate-300 h-full flex flex-col shadow-2xl z-10 border-r border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Management Menu</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    All System Modules
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                aria-label="Close sidebar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list with scroll */}
            <div className="p-4 flex-1 overflow-y-auto space-y-6 pb-20">
              {renderNavLinks()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
