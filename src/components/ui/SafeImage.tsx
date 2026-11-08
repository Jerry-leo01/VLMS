'use client';

import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';
import { formatOdometer } from '@/lib/utils';

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackType?: 'avatar' | 'evidence';
  initials?: string;
  evidenceId?: string;
  telemetry?: {
    odoKm?: number;
    plateNumber?: string;
  };
  containerClassName?: string;
}

export function SafeImage({
  src,
  alt = '',
  fallbackType = 'evidence',
  initials,
  evidenceId,
  telemetry,
  className = '',
  containerClassName = '',
  ...props
}: SafeImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(
    typeof src === 'string' && src ? src : null
  );
  const [hasError, setHasError] = useState(!src && !evidenceId);
  const [isLoading, setIsLoading] = useState(Boolean(src || evidenceId));

  React.useEffect(() => {
    if (typeof src === 'string' && src) {
      setResolvedSrc(src);
      setHasError(false);
      setIsLoading(true);
      return;
    }

    if (evidenceId && !src) {
      let isMounted = true;
      setIsLoading(true);
      fetch(`/api/evidence/${encodeURIComponent(evidenceId)}/url`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted) return;
          if (data?.signedUrl) {
            setResolvedSrc(data.signedUrl);
            setHasError(false);
          } else {
            setHasError(true);
          }
        })
        .catch(() => {
          if (isMounted) setHasError(true);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [src, evidenceId]);

  if (hasError || !resolvedSrc) {
    if (fallbackType === 'avatar') {
      return (
        <div
          className={`flex items-center justify-center font-bold select-none bg-gradient-to-br from-slate-700 to-slate-900 text-white border border-slate-300 dark:border-slate-700 shadow-xs ${
            containerClassName || className || 'w-10 h-10 rounded-xl text-xs'
          }`}
          role="img"
          aria-label={alt || initials || 'User Avatar'}
        >
          {initials ? (
            <span className="tracking-wider uppercase">{initials}</span>
          ) : (
            <User className="w-1/2 h-1/2 text-slate-200" />
          )}
        </div>
      );
    }

    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-3 select-none bg-slate-100 dark:bg-slate-800/80 text-slate-500 border border-slate-200 dark:border-slate-700/60 transition-colors ${containerClassName}`}
        role="img"
        aria-label={alt || 'Image Placeholder'}
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-1 text-slate-500 dark:text-slate-400">
          <ImageIcon className="w-4 h-4" />
        </div>
        {telemetry?.odoKm !== undefined && (
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
            ODO: {formatOdometer(telemetry.odoKm)}
          </span>
        )}
        {telemetry?.plateNumber && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {telemetry.plateNumber}
          </span>
        )}
        {!telemetry?.odoKm && !telemetry?.plateNumber && (
          <span className="text-[10px] font-medium text-slate-400">Photo Unavailable</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-slate-300 dark:text-slate-600">
          <ImageIcon className="w-5 h-5 animate-bounce" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc || undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        {...props}
      />
    </div>
  );
}
