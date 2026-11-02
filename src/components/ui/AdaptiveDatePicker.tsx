'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  DatePreset,
  DateRangeSelection,
  getPresetDateRange,
  shiftDateRange,
  formatDynamicRangeLabel,
  isValidDateRange,
  getMonthCalendarDays,
} from '@/lib/date-utils';
import { format, parseISO, isValid, isBefore, isAfter, isSameDay } from 'date-fns';

export interface AdaptiveDatePickerProps {
  value?: DateRangeSelection;
  onChange: (selection: DateRangeSelection) => void;
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

const PRESET_ITEMS: { id: DatePreset; label: string; badge?: string; isLive?: boolean }[] = [
  { id: 'all', label: 'All Time', badge: 'Preset' },
  { id: 'today', label: 'Today', isLive: true },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
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
  const [viewMode, setViewMode] = useState<'presets' | 'calendar'>('presets');

  // Active committed selection
  const currentSelection = value || getPresetDateRange('all');

  // "All day" mode toggle
  const [allDay, setAllDay] = useState(true);

  // Interactive calendar draft state
  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    if (currentSelection.startDate) {
      const parsed = parseISO(currentSelection.startDate);
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  });
  const [draftStart, setDraftStart] = useState<Date | null>(() => {
    if (currentSelection.startDate) {
      const parsed = parseISO(currentSelection.startDate);
      if (isValid(parsed)) return parsed;
    }
    return null;
  });
  const [draftEnd, setDraftEnd] = useState<Date | null>(() => {
    if (currentSelection.endDate) {
      const parsed = parseISO(currentSelection.endDate);
      if (isValid(parsed)) return parsed;
    }
    return null;
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Popover positioning
  const triggerContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // Client hydration & responsive viewport listener
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync draft calendar state when value changes or popover opens
  useEffect(() => {
    if (currentSelection.startDate) {
      const s = parseISO(currentSelection.startDate);
      if (isValid(s)) {
        setDraftStart(s);
        setDisplayMonth(s);
      }
    } else {
      setDraftStart(null);
    }

    if (currentSelection.endDate) {
      const e = parseISO(currentSelection.endDate);
      if (isValid(e)) setDraftEnd(e);
    } else {
      setDraftEnd(null);
    }
  }, [value, isOpen]);

  // Viewport-aware popup positioning
  const updatePosition = () => {
    if (!triggerContainerRef.current) return;
    const rect = triggerContainerRef.current.getBoundingClientRect();
    const popoverWidth = viewMode === 'calendar' ? 340 : 320;
    const padding = 16;

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;

    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setPopoverCoords({
      top: rect.bottom + window.scrollY + 6,
      left: left + window.scrollX,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    setViewMode('presets');
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setViewMode('presets');
    setHoveredDate(null);
  };

  // Click outside and escape dismissal
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerContainerRef.current &&
        !triggerContainerRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, isMobile, viewMode]);

  // Inline Period Shifting: Step Backward
  const handleShiftPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || currentSelection.preset === 'all') return;
    const shifted = shiftDateRange(currentSelection, 'prev');
    onChange(shifted);
  };

