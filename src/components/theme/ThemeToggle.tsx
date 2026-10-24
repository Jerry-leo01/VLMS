'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs',
        className
      )}
      role="group"
      aria-label="Theme switcher"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Light theme"
        className={cn(
          'p-1.5 rounded-full text-xs transition-all flex items-center justify-center',
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        )}
        aria-pressed={theme === 'light'}
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="sr-only">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark theme"
        className={cn(
          'p-1.5 rounded-full text-xs transition-all flex items-center justify-center',
          theme === 'dark'
            ? 'bg-navy-900 text-blue-400 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        )}
        aria-pressed={theme === 'dark'}
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="sr-only">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        title="System theme"
        className={cn(
          'p-1.5 rounded-full text-xs transition-all flex items-center justify-center',
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-navy-900 dark:text-slate-100 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
        )}
        aria-pressed={theme === 'system'}
      >
        <Laptop className="w-3.5 h-3.5" />
        <span className="sr-only">System</span>
      </button>
    </div>
  );
}
