/**
 * Fixed-window in-memory rate limiter — a best-effort guard for the
 * file-backed MVP deployment (single instance). Resets on cold start and is
 * scoped per instance; swap for Redis counters when the store moves to a
 * shared database. Never used for security-critical decisions — only to blunt
 * accidental loops and cheap abuse of expensive endpoints.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweepAt = Date.now();

/** Periodically drop dead buckets so the map stays bounded. */
function sweep(now: number): void {
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window rolls over (for Retry-After). 0 when ok. */
  retryAfterS: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterS: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterS: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterS: 0 };
}

/**
 * Stable client key: authenticated player id when available, else the peer IP
 * from proxy headers (the app is deployed behind a proxy in all target envs).
 */
export function clientKey(req: Request, playerId?: string | null): string {
  if (playerId) return `p:${playerId}`;
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  return `ip:${ip || 'unknown'}`;
}
