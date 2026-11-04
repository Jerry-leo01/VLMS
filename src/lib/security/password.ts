/**
 * Cryptographic Password Hashing and Verification
 * Powered by Web Crypto API (SHA-256 with per-credential salting).
 * Fully compatible with Next.js Server Components, API Route Handlers, and Client Browsers.
 */

export async function hashPassword(password: string, customSalt?: string): Promise<string> {
  const salt = customSalt || Math.random().toString(36).slice(2, 12);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash || !storedHash.includes(':')) {
    // Backward compatibility: If no hash exists yet, allow valid transition
    return false;
  }
  const [salt, expectedHash] = storedHash.split(':');
  const computed = await hashPassword(password, salt);
  const [, computedHash] = computed.split(':');
  return expectedHash === computedHash;
}
