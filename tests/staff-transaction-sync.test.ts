import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';
import { POST as staffFuelHandler } from '../src/app/api/staff/fuel/route';
import { POST as staffDailyLogHandler } from '../src/app/api/staff/daily-log/route';
import { GET as storeGetHandler, POST as storePostHandler } from '../src/app/api/store/route';
import { getServerStore, saveServerStore } from '../src/lib/services/server-store';
import { getBaselineStore } from '../src/lib/services/baseline-store';

describe('Staff Transaction & Daily Log Cloud Synchronization', () => {
  const testUserId = 'cb853d74-445a-4acf-baa3-0c83eaa1538a';
  const testVehicleId = 'b9ae5548-cc4c-4b74-90ba-de739f25e5e4';

  it('rejects fuel submission missing mandatory fields', async () => {
    const req = new Request('http://localhost:3000/api/staff/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: testVehicleId,
      }),
    });

    const res = await staffFuelHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('successfully commits a staff fuel transaction via API', async () => {
    const req = new Request('http://localhost:3000/api/staff/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: testVehicleId,
        userId: testUserId,
        vendorName: 'Mobil Victoria Island',
        amount: 25000,
        quantityLitres: 25,
        odometerKm: 18200,
        purchasedAt: new Date().toISOString(),
      }),
    });

    const res = await staffFuelHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.transaction).toBeDefined();
    expect(json.transaction.vendor_name).toBe('Mobil Victoria Island');
    expect(json.transaction.amount).toBe(25000);
    expect(json.transaction.quantity_litres).toBe(25);
    expect(json.transaction.odometer_km).toBe(18200);
  });

  it('successfully commits a staff daily log via API', async () => {
    const today = new Date().toISOString().split('T')[0];
    const req = new Request('http://localhost:3000/api/staff/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: testVehicleId,
        userId: testUserId,
        logDate: today,
        closingOdometerKm: 18250,
        distanceTravelledKm: 50,
        notes: 'Routine commercial route completed.',
      }),
    });

    const res = await staffDailyLogHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.log).toBeDefined();
    expect(json.log.closing_odometer_km).toBe(18250);
    expect(json.log.distance_travelled_km).toBe(50);
  });

  it('successfully commits a staff fuel transaction via API with decoupled evidence IDs', async () => {
    const odoEvId = 'ev-odo-test-123';
    const recEvId = 'ev-rec-test-456';
    const req = new Request('http://localhost:3000/api/staff/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: testVehicleId,
        userId: testUserId,
        vendorName: 'TotalEnergies Ikoyi',
        amount: 30000,
        quantityLitres: 30,
        odometerKm: 18300,
        sourceUnit: 'km',
        sourceReading: 18300,
        odometerEvidenceId: odoEvId,
        receiptEvidenceId: recEvId,
        purchasedAt: new Date().toISOString(),
      }),
    });

    const res = await staffFuelHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.transaction).toBeDefined();
    expect(json.transaction.odometer_evidence_id).toBe(odoEvId);
    expect(json.transaction.receipt_evidence_id).toBe(recEvId);
  });

  it('verifies evidence gallery strictly decouples fuel receipt and odometer evidence', async () => {
    const recEv = await VLMSService.saveEvidenceFile({
      evidenceType: 'fuel_receipt',
      sha256Hash: 'hash-receipt-evidence-xyz',
      mimeType: 'image/jpeg',
      fileSizeBytes: 25000,
      dataUrl: 'data:image/jpeg;base64,mockReceiptDataUrl',
    });

    const odoEv = await VLMSService.saveEvidenceFile({
      evidenceType: 'fuel_odometer',
      sha256Hash: 'hash-odo-evidence-xyz',
      mimeType: 'image/jpeg',
      fileSizeBytes: 30000,
      dataUrl: 'data:image/jpeg;base64,mockOdometerDataUrl',
    });

    const gallery = await VLMSService.getEvidenceGallery();

    const receiptItems = gallery.filter((g) => g.evidenceType === 'fuel_receipt');
    for (const item of receiptItems) {
      expect(item.evidenceType).toBe('fuel_receipt');
      if (item.dataUrl) {
        expect(item.dataUrl).not.toBe('data:image/jpeg;base64,mockOdometerDataUrl');
      }
    }
  });

  it('verifies GET /api/store normalizes fuel and log records with application models', async () => {
    const res = await storeGetHandler();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data.fuelTransactions)).toBe(true);
    expect(Array.isArray(json.data.dailyLogs)).toBe(true);

    if (json.data.fuelTransactions.length > 0) {
      const firstFuel = json.data.fuelTransactions[0];
      expect(typeof firstFuel.amount).toBe('number');
      expect(typeof firstFuel.odometer_km).toBe('number');
      expect(typeof firstFuel.quantity_litres).toBe('number');
    }

    if (json.data.dailyLogs.length > 0) {
      const firstLog = json.data.dailyLogs[0];
      expect(typeof firstLog.odometer_km).toBe('number');
      expect(firstLog.business_date || firstLog.date).toBeDefined();
    }
  });
});
