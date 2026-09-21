'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { AtmosphereBackground, type AtmosphereState } from '@/components/ui/AtmosphereBackground';

export type FeedbackState = 'neutral' | 'profit' | 'loss' | 'impact' | 'liquidated' | 'round-end';
export type FeedbackEvent = { id: number; type: 'entry' | 'close-win' | 'close-loss' | 'impact' | 'liquidated' };

interface Props {
  state: FeedbackState;
  intensity: number;
  event: FeedbackEvent | null;
}

export function GameFeedbackLayer({ state, intensity, event }: Props) {
  const [pulse, setPulse] = useState<FeedbackEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setPulse(event);
    const timeout = window.setTimeout(() => setPulse(null), event.type === 'liquidated' ? 520 : 240);
    return () => window.clearTimeout(timeout);
  }, [event]);

  const vars = useMemo(
    () => ({ '--feedback-intensity': Math.max(0, Math.min(1, intensity)) }) as CSSProperties,
    [intensity],
  );
  const atmosphereState: AtmosphereState =
    state === 'liquidated'
      ? 'liquidation'
      : state === 'profit'
        ? intensity > 0.45
          ? 'intense-profit'
          : 'profit'
        : state === 'loss'
          ? intensity > 0.45
            ? 'intense-loss'
            : 'loss'
          : 'neutral';
  return (
    <>
      <AtmosphereBackground state={atmosphereState} className="game-atmosphere" />
      <div className={cn('game-feedback-layer', `game-feedback-${state}`)} style={vars} aria-hidden />
      <div
        className={cn(
          'game-feedback-impact',
          pulse?.type === 'impact' && 'game-feedback-impact-active',
          pulse?.type === 'liquidated' && 'game-feedback-liquidated-active',
        )}
        aria-hidden
      />
    </>
  );
}