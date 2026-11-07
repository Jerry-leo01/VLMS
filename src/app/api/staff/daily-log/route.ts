import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getServerStore, saveServerStore } from '@/lib/services/server-store';

function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      vehicleId,
      userId,
      assignmentId,
      logDate,
      closingOdometerKm,
      distanceTravelledKm = 0,
      notes,
    } = body;

    if (!vehicleId || !userId || closingOdometerKm === undefined) {
      return NextResponse.json(
        { error: 'vehicleId, userId, and closingOdometerKm are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const logId = isValidUuid(id) ? id : crypto.randomUUID();
    const parsedOdometer = Number(closingOdometerKm) || 0;
    const parsedDistance = Number(distanceTravelledKm) || 0;
    const todayDate = logDate || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseAdmin();

    if (supabase) {
      // 1. Insert or update daily_logs in Supabase
      const { error: logErr } = await supabase.from('daily_logs').upsert(
        {
          id: logId,
          vehicle_id: vehicleId,
          user_id: userId,
          assignment_id: isValidUuid(assignmentId) ? assignmentId : null,
          log_date: todayDate,
          closing_odometer_km: parsedOdometer,
          distance_travelled_km: parsedDistance,
          notes: notes || null,
          status: 'submitted',
          updated_at: nowIso,
        },
        { onConflict: 'vehicle_id, log_date' }
      );

      if (logErr) {
        console.error('Fatal Database Write Failure (daily_logs):', logErr);
        return NextResponse.json(
          { error: `Database persistence failed: ${logErr.message}`, code: logErr.code },
          { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }

      // 2. Insert into odometer_readings
      if (parsedOdometer > 0) {
        try {
          await supabase.from('odometer_readings').insert({
            id: crypto.randomUUID(),
            vehicle_id: vehicleId,
            user_id: userId,
            reading_km: parsedOdometer,
            reading_type: 'daily_close',
            reading_timestamp: nowIso,
            source: 'driver_entry',
            created_at: nowIso,
          });
        } catch {
          // Non-blocking odometer log insert
        }

        // 3. Update vehicle odometer reading
        const { data: v } = await supabase
          .from('vehicles')
          .select('current_odometer_km')
          .eq('id', vehicleId)
          .maybeSingle();

        if (v && (v.current_odometer_km === null || parsedOdometer > v.current_odometer_km)) {
          await supabase
            .from('vehicles')
            .update({ current_odometer_km: parsedOdometer, updated_at: nowIso })
            .eq('id', vehicleId);
        }
      }
    }

    // Update resilient server-side store
    const localStore = getServerStore();
    if (localStore) {
      const newLog = {
        id: logId,
        vehicle_id: vehicleId,
        user_id: userId,
        assignment_id: assignmentId || null,
        date: todayDate,
        business_date: todayDate,
        odometer_km: parsedOdometer,
        closing_odometer_km: parsedOdometer,
        distance_travelled_km: parsedDistance,
        mileage_difference_km: parsedDistance,
        comment: notes || null,
        status: 'submitted',
        submitted_at: nowIso,
        created_at: nowIso,
      };

      const existingIdx = (localStore.dailyLogs || []).findIndex(
        (l: any) => l.vehicle_id === vehicleId && (l.date === todayDate || l.business_date === todayDate)
      );
      if (existingIdx >= 0) {
        localStore.dailyLogs[existingIdx] = newLog;
      } else {
        localStore.dailyLogs = [newLog, ...(localStore.dailyLogs || [])];
      }
      saveServerStore(localStore);
    }

    return NextResponse.json(
      {
        success: true,
        log: {
          id: logId,
          vehicle_id: vehicleId,
          user_id: userId,
          assignment_id: assignmentId || null,
          date: todayDate,
          business_date: todayDate,
          odometer_km: parsedOdometer,
          closing_odometer_km: parsedOdometer,
          distance_travelled_km: parsedDistance,
          mileage_difference_km: parsedDistance,
          comment: notes || null,
          status: 'submitted',
          submitted_at: nowIso,
          created_at: nowIso,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('Failed to submit daily log:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit daily log.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
