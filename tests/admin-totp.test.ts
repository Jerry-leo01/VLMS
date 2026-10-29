import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateAdminTotpPin,
  verifyAdminTotpPin,
  getCurrentTimeStep,
  getRemainingSecondsInCycle,
  resetAdminTotpStore,
} from '../src/lib/security/admin-totp';

describe('Administrator Access Setup TOTP Security Engine', () => {
  beforeEach(() => {
    resetAdminTotpStore();
    vi.useRealTimers();
  });

  it('should generate a valid 6-digit numeric PIN with remaining seconds <= 60', () => {
    const { pin, expiresInSeconds, currentStep } = generateAdminTotpPin();
    expect(pin).toMatch(/^\d{6}$/);
    expect(expiresInSeconds).toBeGreaterThan(0);
    expect(expiresInSeconds).toBeLessThanOrEqual(60);
    expect(currentStep).toBeGreaterThan(0);
  });

  it('should rotate PIN after 60 seconds (different steps produce distinct PINs)', () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    const step1 = generateAdminTotpPin();

    // Advance 60 seconds
    vi.setSystemTime(baseTime + 60000);
    const step2 = generateAdminTotpPin();

    expect(step1.currentStep).not.toBe(step2.currentStep);
    expect(step1.pin).not.toBe(step2.pin);

    vi.useRealTimers();
  });

  it('should successfully verify a current, non-expired PIN and return an ephemeral grant token', () => {
    const { pin } = generateAdminTotpPin();
    const result = verifyAdminTotpPin(pin, 'client-test-1');

    expect(result.success).toBe(true);
    expect(result.grantToken).toBeDefined();
    expect(result.grantToken).toMatch(/^grant-\d+-[a-z0-9]+$/);
    expect(result.error).toBeUndefined();
  });

  it('should reject a PIN once the 60-second window has expired', () => {
    const baseTime = 1700000000000;
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);

    const { pin: oldPin } = generateAdminTotpPin();

    // Advance time by 61 seconds (next step)
    vi.setSystemTime(baseTime + 61000);

    const result = verifyAdminTotpPin(oldPin, 'client-test-expired');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired PIN');

    vi.useRealTimers();
  });

  it('should enforce single-use replay protection (cannot enter the same valid PIN twice in the same window)', () => {
    const { pin } = generateAdminTotpPin();

    // First use: Success
    const firstAttempt = verifyAdminTotpPin(pin, 'client-1');
    expect(firstAttempt.success).toBe(true);

    // Second use with same PIN: Replay rejection
    const secondAttempt = verifyAdminTotpPin(pin, 'client-2');
    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.error).toContain('already been used');
  });

  it('should enforce brute-force rate-limiting and lock out after 3 consecutive failures', () => {
    const clientId = 'attacker-ip-127.0.0.1';

    // Attempt 1: Fail
    const a1 = verifyAdminTotpPin('000000', clientId);
    expect(a1.success).toBe(false);
    expect(a1.error).toContain('2 attempts remaining');

    // Attempt 2: Fail
    const a2 = verifyAdminTotpPin('111111', clientId);
    expect(a2.success).toBe(false);
    expect(a2.error).toContain('1 attempt remaining');

    // Attempt 3: Fail & Lockout
    const a3 = verifyAdminTotpPin('222222', clientId);
    expect(a3.success).toBe(false);
    expect(a3.error).toContain('Lockout active for 15 minutes');

    // Attempt 4 (even if submitting a valid PIN now): Blocked by lockout
    const { pin: validPin } = generateAdminTotpPin();
    const a4 = verifyAdminTotpPin(validPin, clientId);
    expect(a4.success).toBe(false);
    expect(a4.error).toContain('Temporary security lockout active');
  });
});
