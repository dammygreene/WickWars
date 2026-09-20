'use client';

/** Fire-and-forget product analytics. Never blocks UI, never sends PII. */
export function track(e: string, p?: Record<string, string | number>): void {
  try {
    const body = JSON.stringify({ e, p });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
