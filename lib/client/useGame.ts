'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMsg } from './api';
import { track } from './analytics';
import type { TickSnapshot } from '@/lib/game/tick';
import type { TradeAction } from '@/lib/types';
import { sfx } from './sound';

export type Phase = 'brief' | 'countdown' | 'live' | 'over';

interface CreatedGame {
  id: string;
  mode: string;
  pair: string;
  startsAt: number;
  endsAt: number;
  startBalance: number;
  durationMs: number;
  leverage: number;
  countdownMs: number;
}

interface UseGame {
  phase: Phase;
  game: CreatedGame | null;
  tick: TickSnapshot | null;
  /** ms offset between server clock and local clock (server - local) */
  clockSkew: number;
  error: string | null;
  offline: boolean;
  trading: boolean;
  countdown: string;
  start: () => Promise<void>;
  trade: (a: TradeAction) => Promise<void>;
  retry: () => void;
}

export function useGame(): UseGame {
  const [phase, setPhase] = useState<Phase>('brief');
  const [game, setGame] = useState<CreatedGame | null>(null);
  const [tick, setTick] = useState<TickSnapshot | null>(null);
  const [clockSkew, setClockSkew] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [trading, setTrading] = useState(false);
  const [countdown, setCountdown] = useState('3');

  const pollRef = useRef<number | null>(null);
  const failsRef = useRef(0);
  const prevEquityRef = useRef<number | null>(null);
  const overRef = useRef(false);
  const phaseRef = useRef<Phase>('brief');
  phaseRef.current = phase;

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (gameId: string) => {
      try {
        const t = await api<TickSnapshot>(`/api/games/${gameId}/tick`);
        failsRef.current = 0;
        setOffline(false);
        setClockSkew(t.serverNow - Date.now());

        // Close feedback: equity delta across a close.
        if (prevEquityRef.current != null && prevEquityRef.current !== t.equity && t.side === 'FLAT') {
          const d = t.equity - prevEquityRef.current;
          if (Math.abs(d) > 0.005) {
            if (d > 0) sfx.closeWin();
            else sfx.closeLoss();
            vibrate(d > 0 ? 12 : [20, 40, 20]);
          }
        }
        prevEquityRef.current = t.equity;

        if (t.status === 'FINISHED' || t.status === 'LIQUIDATED') {
          if (!overRef.current) {
            overRef.current = true;
            if (t.status === 'LIQUIDATED') {
              sfx.rekt();
              vibrate([40, 60, 80]);
            } else {
              sfx.end();
            }
            track('game_completed');
            stopPoll();
            setTick(t);
            setPhase('over');
          }
          return;
        }
        if (phaseRef.current === 'countdown' && t.status === 'LIVE') {
          setPhase('live');
          sfx.go();
        }
        setTick(t);
      } catch (e) {
        failsRef.current += 1;
        if (failsRef.current >= 3) setOffline(true);
      }
    },
    [stopPoll],
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const { game: g, serverNow } = await api<{ game: CreatedGame; serverNow: number }>('/api/games', {
        method: 'POST',
        body: '{}',
      });
      setGame(g);
      setClockSkew(serverNow - Date.now());
      prevEquityRef.current = g.startBalance;
      overRef.current = false;
      setPhase('countdown');
      track('game_started');
      // Begin polling immediately (server handles the countdown window).
      void poll(g.id);
      stopPoll();
      pollRef.current = window.setInterval(() => void poll(g.id), 200);
    } catch (e) {
      setError(errMsg(e, 'Could not start the game.'));
    }
  }, [poll, stopPoll]);

  const trade = useCallback(
    async (action: TradeAction) => {
      if (!game || trading || overRef.current) return;
      setTrading(true);
      try {
        const t = await api<TickSnapshot>(`/api/games/${game.id}/trade`, {
          method: 'POST',
          body: JSON.stringify({ action }),
        });
        if (action !== 'CLOSE') {
          sfx.open();
          vibrate(10);
        }
        failsRef.current = 0;
        setOffline(false);
        prevEquityRef.current = t.equity;
        if (t.status === 'FINISHED' || t.status === 'LIQUIDATED') {
          overRef.current = true;
          stopPoll();
          setTick(t);
          setPhase('over');
          return;
        }
        setTick(t);
      } catch (e) {
        // Rejected trades surface as a soft error (no toast spam — HUD shows it).
        setError(errMsg(e, 'Trade rejected.'));
        setTimeout(() => setError((cur) => (cur && phaseRef.current === 'live' ? null : cur)), 2500);
      } finally {
        setTrading(false);
      }
    },
    [game, trading, stopPoll],
  );

  const retry = useCallback(() => {
    failsRef.current = 0;
    setOffline(false);
    if (game && !overRef.current) void poll(game.id);
  }, [game, poll]);

  // Countdown text synced to server start.
  useEffect(() => {
    if (phase !== 'countdown' || !game) return;
    let raf = 0;
    let last = '';
    const step = () => {
      const remain = game.startsAt - (Date.now() + clockSkew);
      const label = remain > 2600 ? '3' : remain > 1700 ? '2' : remain > 800 ? '1' : remain > 0 ? 'WICK.' : 'WICK.';
      if (label !== last) {
        last = label;
        setCountdown(label);
        if (label === 'WICK.') sfx.go();
        else sfx.count();
      }
      if (phaseRef.current === 'countdown') raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, game, clockSkew]);

  // Warn before abandoning a live run.
  useEffect(() => {
    if (phase !== 'live') return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [phase]);

  useEffect(() => stopPoll, [stopPoll]);

  return { phase, game, tick, clockSkew, error, offline, trading, countdown, start, trade, retry };
}

function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
