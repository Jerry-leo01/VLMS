'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { ManagementSidebar } from '@/components/layout/ManagementSidebar';
import { VLMSService } from '@/lib/services/vlms-service';
import { DailyLog } from '@/types/database';
import { MapPin, ArrowLeft, Navigation } from 'lucide-react';

export default function FleetMapPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);

  useEffect(() => {
    async function loadData() {
      const data = await VLMSService.getAllDailyLogs();
      setLogs(data);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userRole="administrator" userName="Babajide Adeleke (Admin)" />

      <div className="flex-1 flex">
        <div className="hidden lg:block">
          <ManagementSidebar />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
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
                Geographic coordinates captured at the moment of daily odometer submission
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-4">
            <div className="h-96 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                title="Fleet Overview Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src="https://www.openstreetmap.org/export/embed.html?bbox=3.25%2C6.40%2C3.55%2C6.65&layer=mapnik&marker=6.43%2C3.42"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Displaying recent submission clusters in Lagos Corporate HQ & Regional Hubs</span>
              <span className="font-semibold text-navy-900">{logs.length} logged GPS points</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
