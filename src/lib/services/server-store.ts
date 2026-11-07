import fs from 'fs';
import path from 'path';
import os from 'os';
import { getBaselineStore, DEFAULT_OFFICES } from './baseline-store';

const PRIMARY_DATA_DIR = path.join(process.cwd(), '.data');
const PRIMARY_DATA_FILE = path.join(PRIMARY_DATA_DIR, 'vlms_store.json');
const FALLBACK_DATA_DIR = os.tmpdir();
const FALLBACK_DATA_FILE = path.join(FALLBACK_DATA_DIR, 'vlms_store.json');

let resolvedStoreFile: string | null = null;

/**
 * Dynamically resolves a guaranteed-writable file path for persisting data.
 * In local and standard Node.js environments, uses .data/vlms_store.json.
 * In serverless environments with a read-only filesystem (such as Vercel),
 * safely falls back to os.tmpdir()/vlms_store.json.
 */
export function resolveStoreFilePath(): string {
  if (resolvedStoreFile) return resolvedStoreFile;

  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    // Test writeability
    const testFile = path.join(PRIMARY_DATA_DIR, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok', 'utf-8');
    fs.unlinkSync(testFile);
    resolvedStoreFile = PRIMARY_DATA_FILE;
    return resolvedStoreFile;
  } catch {
    // Read-only filesystem detected (e.g. Vercel Lambda /var/task)
    resolvedStoreFile = FALLBACK_DATA_FILE;
    return resolvedStoreFile;
  }
}

export function mergeWithBaseline(current: any) {
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
    evidenceFiles: current?.evidenceFiles || [],
    dailyLogs: current?.dailyLogs || [],
    fuelTransactions: current?.fuelTransactions || [],
    anomalyAlerts: current?.anomalyAlerts || [],
    auditEvents: current?.auditEvents || [],
    resetTokens: current?.resetTokens || [],
  };
}

/**
 * Reads the active server-side store, merging with baseline physical assets.
 */
export function getServerStore(): any {
  const targetFile = resolveStoreFilePath();
  try {
    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, 'utf-8');
      const parsed = JSON.parse(raw);
      return mergeWithBaseline(parsed);
    }

    // If using fallback in /tmp and primary exists read-only, seed from primary
    if (targetFile !== PRIMARY_DATA_FILE && fs.existsSync(PRIMARY_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(PRIMARY_DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const enriched = mergeWithBaseline(parsed);
        saveServerStore(enriched);
        return enriched;
      } catch {
        // Fallback to baseline
      }
    }

    const initial = getBaselineStore();
    saveServerStore(initial);
    return initial;
  } catch {
    return getBaselineStore();
  }
}

/**
 * Persists the server-side store atomically to the writable target file.
 */
export function saveServerStore(data: Record<string, unknown>): boolean {
  const targetFile = resolveStoreFilePath();
  try {
    const parentDir = path.dirname(targetFile);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const enriched = mergeWithBaseline(data);
    const tempFile = `${targetFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(enriched, null, 2), 'utf-8');
    fs.renameSync(tempFile, targetFile);
    return true;
  } catch {
    return false;
  }
}
