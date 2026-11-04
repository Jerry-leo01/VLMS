import { describe, it, expect } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';

describe('Employee ID Signup & Profile Integration', () => {
  it('stores custom mandatory Employee ID upon staff registration and surfaces it on profile', async () => {
    const testEmail = `driver-empid-${Date.now()}@testcompany.com`;
    const testPlate = `EMP-${Math.floor(1000 + Math.random() * 9000)}-ID`;
    const customEmployeeId = 'EMP-2026-9941';

    const req = await VLMSService.submitRegistration({
      fullName: 'Chinedu Eze',
      employeeId: customEmployeeId,
      email: testEmail,
      phoneNumber: '+234 803 456 7890',
      plateNumber: testPlate,
      carName: 'Toyota Hilux Workhorse',
      carModel: 'Hilux Double Cabin',
      carYear: 2024,
      tomCardNumber: '804689',
      officeId: '11111111-1111-1111-1111-111111111111',
      password: 'SecurePassword123!',
      requestedRole: 'staff',
    });

    expect(req).toBeDefined();
    expect(req.status).toBe('approved');

    // Retrieve the user profile by ID and Email
    const profile = await VLMSService.getStaffProfile(req.user_id);
    expect(profile).toBeDefined();
    expect(profile?.full_name).toBe('Chinedu Eze');
    expect(profile?.employee_id).toBe(customEmployeeId);

    // Verify it is also surfaced when retrieving by email
    const profileByEmail = await VLMSService.getStaffProfileByEmail(testEmail);
    expect(profileByEmail).toBeDefined();
    expect(profileByEmail?.employee_id).toBe(customEmployeeId);
  });

  it('stores custom mandatory Employee ID upon administrator account registration', async () => {
    const adminEmail = `admin-empid-${Date.now()}@testcorp.com`;
    const customAdminEmpId = 'ADM-2026-0042';

    const { profile: adminProfile } = await VLMSService.registerAdminAccount({
      fullName: 'Fatima Aliyu',
      employeeId: customAdminEmpId,
      email: adminEmail,
      phoneNumber: '+234 812 345 6789',
      role: 'administrator',
      password: 'AdminPassword123!',
    });

    expect(adminProfile).toBeDefined();
    expect(adminProfile.employee_id).toBe(customAdminEmpId);

    const reloaded = await VLMSService.getStaffProfile(adminProfile.id);
    expect(reloaded?.employee_id).toBe(customAdminEmpId);
  });
});
