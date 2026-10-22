'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, Fuel, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/staff', label: 'Home', icon: Home },
    { href: '/staff/log', label: 'Daily Log', icon: Camera },
    { href: '/staff/fuel', label: 'Fuel', icon: Fuel },
    { href: '/staff/history', label: 'History', icon: Clock },
    { href: '/staff/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-2 py-1 flex justify-around items-center">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors',
              isActive ? 'text-navy-900 font-bold' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-navy-900 stroke-[2.5]' : 'text-slate-500')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
