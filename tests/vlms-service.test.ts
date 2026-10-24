import { describe, it, expect } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';
import { getBusinessDate } from '../src/lib/utils';

describe('VLMS Service & Business Logic', () => {
  it('should successfully submit a daily log and prevent duplicate submission on same business date', async () => {
    const vehicleId = 'v-toyota-corolla';
    const userId = 'p-staff-01';

    // First submission should succeed
    const { log } = await VLMSService.submitDailyLog({
      vehicleId,
      userId,
      odometerKm: 46200,
      evidenceId: 'ev-seed-01',
      comment: 'Morning pre-trip inspection',
    });

    expect(log).toBeDefined();
    expect(log.business_date).toBe(getBusinessDate());

    // Immediate repeat submission must throw error (enforcing unique vehicle + business_date constraint)
    await expect(
      VLMSService.submitDailyLog({
        vehicleId,
        userId,
        odometerKm: 46250,
        evidenceId: 'ev-seed-01',
      })
    ).rejects.toThrow(/already been submitted for this vehicle today/i);
  });

  it('should handle repeat login by returning the saved log', async () => {
    const vehicleId = 'v-toyota-corolla';
    const log = await VLMSService.getTodayLog(vehicleId);
    expect(log).toBeDefined();
    expect(log?.odometer_km).toBe(46200);
  });

  it('should enforce idempotency on fuel transaction submissions', async () => {
    const idempotencyKey = 'idem-unique-key-abc12345';
    const txInput = {
      vehicleId: 'v-toyota-corolla',
      userId: 'p-staff-01',
      paymentMethod: 'tom_card' as const,
      vendorName: 'TOTAL ENERGIES FILLING STATION',
      odometerKm: 46250,
      odometerEvidenceId: 'ev-seed-01',
      receiptEvidenceId: 'ev-seed-01',
      amount: 35000,
      quantityLitres: 40,
      purchasedAt: new Date().toISOString(),
      idempotencyKey,
    };

    const first = await VLMSService.submitFuelTransaction(txInput);
    const second = await VLMSService.submitFuelTransaction(txInput);

    expect(first.transaction.id).toBe(second.transaction.id);
  });

  it('should process registration request and approve user into active status', async () => {
    const req = await VLMSService.submitRegistration({
      fullName: 'Oluwaseun Bakare',
      phoneNumber: '+2348012345678',
      plateNumber: 'EKY-319TN',
      carName: 'Toyota Corolla Executive',
      carModel: 'Corolla LE',
      carYear: '2023',
      tomCardNumber: '804689',
      officeId: '11111111-1111-1111-1111-111111111111',
    });

    expect(req.status).toBe('pending');
    expect(req.requested_car_name).toBe('Toyota Corolla Executive');

    const approved = await VLMSService.approveRegistration(req.id, 'p-admin-01');
    expect(approved.status).toBe('approved');

    const profile = await VLMSService.getStaffProfile(req.user_id);
    expect(profile?.status).toBe('active');
  });

  it('should prevent registration of existing plate number with exact error message', async () => {
    // EKY-319TN was already registered and approved above
    await expect(
      VLMSService.submitRegistration({
        fullName: 'Duplicate Staff',
        phoneNumber: '+2348099999999',
        plateNumber: 'EKY-319TN',
        officeId: '11111111-1111-1111-1111-111111111111',
      })
    ).rejects.toThrow('Plate number already exists in the database. Kindly sign in.');
  });

  it('should reject fuel transaction if no daily log has been submitted today for the vehicle', async () => {
    // Vehicle without today's log
    const unloggedVehicle = 'v-honda-civic';
    await expect(
      VLMSService.submitFuelTransaction({
        vehicleId: unloggedVehicle,
        userId: 'p-staff-02',
        paymentMethod: 'tom_card',
        vendorName: 'TOTAL ENERGIES FILLING STATION',
        odometerKm: 33000,
        odometerEvidenceId: 'ev-seed-01',
        amount: 25000,
        quantityLitres: 30,
        purchasedAt: new Date().toISOString(),
        idempotencyKey: 'idem-test-no-log',
      })
    ).rejects.toThrow(/No verified daily log found for today/i);
  });

  it('should maintain immutable audit log of actions', async () => {
    const auditLogs = await VLMSService.getAuditEvents();
    expect(auditLogs.length).toBeGreaterThan(0);
    const hasDailyLogAudit = auditLogs.some((a) => a.action === 'DAILY_LOG_SUBMITTED');
    expect(hasDailyLogAudit).toBe(true);
  });
});
