import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vlms_store.json');

const DEFAULT_OFFICES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Head Office',
    address: 'Corporate Headquarters, Victoria Island, Lagos State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Lagos Branch',
    address: 'Ikeja Commercial District, Lagos State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'South West Branch',
    address: 'Ibadan Zonal Office, Oyo State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'South South Branch',
    address: 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'South East Branch',
    address: 'Enugu Regional Center, Enugu State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'North Central Branch',
    address: 'Central Business District, Abuja FCT, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'North West Branch',
    address: 'Kano Commercial Hub, Kano State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    name: 'North East Branch',
    address: 'Maiduguri Office, Borno State, Nigeria',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

function readServerStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial = {
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
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading server store:', err);
    return null;
  }
}

function writeServerStore(data: Record<string, unknown>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing server store:', err);
    return false;
  }
}

export async function GET() {
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
