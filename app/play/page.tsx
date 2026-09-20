'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/lib/client/useGame';
import { usePlayer } from '@/lib/client/usePlayer';
import { GameChart } from '@/components/game/GameChart';
import { TradeControls } from '@/components/game/TradeControls';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { CountdownChip } from '@/components/ui/Countdown';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { isSoundOn, setSound, onSoundChange } from '@/lib/client/sound';
import { cn, fmtClock, fmtMoney, fmtSignedMoney } from '@/lib/utils';
import type { DailyChallenge } from '@/lib/types';

export default function PlayPage() {
  const { player, loading: authLoading } = usePlayer();
  const game = useGame();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [brief, setBrief] = useState<null | {
    challenge: DailyChallenge;
    myBest: { score: number; rank: number } | null;
    topScore: number | null;
  }>(null);
  const [sound, setSoundUi] = useState(false);

  useEffect(() => {
    setSoundUi(isSoundOn());
    return onSoundChange(setSoundUi);
  }, []);

  useEffect(() => {
    api<{
      challenge: DailyChallenge;
      top: Array<{ score: number }>;
      myBest: { score: number; rank: number } | null;
    }>('/api/challenge/today')
      .then((d) => setBrief({ challenge: d.challenge, myBest: d.myBest, topScore: d.top[0]?.score ?? null }))
      .catch(() => setBrief(null));
  }, []);

  // Redirect to the result screen when the run ends.
  useEffect(() => {
    if (game.phase === 'over' && game.game) {
      track('game_completed');
      const id = setTimeout(() => router.push(`/results/${game.game!.id}`), 900);
      return () => clearTimeout(id);
    }
  }, [game.phase, game.game, router]);

  // Smooth local game-time estimate for the chart + timer.
  const tickRef = useRef(game.tick);
  tickRef.current = game.tick;
  const receivedAt = useRef(0);
  useEffect(() => {
    receivedAt.current = Date.now();
  }, [game.tick]);
  const getNow = useMemo(() => {
    const fn = () => {
      const t = tickRef.current;
      if (!t) return 0;
      return t.t + (Date.now() - receivedAt.current);
    };
    return fn;
  }, []);
  const [, force] = useState(0);
  useEffect(() => {
    if (game.phase !== 'live') return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [game.phase]);

  if (authLoading) {
    return (
      <div className="ww-container max-w-3xl">
        <LoadingState label="LOADING PLAYER" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="ww-container max-w-md py-16 text-center">
        <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">DAILY WICK</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ww-text">CONNECT TO PLAY.</h1>
        <p className="mt-3 font-sans text-[15px] text-ww-secondary">
          Pick a handle, link X, or verify a wallet. Takes ten seconds — then you&apos;re in the arena.
        </p>
        <Button size="lg" className="mt-7 w-full font-bold" onClick={() => setAuthOpen(true)}>
          CONNECT + PLAY
        </Button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  if (game.phase === 'brief') {
    return (
      <div className="ww-container max-w-2xl py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex items-center justify-between">
            <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">DAILY WICK · {brief?.challenge.seasonId ?? 'S01'}</p>
            {brief && <CountdownChip targetMs={new Date(brief.challenge.endsAt).getTime()} />}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ww-text sm:text-5xl">READY?</h1>
          <p className="mt-2 font-sans text-[15px] text-ww-secondary">
            @{player.username} · {fmtMoney(brief?.challenge.startingBalance ?? 10000, 0)} virtual · 10x leverage · 45 seconds.
          </p>

          <div className="ww-panel mt-6 grid grid-cols-2 divide-x divide-ww-border sm:grid-cols-4">
            {[
              { l: 'DURATION', v: '45s' },
              { l: 'PAIR', v: brief?.challenge.pair ?? 'WICK/USD' },
              { l: 'TOP TODAY', v: brief?.topScore != null ? brief.topScore.toLocaleString() : '—' },
              { l: 'YOUR BEST', v: brief?.myBest ? `#${brief.myBest.rank} · ${brief.myBest.score.toLocaleString()}` : '—' },
            ].map((s) => (
              <div key={s.l} className="px-4 py-4 text-center">
                <p className="ww-mono text-[15px] font-bold text-ww-text">{s.v}</p>
                <p className="ww-label mt-1">{s.l}</p>
              </div>
            ))}
          </div>

          {game.error && (
            <p className="mt-4 rounded-lg border border-ww-loss/30 bg-ww-loss/[0.06] px-4 py-2.5 font-sans text-sm text-ww-loss" role="alert">
              {game.error}
            </p>
          )}

          <Button size="xl" className="mt-6 w-full font-display text-lg font-bold tracking-wide" onClick={game.start}>
            START ROUND
          </Button>
          <p className="mt-3 text-center font-sans text-[13px] text-ww-muted">
            LONG / SHORT / CLOSE · Keyboard: L · S · C · Sound is off by default.
          </p>
        </motion.div>
      </div>
    );
  }

  const t = game.tick;
  const dur = game.game?.durationMs ?? 45000;
  const remainMs = t ? Math.max(0, dur - getNow()) : dur;
  const pnlUp = (t?.pnl ?? 0) >= 0;

  return (
    <div className="ww-container max-w-5xl pb-10 pt-4 sm:pt-6">
      {/* HUD */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-ww-win" aria-hidden />
          <span className="ww-mono text-xs font-semibold tracking-[0.14em] text-ww-secondary">{game.game?.mode ?? 'DAILY WICK'}</span>
        </div>
        <button
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          aria-label={sound ? 'Mute sound' : 'Enable sound'}
          className="flex h-9 items-center gap-1.5 rounded-md border border-ww-border px-2.5 font-mono text-xs text-ww-secondary transition-colors hover:text-ww-text"
        >
          {sound ? '🔊 ON' : '🔇 OFF'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3" role="status" aria-label="Game status">
        <HudCell label="TIME" value={fmtClock(remainMs)} mono accent={remainMs < 10000 ? 'text-ww-loss' : 'text-ww-text'} />
        <HudCell
          label="P&L"
          value={t ? fmtSignedMoney(t.pnl) : '—'}
          mono
          accent={pnlUp ? 'text-ww-win' : 'text-ww-loss'}
          flash={t ? (pnlUp ? 'up' : 'down') : undefined}
          flashKey={t ? Math.round(t.pnl) : 0}
        />
        <HudCell label="EQUITY" value={t ? fmtMoney(t.equity) : '—'} mono />
        <HudCell
          label={game.phase === 'over' ? 'RANK' : 'PROJ. RANK'}
          value={t?.provisionalRank != null ? `#${t.provisionalRank}` : '—'}
          mono
        />
      </div>

      {/* Chart */}
      <div className="ww-panel relative mt-3 overflow-hidden">
        <div className="h-[320px] sm:h-[420px]">
          <GameChart getTick={() => tickRef.current} getNow={getNow} durationMs={dur} frozen={game.phase === 'over'} />
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {game.phase === 'countdown' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-ww-bg/60 backdrop-blur-[2px]"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.p
                key={game.countdown}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.3, 1] }}
                className={cn(
                  'font-display text-7xl font-bold tracking-tight sm:text-8xl',
                  game.countdown === 'WICK.' ? 'text-ww-win' : 'text-ww-text',
                )}
                aria-live="assertive"
              >
                {game.countdown}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline overlay */}
        <AnimatePresence>
          {game.offline && game.phase === 'live' && (
            <motion.div
              className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b border-ww-loss/40 bg-[#160b0d]/95 px-4 py-2.5"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              role="alert"
            >
              <p className="font-sans text-[13px] font-semibold text-ww-loss">CONNECTION LOST — run is paused server-side.</p>
              <button onClick={game.retry} className="rounded-md bg-ww-loss px-3 py-1.5 font-sans text-[13px] font-bold text-white">
                RECONNECT
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game-over veil */}
        {game.phase === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center bg-ww-bg/70 backdrop-blur-[2px]">
            <div className="text-center">
              <p className={cn('font-display text-4xl font-bold tracking-tight sm:text-5xl', t && t.pnl >= 0 ? 'text-ww-win' : 'text-ww-loss')}>
                {t?.status === 'LIQUIDATED' ? 'YOU GOT WICKED' : t && t.pnl >= 0 ? 'PROFITABLE' : 'WICKED'}
              </p>
              <p className="ww-label mt-2">{t?.status === 'LIQUIDATED' ? 'LIQUIDATED' : 'CALCULATING FINAL SCORE…'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Position strip */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ww-border bg-ww-elevated px-4 py-3">
        <PositionBadge side={t?.side ?? 'FLAT'} entry={t?.entryPrice ?? null} />
        <div className="text-right">
          <p className="ww-label">Score (live)</p>
          <p className="ww-mono text-lg font-bold text-ww-text">{t?.provisionalScore.toLocaleString() ?? '—'}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="ww-label">Trades</p>
          <p className="ww-mono text-lg font-bold text-ww-text">{t?.trades ?? 0}</p>
        </div>
      </div>

      {game.error && game.phase === 'live' && (
        <p className="mt-3 rounded-lg border border-ww-loss/30 bg-ww-loss/[0.06] px-4 py-2.5 text-center font-sans text-sm text-ww-loss" role="alert">
          {game.error}
        </p>
      )}

      {/* Controls */}
      <div className="sticky bottom-3 mt-3 sm:static">
        <TradeControls
          side={t?.side ?? 'FLAT'}
          disabled={game.phase !== 'live' || game.offline}
          trading={game.trading}
          onTrade={game.trade}
        />
      </div>
      <p className="mt-2 text-center font-sans text-xs text-ww-disabled sm:hidden">One thumb. No mercy.</p>
    </div>
  );
}

function HudCell({
  label,
  value,
  mono,
  accent,
  flash,
  flashKey,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
  flash?: 'up' | 'down';
  flashKey?: number;
}) {
  return (
    <div className="rounded-xl border border-ww-border bg-ww-elevated px-2 py-2.5 text-center sm:px-4 sm:py-3">
      <p className="ww-label">{label}</p>
      <p
        key={flashKey}
        className={cn(
          'mt-0.5 truncate text-[15px] font-bold sm:text-xl',
          mono ? 'ww-mono' : 'font-display',
          accent ?? 'text-ww-text',
          flash === 'up' && 'tick-flash-up',
          flash === 'down' && 'tick-flash-down',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PositionBadge({ side, entry }: { side: 'FLAT' | 'LONG' | 'SHORT'; entry: number | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'ww-mono rounded-md px-2.5 py-1.5 text-[13px] font-bold tracking-wider',
          side === 'LONG' && 'bg-ww-win/15 text-ww-win',
          side === 'SHORT' && 'bg-ww-loss/15 text-ww-loss',
          side === 'FLAT' && 'bg-ww-surface2 text-ww-muted',
        )}
        aria-live="polite"
      >
        {side === 'FLAT' ? 'FLAT' : side === 'LONG' ? '▲ LONG' : '▼ SHORT'}
      </span>
      {entry != null && side !== 'FLAT' && (
        <span className="ww-mono text-[13px] text-ww-secondary">@ {entry.toFixed(2)}</span>
      )}
      {side === 'FLAT' && <span className="hidden font-sans text-[13px] text-ww-muted sm:block">Pick a side.</span>}
    </div>
  );
}
