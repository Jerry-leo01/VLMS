'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckCircle2, Car, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ManagementBottomNav() {
  const pathname = usePathname();

  // Exactly four primary navigation items for Admin / Management mobile view
  const primaryNavItems = [
    { href: '/management', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/management/approvals', label: 'Approvals', icon: CheckCircle2 },
    { href: '/management/vehicles', label: 'Vehicles', icon: Car },
    { href: '/management/anomalies', label: 'Anomalies', icon: AlertTriangle },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg px-2 py-1.5 flex justify-around items-center transition-colors"
      aria-label="Management mobile navigation"
    >
      {primaryNavItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/management'
            ? pathname === '/management'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[11px] font-semibold transition-all',
              isActive
                ? 'text-navy-900 dark:text-blue-400 font-bold bg-navy-50/80 dark:bg-slate-800/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 mb-0.5 transition-transform',
                isActive
                  ? 'text-navy-900 dark:text-blue-400 stroke-[2.5] scale-110'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            />
            <span className="truncate max-w-[70px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
