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

    // Verify FUEL_PURCHASE_VARIANCE notification alert generated
    const fuelAlert = first.anomalies.find((a) => a.rule_code === 'FUEL_PURCHASE_VARIANCE');
    expect(fuelAlert).toBeDefined();
    expect(fuelAlert?.severity).toBe('low');
    expect(fuelAlert?.details.deltaKm).toBe(50); // 46,250 - 46,200 = 50 km
    expect(fuelAlert?.details.notification).toContain('traveled 50km from the last submitted log to the fuel purchase point.');
  });

  it('should process registration request and automatically authorize user into active status', async () => {
    const req = await VLMSService.submitRegistration({
      fullName: 'Oluwaseun Bakare',
      phoneNumber: '+2348012345678',
      plateNumber: 'EKY-319TN',
      carName: 'Toyota Corolla Executive',
      carModel: 'Corolla LE',
      carYear: 2023,
      tomCardNumber: '804689',
      officeId: '11111111-1111-1111-1111-111111111111',
    });

    expect(req.status).toBe('approved');
    expect(req.requested_car_name).toBe('Toyota Corolla Executive');

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
        receiptEvidenceId: 'ev-seed-01',
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

  describe('Dashboard Metrics & KPI Date Range Synchronization', () => {
    it('should compute complete dashboard metrics when called with no date filter', async () => {
      const metrics = await VLMSService.getDashboardMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalUsers).toBe('number');
      expect(typeof metrics.activeStaff).toBe('number');
      expect(typeof metrics.totalVehicles).toBe('number');
      expect(typeof metrics.activeVehicles).toBe('number');
      expect(typeof metrics.submittedLogs).toBe('number');
      expect(typeof metrics.submittedToday).toBe('number');
      expect(typeof metrics.totalFuelExpenditure).toBe('number');
      expect(typeof metrics.openAnomalies).toBe('number');
      expect(typeof metrics.pendingApprovals).toBe('number');
      expect(typeof metrics.vehiclesActiveInRange).toBe('number');
      expect(typeof metrics.driversActiveInRange).toBe('number');
      expect(metrics.totalFuelExpenditure).toBeGreaterThanOrEqual(0);
    });

    it('should synchronize KPI metrics correctly for today filter', async () => {
      const today = getBusinessDate();
      const todayMetrics = await VLMSService.getDashboardMetrics({
        startDate: today,
        endDate: today,
      });

      expect(todayMetrics).toBeDefined();
      expect(todayMetrics.submittedLogs).toBe(todayMetrics.submittedToday);
      expect(todayMetrics.missingDailyLogs).toBe(
        Math.max(0, todayMetrics.activeVehicles - todayMetrics.submittedToday)
      );
      expect(todayMetrics.fuelTransactionsCount).toBe(todayMetrics.fuelTransactionsToday);
      expect(todayMetrics.totalFuelExpenditure).toBeGreaterThanOrEqual(0);
      expect(todayMetrics.totalFuelExpenditureAllTime).toBeGreaterThanOrEqual(
        todayMetrics.totalFuelExpenditure
      );
    });

    it('should return zero submissions and zero expenditure for a historical date with no activity', async () => {
      const emptyMetrics = await VLMSService.getDashboardMetrics({
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      });

      expect(emptyMetrics).toBeDefined();
      expect(emptyMetrics.submittedLogs).toBe(0);
      expect(emptyMetrics.fuelTransactionsCount).toBe(0);
      expect(emptyMetrics.totalFuelExpenditure).toBe(0);
      expect(emptyMetrics.totalLitres).toBe(0);
      expect(emptyMetrics.totalAnomaliesInRange).toBe(0);
      expect(emptyMetrics.vehiclesActiveInRange).toBe(0);
      expect(emptyMetrics.driversActiveInRange).toBe(0);
      // Base fleet and user counts remain valid reference baselines
      expect(emptyMetrics.totalVehicles).toBeGreaterThanOrEqual(0);
      expect(emptyMetrics.activeVehicles).toBeGreaterThanOrEqual(0);
    });
  });
});
