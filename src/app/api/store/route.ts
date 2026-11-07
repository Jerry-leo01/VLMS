import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import { getServerStore, saveServerStore, mergeWithBaseline } from '@/lib/services/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
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

      // Normalize fuel transactions from Supabase into application model
      const normalizedFuelTxs = (fuelTxs || []).map((f: any) => ({
        id: f.id,
        vehicle_id: f.vehicle_id,
        user_id: f.user_id,
        daily_log_id: f.daily_log_id || null,
        payment_method: f.payment_method || (f.tom_card_id ? 'tom_card' : 'personal_fund'),
        tom_card_id: f.tom_card_id || null,
        vendor_name: f.vendor_name || 'Fuel Station',
        odometer_km: f.current_odometer_km ?? f.odometer_km ?? 0,
        source_unit: f.source_unit || 'km',
        source_reading: f.source_reading !== undefined && f.source_reading !== null ? Number(f.source_reading) : (f.current_odometer_km ?? f.odometer_km ?? 0),
        amount: Number(f.total_cost ?? f.amount ?? 0),
        currency: 'NGN',
        quantity_litres: Number(f.litres ?? f.quantity_litres ?? 0),
        purchased_at: f.transaction_date ?? f.purchased_at ?? f.created_at,
        submitted_at: f.created_at ?? f.submitted_at ?? new Date().toISOString(),
        status: (f.status === 'confirmed' ? 'verified' : f.status) || 'submitted',
        idempotency_key: f.idempotency_key || f.id,
      }));

      // Normalize daily logs from Supabase into application model
      const normalizedDailyLogs = (dailyLogs || []).map((l: any) => ({
        id: l.id,
        vehicle_id: l.vehicle_id,
        user_id: l.user_id,
        assignment_id: l.assignment_id || null,
        business_date: l.log_date ?? l.business_date,
        date: l.log_date ?? l.date,
        odometer_km: l.closing_odometer_km ?? l.odometer_km ?? 0,
        closing_odometer_km: l.closing_odometer_km ?? l.odometer_km ?? 0,
        distance_travelled_km: l.distance_travelled_km ?? 0,
        mileage_difference_km: l.distance_travelled_km ?? 0,
        comment: l.notes ?? l.comment ?? null,
        status: l.status || 'submitted',
        submitted_at: l.created_at ?? l.submitted_at ?? new Date().toISOString(),
        created_at: l.created_at ?? new Date().toISOString(),
      }));

      const localStore = getServerStore();
      const cloudStore = {
        offices: offices && offices.length > 0 ? offices : DEFAULT_OFFICES,
        profiles: profiles || [],
        userRoles: formattedUserRoles,
        vehicles: vehicles || [],
        assignments: assignments || [],
        tomCards: tomCards || [],
        evidenceFiles: localStore?.evidenceFiles || [],
        dailyLogs: normalizedDailyLogs,
        fuelTransactions: normalizedFuelTxs,
        anomalyAlerts: anomalies || [],
        auditEvents: auditEvents || [],
        resetTokens: localStore?.resetTokens || [],
      };

      return NextResponse.json(
        { data: mergeWithBaseline(cloudStore) },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' } }
      );
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

    const supabase = getSupabaseAdmin();

    // If Supabase is available, sync incoming offline transactions directly to Supabase
    if (supabase) {
      if (Array.isArray(payload.fuelTransactions) && payload.fuelTransactions.length > 0) {
        for (const f of payload.fuelTransactions) {
          if (f.vehicle_id && f.user_id && isValidUuid(f.vehicle_id) && isValidUuid(f.user_id)) {
            const txId = isValidUuid(f.id) ? f.id : crypto.randomUUID();
            const txDate = f.purchased_at ? new Date(f.purchased_at).toISOString() : new Date().toISOString();
            const litres = Number(f.quantity_litres ?? f.litres ?? 0);
            const totalCost = Number(f.amount ?? f.total_cost ?? 0);
            const costPerLitre = litres > 0 ? Math.round((totalCost / litres) * 100) / 100 : 0;
            const odoKm = Number(f.odometer_km ?? f.current_odometer_km ?? 0);

            try {
              await supabase.from('fuel_transactions').upsert(
                {
                  id: txId,
                  vehicle_id: f.vehicle_id,
                  user_id: f.user_id,
                  tom_card_id: isValidUuid(f.tom_card_id) ? f.tom_card_id : null,
                  transaction_date: txDate,
                  vendor_name: f.vendor_name || 'Fuel Station',
                  litres,
                  cost_per_litre: costPerLitre,
                  total_cost: totalCost,
                  current_odometer_km: odoKm,
                  status: 'confirmed',
                  created_at: txDate,
                },
                { onConflict: 'id' }
              );
            } catch {
              // Non-blocking upsert
            }
          }
        }
      }

      if (Array.isArray(payload.dailyLogs) && payload.dailyLogs.length > 0) {
        for (const l of payload.dailyLogs) {
          if (l.vehicle_id && l.user_id && isValidUuid(l.vehicle_id) && isValidUuid(l.user_id)) {
            const logId = isValidUuid(l.id) ? l.id : crypto.randomUUID();
            const logDate = l.business_date || l.date || new Date().toISOString().split('T')[0];
            const odo = Number(l.closing_odometer_km ?? l.odometer_km ?? 0);
            const dist = Number(l.distance_travelled_km ?? l.mileage_difference_km ?? 0);

            try {
              await supabase.from('daily_logs').upsert(
                {
                  id: logId,
                  vehicle_id: l.vehicle_id,
                  user_id: l.user_id,
                  assignment_id: isValidUuid(l.assignment_id) ? l.assignment_id : null,
                  log_date: logDate,
                  closing_odometer_km: odo,
                  distance_travelled_km: dist,
                  notes: l.comment || l.notes || null,
                  status: 'submitted',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'vehicle_id, log_date' }
              );
            } catch {
              // Non-blocking upsert
            }
          }
        }
      }
    }

    const current = getServerStore() || {
      offices: DEFAULT_OFFICES,
      profiles: [],
      userRoles: [],
      vehicles: [],
      assignments: [],
      tomCards: [],
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
          const mergedItem = { ...(prev || {}), ...item };
          if (!mergedItem.data_url && prev?.data_url) {
            mergedItem.data_url = prev.data_url;
          }
          map.set(item[key], mergedItem);
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
