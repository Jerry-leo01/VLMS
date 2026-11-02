import { describe, it, expect, beforeEach } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';

describe('User Profile Self-Service Management & Security', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Register and approve a test driver
    const req = await VLMSService.submitRegistration({
      fullName: 'Adebayo Ogunlesi',
      phoneNumber: '+2348011223344',
      plateNumber: `TEST-${Date.now().toString().slice(-5)}`,
      officeId: '11111111-1111-1111-1111-111111111111',
    });
    await VLMSService.approveRegistration(req.id, 'p-admin-01');
    testUserId = req.user_id;

    // Set active session for the user
    VLMSService.setActiveSession({
      userId: testUserId,
      role: 'staff',
      fullName: 'Adebayo Ogunlesi',
      email: null,
    });
  });

  it('should successfully update self-service profile fields', async () => {
    const updated = await VLMSService.updateUserProfile(testUserId, {
      fullName: 'Adebayo Ogunlesi Jr.',
      phoneNumber: '+2348099887766',
      email: 'adebayo.jr@example.com',
    });

    expect(updated).toBeDefined();
    expect(updated.full_name).toBe('Adebayo Ogunlesi Jr.');
    expect(updated.phone_number).toBe('+2348099887766');
    expect(updated.email).toBe('adebayo.jr@example.com');

    // Verify active session was updated as well
    const session = VLMSService.getActiveSession();
    expect(session?.fullName).toBe('Adebayo Ogunlesi Jr.');
    expect(session?.email).toBe('adebayo.jr@example.com');
  });

  it('should reject full names shorter than 3 characters', async () => {
    await expect(
      VLMSService.updateUserProfile(testUserId, {
        fullName: 'Ab',
      })
    ).rejects.toThrow(/Full name must be between 3 and 100 characters/i);
  });

  it('should reject invalid phone numbers', async () => {
    await expect(
      VLMSService.updateUserProfile(testUserId, {
        phoneNumber: 'not-a-phone-number',
      })
    ).rejects.toThrow(/Please provide a valid phone number/i);
  });

  it('should reject malformed email addresses', async () => {
    await expect(
      VLMSService.updateUserProfile(testUserId, {
        email: 'invalid-email-format',
      })
    ).rejects.toThrow(/Please provide a valid email address/i);
  });

  it('should record an immutable PROFILE_SELF_EDITED audit event', async () => {
    await VLMSService.updateUserProfile(testUserId, {
      fullName: 'Adebayo Verified',
      phoneNumber: '08023456789',
    });

    const audits = await VLMSService.getAuditEvents();
    const profileEditAudit = audits.find(
      (a) => a.action === 'PROFILE_SELF_EDITED' && a.entity_id === testUserId
    );

    expect(profileEditAudit).toBeDefined();
    expect(profileEditAudit?.actor_id).toBe(testUserId);
    expect(profileEditAudit?.after_data).toHaveProperty('full_name', 'Adebayo Verified');
  });

  it('should reject updates for non-existent users', async () => {
    await expect(
      VLMSService.updateUserProfile('non-existent-user-id', {
        fullName: 'Ghost User',
      })
    ).rejects.toThrow(/User profile not found/i);
  });
});
