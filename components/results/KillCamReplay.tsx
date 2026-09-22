'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameChart } from '@/components/game/GameChart';
import { GameFeedbackLayer, type FeedbackEvent } from '@/components/game/GameFeedbackLayer';
import { Button } from '@/components/ui/Button';
import type { GameResult, KillCamFrame, KillCamReplay as KillCamReplayData } from '@/lib/types';
import { cn, fmtMoney } from '@/lib/utils';
import type { TickSnapshot } from '@/lib/game/tick';

interface Props {
  replay: KillCamReplayData;
  result: GameResult;
}

export function KillCamReplay({ replay, result }: Props) {
  const frameRef = useRef<TickSnapshot | null>(null);
  const nowRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const [event, setEvent] = useState<FeedbackEvent | null>(null);

  const setFrame = useCallback(
    (frame: KillCamFrame) => {
      frameRef.current = {
        status: frame.t >= replay.durationMs ? 'LIQUIDATED' : 'LIVE',
        serverNow: Date.now(),
        countdownMs: 0,
        t: frame.t,
        price: frame.price,
        candles: frame.candles,
        equity: frame.equity,
        pnl: frame.pnl,
        unrealized: frame.unrealized,
        side: frame.side,
        entryPrice: frame.entryPrice,
        trades: frame.events.filter((trade) => trade.action === 'CLOSE').length,
        provisionalScore: result.score,
        provisionalRank: result.rank || null,
        rankTotal: result.rankTotal,
        events: frame.events,
        ghostEvents: [],
        result: null,
      };
      nowRef.current = frame.t;
    },
    [replay.durationMs, result.rank, result.rankTotal, result.score],
  );

  const stop = useCallback(() => {
    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (impactTimerRef.current != null) window.clearTimeout(impactTimerRef.current);
    impactTimerRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setComplete(false);
    setEvent(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const last = replay.frames[replay.frames.length - 1];
    if (reduced || replay.durationMs <= 0) {
      setFrame(last);
      setComplete(true);
      return;
    }

    setPlaying(true);
    const startedAt = performance.now();
    const playbackDuration = replay.durationMs / 0.4;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / playbackDuration);
      const index = Math.min(replay.frames.length - 1, Math.floor(progress * (replay.frames.length - 1)));
      setFrame(replay.frames[index]);
      if (index === replay.frames.length - 1) {
        setPlaying(false);
        setComplete(true);
        setEvent({ id: Date.now(), type: 'liquidated' });
        impactTimerRef.current = window.setTimeout(() => setEvent(null), 520);
        rafRef.current = null;
        return;
      }
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
  }, [replay.durationMs, replay.frames, setFrame, stop]);

  useEffect(() => {
    setFrame(replay.frames[0]);
    void play();
    return stop;
  }, [play, replay.frames, setFrame, stop]);

  const frame = frameRef.current;
  if (!frame) return null;

  return (
    <section className="relative mt-6 overflow-hidden rounded-xl border border-ww-loss/30 bg-ww-elevated" aria-label="Liquidation replay">
      <GameFeedbackLayer state={event ? 'liquidated' : 'neutral'} intensity={1} event={event} />
      <div className="relative z-[1] px-4 pb-4 pt-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="ww-label !text-ww-loss">KILL-CAM REPLAY</p>
            <p className="mt-1 font-sans text-sm text-ww-secondary">The verified final moments of this run.</p>
          </div>
          {complete && <span className="ww-mono text-xs font-bold tracking-[0.16em] text-ww-loss">LIQUIDATED</span>}
        </div>
        <div className={cn('relative mt-4 h-[260px] overflow-hidden rounded-lg border border-ww-border bg-ww-bg sm:h-[340px]', event && 'animate-[ww-game-shake_180ms_ease-out]')}>
          <GameChart getTick={() => frameRef.current} getNow={() => nowRef.current} durationMs={replay.durationMs} />
          {complete && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ww-bg/20">
              <p className="font-display text-4xl font-bold tracking-tight text-ww-loss sm:text-6xl">LIQUIDATED</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="ww-mono text-sm text-ww-secondary">
            EQUITY <span className="font-bold text-ww-text">{fmtMoney(frame.equity)}</span>
          </p>
          <Button size="sm" variant="secondary" onClick={play} aria-label="Watch liquidation replay again">
            {playing ? 'REPLAYING' : 'WATCH REPLAY'}
          </Button>
        </div>
      </div>
    </section>
  );
}
