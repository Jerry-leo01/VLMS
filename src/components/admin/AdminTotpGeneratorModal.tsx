'use client';

import React, { useState, useEffect } from 'react';
import { generateAdminTotpPin } from '@/lib/security/admin-totp';
import { ShieldCheck, Clock, Copy, Check, X, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';

interface AdminTotpGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminTotpGeneratorModal({ isOpen, onClose }: AdminTotpGeneratorModalProps) {
  const [pinData, setPinData] = useState(() => generateAdminTotpPin());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Refresh immediately upon opening
    setPinData(generateAdminTotpPin());

    const interval = setInterval(() => {
      setPinData(generateAdminTotpPin());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pinData.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = Math.round((pinData.expiresInSeconds / 60) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Administrator Access Setup PIN
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ephemeral 60-second time-based authorization
            </p>
          </div>
        </div>

        {/* Display PIN Card */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 text-center space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Current Single-Use Authorization PIN
          </span>

          <div className="flex items-center justify-center gap-2">
            <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-widest text-navy-950 dark:text-blue-400 select-all">
              {pinData.pin.slice(0, 3)} {pinData.pin.slice(3, 6)}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-xs"
              title="Copy PIN to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Progress Bar & Countdown */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  pinData.expiresInSeconds <= 10
                    ? 'bg-red-500'
                    : pinData.expiresInSeconds <= 25
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Rotates in:
              </span>
              <strong
                className={`font-mono text-xs ${
                  pinData.expiresInSeconds <= 10
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {pinData.expiresInSeconds}s remaining
              </strong>
            </div>
          </div>
        </div>

        {/* Security & Usage Context */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-navy-950 dark:text-blue-300 text-[11px] uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Dual-Control Governance Protocol</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Provide this code in person or via verified out-of-band communication to the user on the <strong>Administrator Access Setup</strong> screen. Once entered, the code is immediately consumed and cannot be reused.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 bg-navy-950 hover:bg-navy-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
        >
          Done / Close
        </button>
      </div>
    </div>
  );
}
