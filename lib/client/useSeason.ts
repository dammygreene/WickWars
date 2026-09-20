'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export interface SeasonInfo {
  id: string;
  name: string;
  start: string;
  end: string;
  live: boolean;
}

export interface SeasonChallengeInfo {
  id: string;
  endsAt: string;
  pair: string;
  leverage: number;
}

interface SeasonPayload {
  season: SeasonInfo;
  challenge: SeasonChallengeInfo;
}

// Module-level cache: one fetch per session, shared across pages.
let cache: SeasonPayload | null = null;
let inflight: Promise<SeasonPayload> | null = null;

function load(): Promise<SeasonPayload> {
  inflight ??= api<SeasonPayload>('/api/season')
    .then((d) => {
      cache = d;
      return d;
    })
    .catch((e) => {
      inflight = null; // allow retry on next mount
      throw e;
    });
  return inflight;
}

/**
 * Server-configured season + today's challenge info for client components.
 * Never import `seasonConfig()` into client code — env vars are stripped from
 * browser bundles, so it would silently report the defaults and drift from
 * the season the server is actually running.
 */
export function useSeason(): { season: SeasonInfo | null; challenge: SeasonChallengeInfo | null } {
  const [data, setData] = useState<SeasonPayload | null>(cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    load()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        /* page falls back to season-agnostic copy */
      });
    return () => {
      alive = false;
    };
  }, []);

  return { season: data?.season ?? null, challenge: data?.challenge ?? null };
}
