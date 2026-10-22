'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  Truck,
  CreditCard,
  FileSpreadsheet,
  Fuel,
  Image as ImageIcon,
  MapPin,
  AlertTriangle,
  History,
  FileDown,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ManagementSidebar() {
  const pathname = usePathname();

  const menuSections = [
    {
      title: 'Operations',
      items: [
        { href: '/management', label: 'Master Dashboard', icon: LayoutDashboard },
        { href: '/management/approvals', label: 'Registration Queue', icon: CheckCircle2 },
        { href: '/management/logs', label: 'Daily Vehicle Logs', icon: FileSpreadsheet },
        { href: '/management/fuel', label: 'Fuel Transactions', icon: Fuel },
      ],
    },
    {
      title: 'Fleet Assets',
      items: [
        { href: '/management/vehicles', label: 'Vehicles Directory', icon: Truck },
        { href: '/management/users', label: 'Staff & Drivers', icon: Users },
        { href: '/management/tom-cards', label: 'TOM Cards', icon: CreditCard },
      ],
    },
    {
      title: 'Compliance & Audits',
      items: [
        { href: '/management/anomalies', label: 'Anomaly Alerts', icon: AlertTriangle },
        { href: '/management/evidence', label: 'Evidence Gallery', icon: ImageIcon },
        { href: '/management/map', label: 'Fleet GPS Map', icon: MapPin },
        { href: '/management/audit', label: 'Audit Trail', icon: History },
        { href: '/management/reports', label: 'Reports & Export', icon: FileDown },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col border-r border-slate-800 shrink-0">
      <div className="p-4 flex-1 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-navy-800 text-white font-semibold'
                        : 'hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
