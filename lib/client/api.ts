'use client';

export interface ApiError {
  code: string;
  message: string;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: ApiError }
    | null;
  if (!json) throw { code: 'NETWORK', message: 'Connection failed. Check your network.' } as ApiError;
  if (!json.ok) throw (json as { error: ApiError }).error;
  return (json as { ok: true; data: T }).data;
}

export function errMsg(e: unknown, fallback = 'Something went wrong.'): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as ApiError).message);
  return fallback;
}
