'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Check, X, ArrowRight, RotateCcw } from 'lucide-react';
import {
  DatePreset,
  DateRangeSelection,
  getPresetDateRange,
  formatDateRangeLabel,
  isValidDateRange,
} from '@/lib/date-utils';

export interface AdaptiveDatePickerProps {
  value?: DateRangeSelection;
  onChange: (selection: DateRangeSelection) => void;
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

const PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'month_to_date', label: 'Month to Date' },
  { id: 'custom', label: 'Custom Range' },
];

export function AdaptiveDatePicker({
  value,
  onChange,
  className = '',
  align = 'left',
  disabled = false,
}: AdaptiveDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Default selection if value not passed
  const currentSelection = value || getPresetDateRange('all');

  // Internal custom date inputs state
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(currentSelection.preset);
  const [customStart, setCustomStart] = useState<string>(currentSelection.startDate || '');
  const [customEnd, setCustomEnd] = useState<string>(currentSelection.endDate || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Position state for desktop dropdown
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; width?: number }>({
    top: 0,
    left: 0,
  });

  // Client-side hydration flag & responsive listener
  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      setSelectedPreset(value.preset);
      setCustomStart(value.startDate || '');
      setCustomEnd(value.endDate || '');
      setValidationError(null);
    }
  }, [value]);

  // Compute popover position relative to trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 340; // width of desktop dropdown

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;

    // Viewport collision detection
    const padding = 16;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setPopoverCoords({
      top: rect.bottom + window.scrollY + 6,
      left: left + window.scrollX,
      width: popoverWidth,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setValidationError(null);
  };

  // Click outside listener for desktop popover
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, isMobile]);

  // Preset selection handler
  const handleSelectPreset = (preset: DatePreset) => {
    setSelectedPreset(preset);
    setValidationError(null);

    if (preset !== 'custom') {
      const range = getPresetDateRange(preset);
      onChange(range);
      handleClose();
    }
  };

  // Apply custom range handler
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();

    if (customStart && customEnd && !isValidDateRange(customStart, customEnd)) {
      setValidationError('Start date must be earlier than or equal to end date.');
      return;
    }

    const range = getPresetDateRange('custom', customStart, customEnd);
    onChange(range);
    handleClose();
  };

  // Quick reset to All Time
  const handleReset = () => {
    const range = getPresetDateRange('all');
    setSelectedPreset('all');
    setCustomStart('');
    setCustomEnd('');
    setValidationError(null);
    onChange(range);
    handleClose();
  };

  const buttonLabel = formatDateRangeLabel(currentSelection);
  const isFiltered = currentSelection.preset !== 'all';

  // Desktop Dropdown Content
  const renderDesktopDropdown = () => (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${popoverCoords.top}px`,
        left: `${popoverCoords.left}px`,
        width: `${popoverCoords.width}px`,
      }}
      className="z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-xs space-y-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Filter Date Range
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Preset List */}
      <div className="grid grid-cols-2 gap-1.5">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelectPreset(opt.id)}
            className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors ${
              selectedPreset === opt.id
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
          >
            <span>{opt.label}</span>
            {selectedPreset === opt.id && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
          </button>
        ))}
      </div>

      {/* Custom Inputs Panel */}
      {selectedPreset === 'custom' && (
        <form
          onSubmit={handleApplyCustom}
          className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setValidationError(null);
                }}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setValidationError(null);
                }}
                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{validationError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors"
            >
              <span>Apply Range</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="py-1.5 px-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // Mobile Bottom Sheet Content
  const renderMobileBottomSheet = () => (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Bottom Sheet Drawer */}
      <div className="relative z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1" />

        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Select Date Filter
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Filter metrics and records by time window
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
          {PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectPreset(opt.id)}
              className={`p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                selectedPreset === opt.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>{opt.label}</span>
              {selectedPreset === opt.id && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Custom Range Section */}
        {selectedPreset === 'custom' && (
          <form
            onSubmit={handleApplyCustom}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{validationError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Apply Date Filter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
          isFiltered
            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 shadow-xs'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Calendar
          className={`w-3.5 h-3.5 ${
            isFiltered ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        />
        <span className="truncate max-w-[140px] sm:max-w-[200px]">{buttonLabel}</span>
        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Portal Popover / Bottom Sheet */}
      {mounted &&
        isOpen &&
        createPortal(
          isMobile ? renderMobileBottomSheet() : renderDesktopDropdown(),
          document.body
        )}
    </div>
  );
}
