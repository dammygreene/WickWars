'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlayerIdentity, PlayerStats } from '@/lib/types';
import { api } from './api';

export interface PlayerWithStats extends PlayerIdentity {
  stats: PlayerStats;
}

interface Ctx {
  player: PlayerWithStats | null;
  loading: boolean;
  refresh: () => Promise<PlayerWithStats | null>;
  logout: () => Promise<void>;
}

const PlayerCtx = createContext<Ctx>({ player: null, loading: true, refresh: async () => null, logout: async () => {} });

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { player: p } = await api<{ player: PlayerWithStats | null }>('/api/auth/me');
      setPlayer(p);
      return p;
    } catch {
      setPlayer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
    } catch {
      /* ignore */
    }
    setPlayer(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ player, loading, refresh, logout }), [player, loading, refresh, logout]);
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

export function usePlayer(): Ctx {
  return useContext(PlayerCtx);
}
