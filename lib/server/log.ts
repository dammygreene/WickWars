type LogValue = string | number | boolean | null | undefined;

/** Structured server logs. Never pass tokens, signatures, or request bodies. */
export function logEvent(event: string, fields: Record<string, LogValue> = {}): void {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...clean }));
}

export function logError(event: string, error: unknown, fields: Record<string, LogValue> = {}): void {
  logEvent(event, {
    ...fields,
    error: error instanceof Error ? error.message : 'unknown_error',
  });
}