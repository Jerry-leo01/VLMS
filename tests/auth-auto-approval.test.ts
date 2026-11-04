import { describe, it, expect } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';

describe('Staff Auto-Approval and Immediate Login Architecture', () => {
  it('automatically authorizes new staff registration immediately bypassing pending queue', async () => {
    const testEmail = `auto-driver-${Date.now()}@testcompany.com`;
    const testPlate = `AUTO-${Math.floor(1000 + Math.random() * 9000)}-AP`;
    const testPassword = 'Password123!';

    const result = await VLMSService.submitRegistration({
      fullName: 'Auto Approved Driver',
      email: testEmail,
      phoneNumber: '+234 801 234 5678',
      role: 'staff',
      department: 'Logistics',
      make: 'Toyota',
      model: 'Hilux',
      plateNumber: testPlate,
      vin: '1HGCR2F83HA00AUTO',
      year: 2024,
      odometerKm: 12500,
      tomCardNumber: '804689',
      password: testPassword,
    });

    // Verify registration response
    expect(result.status).toBe('approved');
    expect(result.id).toBeDefined();

    // Verify Profile is active immediately and password is saved
    const profile = await VLMSService.getStaffProfileByEmail(testEmail);
    expect(profile).toBeDefined();
    expect(profile?.status).toBe('active');
    expect(profile?.password_hash).toBeDefined();

    // Verify Vehicle was created with active status
    const vehicle = await VLMSService.getVehicleByPlate(testPlate);
    expect(vehicle).toBeDefined();
    expect(vehicle?.status).toBe('active');
    expect(vehicle?.current_odometer_km).toBe(12500);

    // Verify Vehicle Assignment was provisioned actively
    const asg = await VLMSService.getActiveAssignmentByVehicle(vehicle!.id);
    expect(asg).toBeDefined();
    expect(asg?.user_id).toBe(profile!.id);
    expect(asg?.ends_at).toBeNull();

    // Verify TOM Card was provisioned actively
    const allCards = await VLMSService.getAllTomCards();
    const card = allCards.find((c) => c.vehicle_id === vehicle!.id);
    expect(card).toBeDefined();
    expect(card?.masked_card_number).toContain('4689');
    expect(card?.status).toBe('active');

    // Verify credentials verification works for this auto-approved user
    const isValid = await VLMSService.verifyUserPassword(profile!.id, testPassword);
    expect(isValid).toBe(true);

    const isWrongPasswordValid = await VLMSService.verifyUserPassword(profile!.id, 'WrongPassword!');
    expect(isWrongPasswordValid).toBe(false);
  });
});
