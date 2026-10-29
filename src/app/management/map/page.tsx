'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { ManagementBottomNav } from '@/components/layout/ManagementBottomNav';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog } from '@/types/database';
import { formatOdometer, formatDateTime } from '@/lib/utils';
import { resolveApproximateLocation } from '@/components/gps/LocationPicker';
import { MapPin, ArrowLeft, Navigation, Car, Clock, ShieldCheck, Search } from 'lucide-react';

export default function FleetMapPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await VLMSService.getAllDailyLogs();
        setLogs(data);
        const firstWithGps = data.find((l) => l.latitude !== null && l.longitude !== null);
        if (firstWithGps) {
          setSelectedLogId(firstWithGps.id);
        }
      } catch (err) {
        console.error('Failed to load fleet map logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const logsWithCoordinates = logs.filter(
    (l) => l.latitude !== null && l.latitude !== undefined && l.longitude !== null && l.longitude !== undefined
  );

  const filteredLogs = logsWithCoordinates.filter((l) => {
    const q = searchQuery.toLowerCase();
    const plate = l.vehicle?.plate_number?.toLowerCase() || '';
    const staff = l.user?.full_name?.toLowerCase() || '';
    return plate.includes(q) || staff.includes(q);
  });

  const selectedLog =
    logsWithCoordinates.find((l) => l.id === selectedLogId) || logsWithCoordinates[0] || null;

  const currentLat = selectedLog?.latitude ?? 6.4311;
  const currentLon = selectedLog?.longitude ?? 3.4244;
  const locationDesc = selectedLog
    ? selectedLog.location_name || resolveApproximateLocation(currentLat, currentLon)
    : 'Lagos Headquarters Hub';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" />

      <div className="flex-1 flex">
        <ManagementSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
            <Link
              href="/management"
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Fleet GPS Locations Map</h1>
              <p className="text-xs text-slate-500">
                Audited geographic coordinates recorded during staff daily vehicle odometer submissions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Dynamic Map */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <h2 className="text-sm font-bold text-navy-950">
                        {selectedLog?.vehicle?.plate_number ?? 'Fleet Marker'}
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">{locationDesc}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md font-semibold">
                    {currentLat.toFixed(5)}°N, {currentLon.toFixed(5)}°E
                  </span>
                </div>

                <div className="h-96 sm:h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                  <iframe
                    key={`${currentLat}-${currentLon}`}
                    title="Fleet OpenStreetMap Display"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLon - 0.008}%2C${currentLat - 0.008}%2C${currentLon + 0.008}%2C${currentLat + 0.008}&layer=mapnik&marker=${currentLat}%2C${currentLon}`}
                  />
                </div>

                {selectedLog && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Staff Member</span>
                      <strong className="text-slate-900 font-semibold">{selectedLog.user?.full_name ?? 'Staff'}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Odometer Reading</span>
                      <strong className="text-navy-950 font-mono font-bold">
                        {formatOdometer(selectedLog.canonical_reading_km ?? selectedLog.odometer_km, 'km')}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">GPS Accuracy</span>
                      <strong className="text-slate-900 font-mono">
                        ±{selectedLog.gps_accuracy_m ?? 12}m
                      </strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Timestamp</span>
                      <strong className="text-slate-900 font-semibold">
                        {formatDateTime(selectedLog.submitted_at)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submitted Location Points Sidebar */}
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Logged GPS Waypoints</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {logsWithCoordinates.length} Points
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Filter by Plate or Staff
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto space-y-1">
                  {filteredLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No location logs match your query.
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const isSelected = log.id === selectedLogId;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLogId(log.id)}
                          className={`p-3 rounded-xl cursor-pointer transition-all space-y-1 text-xs border ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-medium'
                              : 'hover:bg-slate-50 border-transparent text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-navy-900">
                              {log.vehicle?.plate_number ?? 'Vehicle'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatDateTime(log.submitted_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>{log.user?.full_name ?? 'Staff'}</span>
                            <span className="font-mono font-semibold">
                              {formatOdometer(log.canonical_reading_km ?? log.odometer_km, 'km')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {log.location_name || resolveApproximateLocation(log.latitude!, log.longitude!)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ManagementBottomNav />
    </div>
  );
}
