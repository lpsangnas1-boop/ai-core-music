import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'http';
import { config } from './config.js';

const adminPinDigest = createHash('sha256').update(config.adminPin).digest();

/** Constant-time comparison of a client-supplied PIN with ADMIN_PIN. */
export function isValidAdminPin(pin: unknown): boolean {
  if (typeof pin !== 'string') return false;
  const trimmed = pin.trim();
  if (!trimmed || trimmed.length > 128) return false;
  const digest = createHash('sha256').update(trimmed).digest();
  return timingSafeEqual(digest, adminPinDigest);
}

function isLoopback(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address.startsWith('127.');
}

/**
 * Resolve the real client IP. Tunnels (cloudflared, localtunnel, ngrok) connect from
 * localhost, so forwarded headers are only trusted when the TCP peer is loopback.
 */
export function getClientIp(remoteAddress: string | undefined, headers: IncomingHttpHeaders): string {
  const peer = (remoteAddress || '').replace(/^::ffff:/, '');
  if (isLoopback(peer)) {
    const cf = headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf.trim()) return cf.trim();
    const xff = headers['x-forwarded-for'];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return peer || 'unknown';
}

export interface RateLimiter {
  /** Count one hit; returns whether it is still within the limit. */
  hit(key: string): { allowed: boolean; retryAfterSec: number };
  /** True when the key already reached the limit (does not count a hit). */
  isBlocked(key: string): { blocked: boolean; retryAfterSec: number };
  reset(key: string): void;
}

export function createRateLimiter(windowMs: number, max: number): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(windowMs, 60_000));
  sweep.unref();

  const current = (key: string) => {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  return {
    hit(key) {
      const bucket = current(key);
      bucket.count++;
      const retryAfterSec = Math.ceil((bucket.resetAt - Date.now()) / 1000);
      return { allowed: bucket.count <= max, retryAfterSec };
    },
    isBlocked(key) {
      const bucket = current(key);
      const retryAfterSec = Math.ceil((bucket.resetAt - Date.now()) / 1000);
      return { blocked: bucket.count >= max, retryAfterSec };
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

/** Failed PIN attempts: 10 per client IP per 15 minutes, then locked until the window ends. */
export const authFailureLimiter = createRateLimiter(15 * 60_000, 10);

export type PinCheckResult = { ok: true } | { ok: false; status: 401 | 429; error: string };

/** Verify a PIN for a client while enforcing the brute-force lockout. */
export function checkAdminPin(pin: unknown, clientIp: string): PinCheckResult {
  const lock = authFailureLimiter.isBlocked(clientIp);
  if (lock.blocked) {
    const minutes = Math.max(1, Math.ceil(lock.retryAfterSec / 60));
    return {
      ok: false,
      status: 429,
      error: `Nhập sai PIN quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
    };
  }
  if (isValidAdminPin(pin)) {
    authFailureLimiter.reset(clientIp);
    return { ok: true };
  }
  authFailureLimiter.hit(clientIp);
  return { ok: false, status: 401, error: 'Unauthorized: Invalid Admin PIN' };
}

/** Stable, non-reversible public key for a device id (FNV-1a 32-bit, same as the client). */
export function deviceKey(deviceId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < deviceId.length; i++) {
    hash ^= deviceId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
