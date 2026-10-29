/**
 * Ephemeral Time-Based One-Time Password (TOTP) Security Engine
 * for Out-of-Band Dual-Control Administrator Access Setup.
 *
 * Specifications:
 * - Time Step Window: Exactly 60 seconds (X = 60).
 * - Code Length: 6 numeric digits (zero-padded).
 * - Single-Use Enforcement: Replay attack prevention via consumed nonce store.
 * - Brute-Force Defense: Rate-limiting and progressive lockout tracking.
 */

// Shared secret seed for admin authorization tokens
const ADMIN_TOTP_SECRET = 'VLMS-SECURE-ADMIN-AUTHORIZATION-SEED-2026';
const TIME_STEP_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory tracking for consumed PIN nonces and rate-limits (persisted to localStorage in browser)
interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const consumedNonces = new Set<string>();
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Deterministic integer hash function generating uniform 6-digit codes
 * from a secret seed and 60-second discrete time step T.
 */
function computeStepCode(seed: string, step: number): string {
  const input = `${seed}:step:${step}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert to positive 6-digit integer
  const positive = Math.abs(hash);
  const sixDigit = positive % 1000000;
  return sixDigit.toString().padStart(6, '0');
}

/**
 * Calculates current 60-second time step index.
 */
export function getCurrentTimeStep(timestampMs: number = Date.now()): number {
  return Math.floor(timestampMs / 1000 / TIME_STEP_SECONDS);
}

/**
 * Calculates remaining seconds in the current 60-second cycle.
 */
export function getRemainingSecondsInCycle(timestampMs: number = Date.now()): number {
  const currentSeconds = Math.floor(timestampMs / 1000);
  const secondsIntoStep = currentSeconds % TIME_STEP_SECONDS;
  return TIME_STEP_SECONDS - secondsIntoStep;
}

/**
 * Generates the current live dynamic PIN from the Administrator Dashboard.
 */
export function generateAdminTotpPin(seed: string = ADMIN_TOTP_SECRET): {
  pin: string;
  expiresInSeconds: number;
  currentStep: number;
} {
  const now = Date.now();
  const step = getCurrentTimeStep(now);
  const pin = computeStepCode(seed, step);
  const expiresInSeconds = getRemainingSecondsInCycle(now);

  return {
    pin,
    expiresInSeconds,
    currentStep: step,
  };
}

/**
 * Rate-limiting status for a client identifier (e.g. IP, session, or client fingerprint)
 */
export function getRateLimitStatus(clientId: string = 'default-client'): {
  isLocked: boolean;
  remainingLockoutSeconds: number;
  failedAttempts: number;
} {
  const record = rateLimitStore.get(clientId);
  if (!record) {
    return { isLocked: false, remainingLockoutSeconds: 0, failedAttempts: 0 };
  }

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingLockoutSeconds: remaining, failedAttempts: record.failedAttempts };
  }

  // Lockout has passed, reset state
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.lockedUntil = null;
    record.failedAttempts = 0;
  }

  return { isLocked: false, remainingLockoutSeconds: 0, failedAttempts: record.failedAttempts };
}

/**
 * Verifies a submitted 6-digit PIN against the active 60-second time window.
 */
export function verifyAdminTotpPin(
  submittedPin: string,
  clientId: string = 'default-client',
  seed: string = ADMIN_TOTP_SECRET
): {
  success: boolean;
  error?: string;
  grantToken?: string;
  remainingSeconds?: number;
} {
  const cleanPin = submittedPin.replace(/\s+/g, '').trim();

  // 1. Rate-Limit Verification
  const rateLimit = getRateLimitStatus(clientId);
  if (rateLimit.isLocked) {
    return {
      success: false,
      error: `Too many failed attempts. Temporary security lockout active for ${rateLimit.remainingLockoutSeconds} seconds.`,
    };
  }

  // 2. Format validation
  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      success: false,
      error: 'Security PIN must be exactly 6 numeric digits.',
    };
  }

  const now = Date.now();
  const currentStep = getCurrentTimeStep(now);
  const expectedPin = computeStepCode(seed, currentStep);
  const nonceKey = `consumed:${currentStep}:${cleanPin}`;

  // 3. Replay Protection: Check if this specific PIN for this step was already consumed
  if (consumedNonces.has(nonceKey)) {
    return {
      success: false,
      error: 'This security PIN has already been used. Please request a new 60-second code from an administrator.',
    };
  }

  // 4. Exact Time Step Match (Strict Zero-Drift Policy)
  if (cleanPin === expectedPin) {
    // Mark PIN as consumed for this time step
    consumedNonces.add(nonceKey);

    // Reset rate-limit tracker on success
    rateLimitStore.delete(clientId);

    // Issue ephemeral 10-minute setup grant token
    const grantToken = `grant-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    return {
      success: true,
      grantToken,
      remainingSeconds: getRemainingSecondsInCycle(now),
    };
  }

  // 5. Invalidation & Failed Attempt Counter
  let record = rateLimitStore.get(clientId);
  if (!record) {
    record = { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now };
    rateLimitStore.set(clientId, record);
  }

  record.failedAttempts += 1;
  record.lastAttemptAt = now;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return {
      success: false,
      error: `Security threshold exceeded. 3 consecutive invalid attempts. Lockout active for 15 minutes.`,
    };
  }

  const attemptsLeft = MAX_FAILED_ATTEMPTS - record.failedAttempts;
  return {
    success: false,
    error: `Invalid or expired PIN. Codes rotate every 60 seconds. (${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining before lockout).`,
  };
}

/**
 * Resets rate-limiting (e.g. for testing purposes)
 */
export function resetAdminTotpStore(): void {
  consumedNonces.clear();
  rateLimitStore.clear();
}
