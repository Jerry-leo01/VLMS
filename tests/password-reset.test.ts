import { describe, it, expect } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';

describe('Secure Forgot Password & Recovery Architecture', () => {
  it('allows account recovery by corporate email', async () => {
    const adminEmail = `admin-recovery-${Date.now()}@corp.com`;
    const initialPassword = 'InitialSecret123!';
    const updatedPassword = 'NewSecretPassword456!';

    // Register admin account
    const { profile: adminProfile } = await VLMSService.registerAdminAccount({
      fullName: 'Recovery Admin User',
      email: adminEmail,
      phoneNumber: '+234 812 000 1122',
      role: 'administrator',
      password: initialPassword,
    });

    expect(adminProfile).toBeDefined();

    // Verify initial password
    expect(await VLMSService.verifyUserPassword(adminProfile.id, initialPassword)).toBe(true);

    // Step 1: Initiate reset by email
    const resetSession = await VLMSService.initiatePasswordReset(adminEmail);
    expect(resetSession.success).toBe(true);
    expect(resetSession.recoveryCode).toBeDefined();
    expect(resetSession.recoveryCode?.length).toBe(6);
    expect(resetSession.maskedContact).toContain('@');

    const validCode = resetSession.recoveryCode!;

    // Rejection on invalid recovery code
    await expect(
      VLMSService.verifyAndResetPassword({
        identifier: adminEmail,
        code: '000000',
        newPassword: updatedPassword,
      })
    ).rejects.toThrow(/invalid recovery code/i);

    // Step 2: Successfully complete reset
    const result = await VLMSService.verifyAndResetPassword({
      identifier: adminEmail,
      code: validCode,
      newPassword: updatedPassword,
    });
    expect(result.success).toBe(true);

    // Verify old password is now rejected and new password is valid
    expect(await VLMSService.verifyUserPassword(adminProfile.id, initialPassword)).toBe(false);
    expect(await VLMSService.verifyUserPassword(adminProfile.id, updatedPassword)).toBe(true);

    // Code cannot be reused
    await expect(
      VLMSService.verifyAndResetPassword({
        identifier: adminEmail,
        code: validCode,
        newPassword: 'AnotherPassword789!',
      })
    ).rejects.toThrow(/invalid recovery code|no active password reset request/i);
  });

  it('allows driver recovery by vehicle plate number', async () => {
    const driverEmail = `driver-plate-${Date.now()}@fleet.com`;
    const plateNumber = `RCV-${Math.floor(1000 + Math.random() * 9000)}-PL`;
    const initialPassword = 'DriverPassword1!';
    const newPassword = 'DriverNewPassword2!';

    await VLMSService.submitRegistration({
      fullName: 'Plate Driver',
      email: driverEmail,
      phoneNumber: '+234 809 111 2233',
      role: 'staff',
      department: 'Logistics',
      make: 'Toyota',
      model: 'HiAce',
      plateNumber: plateNumber,
      vin: '2T1BR32E47C000099',
      year: 2023,
      odometerKm: 45000,
      tomCardNumber: '804689',
      password: initialPassword,
    });

    const profile = await VLMSService.getStaffProfileByEmail(driverEmail);
    expect(profile).toBeDefined();

    // Step 1: Initiate reset by plate number
    const resetSession = await VLMSService.initiatePasswordReset(plateNumber);
    expect(resetSession.success).toBe(true);
    expect(resetSession.recoveryCode).toBeDefined();

    // Step 2: Complete reset using plate number as identifier
    const resetResult = await VLMSService.verifyAndResetPassword({
      identifier: plateNumber,
      code: resetSession.recoveryCode!,
      newPassword,
    });
    expect(resetResult.success).toBe(true);

    // Verify password updated on user profile
    expect(await VLMSService.verifyUserPassword(profile!.id, initialPassword)).toBe(false);
    expect(await VLMSService.verifyUserPassword(profile!.id, newPassword)).toBe(true);
  });
});
