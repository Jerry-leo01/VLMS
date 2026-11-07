import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import { getServerStore, saveServerStore, mergeWithBaseline } from '@/lib/services/server-store';

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const [
        { data: profiles },
        { data: roles },
        { data: vehicles },
        { data: assignments },
        { data: tomCards },
        { data: dailyLogs },
        { data: fuelTxs },
        { data: anomalies },
        { data: auditEvents },
        { data: offices },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('vehicle_assignments').select('*'),
        supabase.from('tom_cards').select('*'),
        supabase.from('daily_logs').select('*'),
        supabase.from('fuel_transactions').select('*'),
        supabase.from('anomaly_alerts').select('*'),
        supabase.from('audit_events').select('*'),
        supabase.from('offices').select('*'),
      ]);

      const formattedUserRoles = (roles || []).map((r: any) => ({
        userId: r.user_id,
        role: r.role,
      }));

      const cloudStore = {
        offices: offices && offices.length > 0 ? offices : DEFAULT_OFFICES,
        profiles: profiles || [],
        userRoles: formattedUserRoles,
        vehicles: vehicles || [],
        assignments: assignments || [],
        tomCards: tomCards || [],
        evidenceFiles: [],
        dailyLogs: dailyLogs || [],
        fuelTransactions: fuelTxs || [],
        anomalyAlerts: anomalies || [],
        auditEvents: auditEvents || [],
        resetTokens: [],
      };

      return NextResponse.json({ data: mergeWithBaseline(cloudStore) });
    } catch (err) {
      console.error('Failed to query Supabase store:', err);
    }
  }

  // Fallback to local server store
  const store = getServerStore();
  if (!store) {
    return NextResponse.json({ error: 'Failed to read server store' }, { status: 500 });
  }
  return NextResponse.json(
    { data: store },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const current = getServerStore() || {
      offices: DEFAULT_OFFICES,
      profiles: [],
      userRoles: [],
      vehicles: [],
      assignments: [],
      tomCards: [],
      registrationRequests: [],
      evidenceFiles: [],
      dailyLogs: [],
      fuelTransactions: [],
      anomalyAlerts: [],
      auditEvents: [],
      resetTokens: [],
    };

    // Merge incoming array collections by unique id
    const mergeCollection = (existingArr: any[] = [], incomingArr: any[] = [], key: string = 'id') => {
      const map = new Map();
      for (const item of existingArr) {
        if (item && item[key]) map.set(item[key], item);
      }
      for (const item of incomingArr) {
        if (item && item[key]) {
          const prev = map.get(item[key]);
          map.set(item[key], { ...(prev || {}), ...item });
        }
      }
      return Array.from(map.values());
    };

    const merged = {
      ...current,
      profiles: mergeCollection(current.profiles, payload.profiles),
      userRoles: mergeCollection(current.userRoles, payload.userRoles, 'userId'),
      vehicles: mergeCollection(current.vehicles, payload.vehicles),
      assignments: mergeCollection(current.assignments, payload.assignments),
      tomCards: mergeCollection(current.tomCards, payload.tomCards),
      registrationRequests: mergeCollection(current.registrationRequests, payload.registrationRequests),
      evidenceFiles: mergeCollection(current.evidenceFiles, payload.evidenceFiles),
      dailyLogs: mergeCollection(current.dailyLogs, payload.dailyLogs),
      fuelTransactions: mergeCollection(current.fuelTransactions, payload.fuelTransactions),
      anomalyAlerts: mergeCollection(current.anomalyAlerts, payload.anomalyAlerts),
      auditEvents: mergeCollection(current.auditEvents, payload.auditEvents),
      resetTokens: mergeCollection(current.resetTokens, payload.resetTokens),
    };

    saveServerStore(merged);
    return NextResponse.json(
      { success: true, data: merged },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('Error updating server store:', err);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
