'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react';

interface LocationPickerProps {
  onLocationCaptured: (data: {
    latitude: number;
    longitude: number;
    accuracyM: number;
    capturedAt: string;
  }) => void;
}

export function LocationPicker({ onLocationCaptured }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracyM: number;
    capturedAt: string;
  } | null>(null);

  const fetchLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: Math.round(position.coords.accuracy),
          capturedAt: new Date(position.timestamp).toISOString(),
        };
        setLocation(data);
        setLoading(false);
        onLocationCaptured(data);
      },
      (err) => {
        setLoading(false);
        let msg = 'Failed to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to proceed with log submission.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location position is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-navy-800" />
          <h4 className="text-sm font-semibold text-slate-900">GPS Location Verification</h4>
        </div>
        <button
          type="button"
          onClick={fetchLocation}
          disabled={loading}
          className="text-xs font-medium text-navy-800 hover:text-navy-950 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md"
        >
          <Navigation className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Locating...' : 'Refresh GPS'}
        </button>
      </div>

      {location ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Coordinates</span>
              <span className="font-mono font-medium text-slate-800">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">GPS Accuracy</span>
              <span className="font-mono font-medium text-slate-800">
                ±{location.accuracyM} metres
              </span>
            </div>
          </div>

          {/* Interactive OpenStreetMap preview iframe */}
          <div className="relative h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            <iframe
              title="Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005}%2C${location.latitude - 0.005}%2C${location.longitude + 0.005}%2C${location.latitude + 0.005}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>GPS location attached to submission</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {loading && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 animate-spin text-navy-800" />
              Acquiring high-accuracy GPS coordinates...
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