  // Inline Period Shifting: Step Forward
  const handleShiftNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || currentSelection.preset === 'all') return;
    const shifted = shiftDateRange(currentSelection, 'next');
    onChange(shifted);
  };

  // Preset Selection
  const handleSelectPreset = (preset: DatePreset) => {
    const range = getPresetDateRange(preset);
    onChange(range);
    handleClose();
  };

  // Interactive Calendar Date Click
  const handleDateClick = (clickedDate: Date) => {
    if (!draftStart || (draftStart && draftEnd)) {
      // Starting new selection
      setDraftStart(clickedDate);
      setDraftEnd(null);
    } else {
      // Second click: completing range
      if (isBefore(clickedDate, draftStart)) {
        setDraftEnd(draftStart);
        setDraftStart(clickedDate);
      } else {
        setDraftEnd(clickedDate);
      }
    }
  };

  // Apply Calendar Range
  const handleApplyCalendarRange = () => {
    if (!draftStart) return;
    const sStr = format(draftStart, 'yyyy-MM-dd');
    const eStr = draftEnd ? format(draftEnd, 'yyyy-MM-dd') : sStr;
    const range = getPresetDateRange('custom', sStr, eStr);
    onChange(range);
    handleClose();
  };

  // Clear Calendar Draft
  const handleClearCalendarDraft = () => {
    setDraftStart(null);
    setDraftEnd(null);
    setHoveredDate(null);
  };

  // Reset to All Time
  const handleResetToAllTime = () => {
    const range = getPresetDateRange('all');
    onChange(range);
    handleClose();
  };

  // Calendar Days computation for active displayMonth
  const calendarDays = getMonthCalendarDays(displayMonth);

  const buttonLabel = formatDynamicRangeLabel(currentSelection);
  const isShiftDisabled = currentSelection.preset === 'all';
  const isFiltered = currentSelection.preset !== 'all';

  // Render Popover Content (Presets View or Calendar View)
  const renderPopoverContent = () => (
    <div
      ref={dropdownRef}
      style={
        isMobile
          ? undefined
          : {
              position: 'absolute',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              width: viewMode === 'calendar' ? '340px' : '310px',
            }
      }
      className={
        isMobile
          ? 'relative z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200'
          : 'z-[70] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150'
      }
    >
      {isMobile && <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1" />}

      {viewMode === 'presets' ? (
        /* ================= VIEW 1: PRESETS VIEW ================= */
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Range Presets
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetToAllTime}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Preset Buttons List */}
          <div className="space-y-1">
            {PRESET_ITEMS.map((item) => {
              const isSelected = currentSelection.preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPreset(item.id)}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.isLive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    )}
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}

            {/* Custom Range Action */}
            <button
              type="button"
              onClick={() => {
                setViewMode('calendar');
                setTimeout(updatePosition, 10);
              }}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                currentSelection.preset === 'custom'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <span>Custom range...</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Footer Option: All Day Toggle */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="text-[11px] font-medium">All day</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      ) : (
        /* ================= VIEW 2: CUSTOM RANGE CALENDAR ================= */
        <div className="space-y-3.5">
          {/* Back & Title Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('presets');
                setTimeout(updatePosition, 10);
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Range Presets
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Custom Range</span>
          </div>

          {/* Live Range Preview Card */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Selected Range Preview
              </span>
              {(draftStart || draftEnd) && (
                <button
                  type="button"
                  onClick={handleClearCalendarDraft}
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Clear dates"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] truncate flex-1 text-center">
                {draftStart ? format(draftStart, 'MMM d, yyyy') : 'Start date'}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] truncate flex-1 text-center">
                {draftEnd ? format(draftEnd, 'MMM d, yyyy') : draftStart ? 'End date' : 'End date'}
              </span>
            </div>
          </div>

          {/* Month Navigation Header */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {format(displayMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* 7-Column Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs">
            {calendarDays.map((cell) => {
              const isStart = draftStart && isSameDay(cell.date, draftStart);
              const isEnd = draftEnd && isSameDay(cell.date, draftEnd);

              // Check if date falls inside the selected/hovered range
              const effectiveEnd = draftEnd || (draftStart && hoveredDate ? hoveredDate : null);
              const inRange =
                draftStart &&
                effectiveEnd &&
                (isAfter(cell.date, draftStart) || isSameDay(cell.date, draftStart)) &&
                (isBefore(cell.date, effectiveEnd) || isSameDay(cell.date, effectiveEnd));

              return (
                <div
                  key={cell.dateStr}
                  className={`relative py-0.5 ${
                    inRange ? 'bg-blue-50 dark:bg-blue-950/40 rounded-none' : ''
                  } ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleDateClick(cell.date)}
                    onMouseEnter={() => {
                      if (draftStart && !draftEnd) setHoveredDate(cell.date);
                    }}
                    className={`w-7 h-7 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                      isStart || isEnd
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'text-slate-300 dark:text-slate-600'
                    } ${cell.isToday && !isStart && !isEnd ? 'border border-blue-500 font-bold' : ''}`}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button
              type="button"
              disabled={!draftStart}
              onClick={handleApplyCalendarRange}
              className="flex-1 py-2 px-3 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span>Apply Range</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="py-2 px-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={triggerContainerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Segmented Pill Trigger Container */}
      <div
        className={`inline-flex items-center rounded-xl border shadow-2xs transition-all ${
          isFiltered
            ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Step Back Arrow (<) */}
        <button
          type="button"
          disabled={disabled || isShiftDisabled}
          onClick={handleShiftPrev}
          title="Previous period"
          className="px-2 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-xl border-r border-slate-200 dark:border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Center Pill Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              handleClose();
            } else {
              handleOpen();
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
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

        {/* Step Forward Arrow (>) */}
        <button
          type="button"
          disabled={disabled || isShiftDisabled}
          onClick={handleShiftNext}
          title="Next period"
          className="px-2 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-xl border-l border-slate-200 dark:border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Portal Popover / Bottom Sheet */}
      {mounted &&
        isOpen &&
        createPortal(
          isMobile ? (
            <div className="fixed inset-0 z-[70] flex flex-col justify-end">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={handleClose}
              />
              {renderPopoverContent()}
            </div>
          ) : (
            renderPopoverContent()
          ),
          document.body
        )}
    </div>
  );
}
