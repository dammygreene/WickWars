'use client';

import { useEffect, useState } from 'react';

export function useCountdown(targetMs: number): { h: string; m: string; s: string; done: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, targetMs - now);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return { h, m, s, done: ms <= 0 };
}

export function CountdownChip({ targetMs }: { targetMs: number }) {
  const { h, m, s } = useCountdown(targetMs);
  return (
    <span className="ww-mono inline-flex items-center gap-1 rounded-md border border-ww-border bg-ww-surface px-2.5 py-1 text-[13px] text-ww-text" aria-label="Time left in challenge">
      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-ww-win" aria-hidden />
      {h}:{m}:{s}
    </span>
  );
}
