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
      dailyLogId,
      paymentMethod = 'personal_fund',
      tomCardId,
      vendorName,
      odometerKm,
      sourceUnit = 'km',
      sourceReading,
      odometerEvidenceId,
      receiptEvidenceId,
      amount,
      quantityLitres,
      purchasedAt,
      idempotencyKey,
    } = body;

    if (!vehicleId || !userId || !vendorName || amount === undefined || quantityLitres === undefined) {
      return NextResponse.json(
        { error: 'vehicleId, userId, vendorName, amount, and quantityLitres are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const txId = isValidUuid(id) ? id : crypto.randomUUID();
    const parsedAmount = Number(amount) || 0;
    const parsedLitres = Number(quantityLitres) || 0;
    const parsedOdometer = Number(odometerKm) || 0;
    const costPerLitre = parsedLitres > 0 ? Math.round((parsedAmount / parsedLitres) * 100) / 100 : 0;
    const txDate = purchasedAt ? new Date(purchasedAt).toISOString() : new Date().toISOString();

    const supabase = getSupabaseAdmin();

    if (supabase) {
      // 1. Insert into fuel_transactions in Supabase
      const { error: txErr } = await supabase.from('fuel_transactions').upsert(
        {
          id: txId,
          vehicle_id: vehicleId,
          user_id: userId,
          tom_card_id: isValidUuid(tomCardId) ? tomCardId : null,
          transaction_date: txDate,
          vendor_name: vendorName.trim(),
          litres: parsedLitres,
          cost_per_litre: costPerLitre,
          total_cost: parsedAmount,
          current_odometer_km: parsedOdometer,
          source_unit: sourceUnit === 'mi' ? 'mi' : 'km',
          source_reading: sourceReading !== undefined && sourceReading !== null ? Number(sourceReading) : parsedOdometer,
          status: 'confirmed',
          created_at: txDate,
        },
        { onConflict: 'id' }
      );

      if (txErr) {
        console.error('Fatal Database Write Failure (fuel_transactions):', txErr);
        return NextResponse.json(
          { error: `Database persistence failed: ${txErr.message}`, code: txErr.code },
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
            reading_type: 'fuel_purchase',
            reading_timestamp: txDate,
            source: 'driver_entry',
            created_at: txDate,
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
            .update({ current_odometer_km: parsedOdometer, updated_at: new Date().toISOString() })
            .eq('id', vehicleId);
        }
      }
    }

    // Update resilient server-side store
    const localStore = getServerStore();
    if (localStore) {
      const newTx = {
        id: txId,
        vehicle_id: vehicleId,
        user_id: userId,
        daily_log_id: dailyLogId || null,
        payment_method: paymentMethod,
        tom_card_id: tomCardId || null,
        vendor_name: vendorName,
        odometer_km: parsedOdometer,
        source_unit: sourceUnit === 'mi' ? 'mi' : 'km',
        source_reading: sourceReading !== undefined && sourceReading !== null ? Number(sourceReading) : parsedOdometer,
        odometer_evidence_id: odometerEvidenceId || null,
        receipt_evidence_id: receiptEvidenceId || null,
        amount: parsedAmount,
        currency: 'NGN',
        quantity_litres: parsedLitres,
        purchased_at: txDate,
        submitted_at: txDate,
        status: 'verified',
        idempotency_key: idempotencyKey || txId,
      };

      const existingIdx = (localStore.fuelTransactions || []).findIndex((f: any) => f.id === txId);
      if (existingIdx >= 0) {
        localStore.fuelTransactions[existingIdx] = newTx;
      } else {
        localStore.fuelTransactions = [newTx, ...(localStore.fuelTransactions || [])];
      }
      saveServerStore(localStore);
    }

    return NextResponse.json(
      {
        success: true,
        transaction: {
          id: txId,
          vehicle_id: vehicleId,
          user_id: userId,
          daily_log_id: dailyLogId || null,
          payment_method: paymentMethod,
          tom_card_id: tomCardId || null,
          tomCardId: tomCardId || null,
          vendor_name: vendorName,
          vendorName: vendorName,
          odometer_km: parsedOdometer,
          odometerKm: parsedOdometer,
          source_unit: sourceUnit === 'mi' ? 'mi' : 'km',
          sourceUnit: sourceUnit === 'mi' ? 'mi' : 'km',
          source_reading: sourceReading !== undefined && sourceReading !== null ? Number(sourceReading) : parsedOdometer,
          sourceReading: sourceReading !== undefined && sourceReading !== null ? Number(sourceReading) : parsedOdometer,
          odometer_evidence_id: odometerEvidenceId || null,
          odometerEvidenceId: odometerEvidenceId || null,
          receipt_evidence_id: receiptEvidenceId || null,
          receiptEvidenceId: receiptEvidenceId || null,
          amount: parsedAmount,
          currency: 'NGN',
          quantity_litres: parsedLitres,
          quantityLitres: parsedLitres,
          purchased_at: txDate,
          purchasedAt: txDate,
          submitted_at: txDate,
          submittedAt: txDate,
          status: 'verified',
          idempotency_key: idempotencyKey || txId,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('Failed to submit fuel transaction:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to submit fuel transaction.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
