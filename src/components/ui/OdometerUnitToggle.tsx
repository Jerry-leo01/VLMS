'use client';

import React from 'react';
import { OdometerUnit } from '@/types/database';

export interface OdometerUnitToggleProps {
  unit: OdometerUnit;
  onChange: (newUnit: OdometerUnit) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function OdometerUnitToggle({
  unit,
  onChange,
  disabled = false,
  label = 'Dashboard Measurement Unit',
  className = '',
}: OdometerUnitToggleProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
          {label}
        </span>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('km')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
            unit === 'km'
              ? 'bg-navy-900 dark:bg-blue-600 text-white border-navy-900 dark:border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Kilometers (KM)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('mi')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
            unit === 'mi'
              ? 'bg-navy-900 dark:bg-blue-600 text-white border-navy-900 dark:border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Miles (MI)
        </button>
      </div>
    </div>
  );
}
