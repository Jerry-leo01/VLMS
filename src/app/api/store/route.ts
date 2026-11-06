import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getBaselineStore, DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vlms_store.json');

function mergeWithBaseline(current: any) {
  const baseline = getBaselineStore();
  const mergeById = (existingArr: any[] = [], baselineArr: any[] = [], key: string = 'id') => {
    const map = new Map();
    for (const item of baselineArr) {
      if (item && item[key]) map.set(item[key], item);
    }
    for (const item of existingArr) {
      if (item && item[key]) {
        const prev = map.get(item[key]);
        map.set(item[key], { ...(prev || {}), ...item });
      }
    }
    return Array.from(map.values());
  };

  return {
    ...baseline,
    ...current,
    offices: current?.offices && current.offices.length > 0 ? current.offices : baseline.offices,
    profiles: mergeById(current?.profiles, baseline.profiles),
    userRoles: mergeById(current?.userRoles, baseline.userRoles, 'userId'),
    vehicles: mergeById(current?.vehicles, baseline.vehicles),
    assignments: mergeById(current?.assignments, baseline.assignments),
    tomCards: mergeById(current?.tomCards, baseline.tomCards),
    registrationRequests: mergeById(current?.registrationRequests, baseline.registrationRequests),
  };
}

function readServerStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial = getBaselineStore();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const enriched = mergeWithBaseline(parsed);
    return enriched;
  } catch {
    return getBaselineStore();
  }
}

function writeServerStore(data: Record<string, unknown>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const enriched = mergeWithBaseline(data);
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(enriched, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch {
    return false;
  }
}

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
        { data: regRequests },
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
        supabase.from('registration_requests').select('*'),
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
        registrationRequests: regRequests || [],
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
  const store = readServerStore();
  if (!store) {
    return NextResponse.json({ error: 'Failed to read server store' }, { status: 500 });
  }
  return NextResponse.json({ data: store });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const current = readServerStore() || {
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

    writeServerStore(merged);
    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    console.error('Error updating server store:', err);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
