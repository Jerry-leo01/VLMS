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
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { VLMSService } from '@/lib/services/vlms-service';

export const OPEN_SIDEBAR_EVENT = 'vlms:open-admin-sidebar';
export const CLOSE_SIDEBAR_EVENT = 'vlms:close-admin-sidebar';

export function toggleAdminSidebar() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_SIDEBAR_EVENT));
  }
}

export function closeAdminSidebar() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOSE_SIDEBAR_EVENT));
  }
}

export function ManagementSidebar() {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminRoleLabel, setAdminRoleLabel] = useState('Administrator');

  useEffect(() => {
    VLMSService.getCurrentAdminProfile().then((prof) => {
      if (prof) {
        setAdminName(prof.full_name);
        if (prof.roles && prof.roles.length > 0) {
          setAdminRoleLabel(prof.roles[0].replace('_', ' '));
        }
      }
    });
  }, []);

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

  // Enhanced Information Architecture & Logical Grouping
  const menuSections = [
    {
      title: 'Overview & Queues',
      items: [
        { href: '/management', label: 'Master Dashboard', icon: LayoutDashboard },
        { href: '/management/approvals', label: 'Registration Queue', icon: CheckCircle2 },
        { href: '/management/anomalies', label: 'Anomaly Review', icon: AlertTriangle },
      ],
    },
    {
      title: 'Fleet Operations',
      items: [
        { href: '/management/logs', label: 'Daily Vehicle Logs', icon: FileSpreadsheet },
        { href: '/management/fuel', label: 'Fuel Transactions', icon: Fuel },
        { href: '/management/map', label: 'Fleet GPS Map', icon: MapPin },
      ],
    },
    {
      title: 'Fleet Assets',
      items: [
        { href: '/management/vehicles', label: 'Vehicles Directory', icon: Car },
        { href: '/management/users', label: 'Fleet Staff', icon: Users },
        { href: '/management/tom-cards', label: 'TOM Cards', icon: CreditCard },
      ],
    },
    {
      title: 'Governance & Audits',
      items: [
        { href: '/management/audit', label: 'Immutable Audit Trail', icon: History },
        { href: '/management/evidence', label: 'Evidence Gallery', icon: ImageIcon },
        { href: '/management/reports', label: 'Reports & Export', icon: FileDown },
      ],
    },
  ];

  const renderNavLinks = () => (
    <div className="space-y-5">
      {menuSections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {section.title}
          </div>
          <div className="space-y-0.5">
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
                    'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    isActive
                      ? 'bg-blue-600/15 text-white font-semibold border-l-2 border-blue-500 shadow-xs dark:bg-blue-500/20 dark:text-blue-300'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive
                          ? 'text-blue-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
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
      {/* Desktop Sidebar (strictly hidden on mobile, visible on lg+) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 h-[calc(100vh-4rem)] sticky top-16 flex-col border-r border-slate-800 shrink-0 transition-colors">
        {/* Top-aligned scrollable nav container */}
        <div className="p-3.5 flex-1 overflow-y-auto space-y-5 scrollbar-thin">
          {renderNavLinks()}
        </div>

        {/* Bottom Profile / Quick Info Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-navy-800 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
              {adminName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-white font-semibold truncate block text-[11px]">
                {adminName}
              </span>
              <span className="text-[10px] text-slate-400 block truncate capitalize">{adminRoleLabel}</span>
            </div>
          </div>
          <Link
            href="/login"
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Mobile Off-Canvas Drawer (Only opens when mobile user taps Menu) */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 dark:bg-slate-950 text-slate-300 h-full flex flex-col shadow-2xl z-10 border-r border-slate-800 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">VLMS Operations</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Fleet Management Menu
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top-aligned scrollable nav list */}
            <div className="p-3.5 flex-1 overflow-y-auto space-y-5">
              {renderNavLinks()}
            </div>

            {/* Drawer Footer with Theme Toggle and Sign Out */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Theme Mode:</span>
                <ThemeToggle />
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold text-white block text-[11px]">Administrator</span>
                  <span className="text-[10px] text-slate-400">Fleet Operations</span>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
