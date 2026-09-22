'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CardGenerator } from '@/components/cards/CardGenerator';
import { KillCamReplay } from '@/components/results/KillCamReplay';
import type { PlayerAchievements } from '@/lib/types';
import { ChallengeButton } from '@/components/results/ChallengeButton';
import { PlayAgainButton } from '@/components/results/PlayAgainButton';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { usePlayer } from '@/lib/client/usePlayer';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { cn, fmtDuration, fmtMoney, fmtPct, fmtSignedMoney } from '@/lib/utils';
import type { GameResult, KillCamReplay as KillCamReplayData, NearMiss } from '@/lib/types';

interface Data {
  result: GameResult;
  game: { id: string; mode: string; pair: string };
  replay: KillCamReplayData | null;
  challenge: { code: string; outcome: 'opponent_won' | 'challenger_won' | 'tie'; scoreDifference: number; challenger: { username: string; score: number; pnl: number; liquidated: boolean } } | null;
  ghost: { username: string; score: number; pnl: number; liquidated: boolean } | null;
  achievements: PlayerAchievements;
  streak: { current: number; rankedResult: boolean; updated: boolean };
  nearMiss: NearMiss;
  regime: { id: string; version: number; name: string; description: string } | null;
  player: { username: string; avatarUrl?: string; title: string } | null;
}

const TAG_COPY: Record<string, { big: string; sub: string }> = {
  PROFITABLE: { big: 'PROFITABLE', sub: 'Clean work. Card it.' },
  WICKED: { big: 'YOU GOT WICKED', sub: 'The chart humbled you. Run it back.' },
  PERSONAL_BEST: { big: 'PERSONAL BEST', sub: 'New peak. The board noticed.' },
  TOP_10: { big: 'TOP 10', sub: 'Elite territory. Defend it.' },
  LEGENDARY: { big: 'LEGENDARY', sub: 'Number one. Immortalize it.' },
};

export function ResultView({ gameId }: { gameId: string }) {
  const { player } = usePlayer();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [pnlShown, setPnlShown] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    api<Data>(`/api/games/${gameId}/result`)
      .then((d) => {
        setData(d);
        if (d.result.resultState === 'PERSONAL_BEST' || d.result.resultState === 'LEGENDARY') track('personal_best_reached');
      })
      .catch(() => setError(true));
  }, [gameId]);

  // P&L count-up reveal.
  useEffect(() => {
    if (!data || animated.current) return;
    animated.current = true;
    const target = data.result.pnl;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || Math.abs(target) < 0.01) {
      setPnlShown(target);
      return;
    }
    const t0 = performance.now();
    const dur = 800;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setPnlShown(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (error) {
    return (
      <div className="ww-container max-w-2xl py-12">
        <ErrorState title="COULDN'T LOAD THAT RUN" body="It may still be finalizing — wait a beat and retry." onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="ww-container max-w-2xl">
        <LoadingState label="LOADING RESULT" />
      </div>
    );
  }

  const { result: r, player: rp } = data;
  const won = r.pnl >= 0;
  const tag = TAG_COPY[r.resultState] ?? TAG_COPY[won ? 'PROFITABLE' : 'WICKED'];
  const isMine = player?.playerId === r.playerId;
  const isChallenge = r.runType === 'challenge';
  const isOnboarding = r.runType === 'onboarding';
  const isGhost = r.runType === 'ghost';
  const shareText = won
    ? `${fmtPct(r.roi)} in today's WICK WARS daily. Rank #${r.rank}. Think you can beat it?`
    : `I got wicked. Again. ${fmtPct(r.roi)} on today's WICK WARS daily.`;

  return (
    <div className="ww-container max-w-2xl pb-8 pt-8 sm:pt-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          {rp && <Avatar username={rp.username} src={rp.avatarUrl} size="sm" />}
          <p className="font-sans text-sm font-semibold text-ww-secondary">
            @{rp?.username ?? 'ghost'} · {r.mode} · {r.seasonId}
          </p>
        </div>
        <motion.p initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, delay: 0.1 }} className={cn('ww-mono mt-4 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.18em]', won ? 'bg-ww-win/10 text-ww-win' : 'bg-ww-loss/10 text-ww-loss')}>
          {r.resultState.replace('_', ' ')}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className={cn('mt-3 font-display text-[clamp(2rem,10vw,3.75rem)] font-bold leading-tight tracking-tight', won ? 'text-ww-win' : 'text-ww-loss')}>
          {tag.big}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.3 }} className="mt-2 font-sans text-[15px] text-ww-secondary">{tag.sub}</motion.p>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.38 }} className={cn('ww-mono mt-6 text-[clamp(2.1rem,11vw,3.75rem)] font-bold leading-none tracking-tight', won ? 'text-ww-win' : 'text-ww-loss')} aria-label={`Profit and loss ${fmtSignedMoney(r.pnl)}`}>
          {fmtSignedMoney(pnlShown)}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.52 }} className={cn('ww-mono mt-1 text-xl font-semibold', won ? 'text-ww-win/80' : 'text-ww-loss/80')}>
          ({r.roi >= 0 ? '▲' : '▼'} {fmtPct(r.roi).replace('+', '')})
        </motion.p>
        {r.liquidated && <p className="ww-label mt-2 !text-ww-loss">LIQUIDATED · POSITION CLOSED BY THE HOUSE</p>}
        {isOnboarding && <p className="ww-label mt-2 !text-ww-muted">ONBOARDING · NOT RANKED</p>}
        {data.regime && <p className="ww-mono mt-2 text-xs font-bold tracking-[0.16em] text-ww-secondary">{data.regime.name}</p>}
        <p className="ww-mono mt-1 text-xs font-bold tracking-[0.16em] text-ww-muted">{isChallenge || isOnboarding || isGhost ? r.mode : (r.runType ?? 'ranked').toUpperCase()} · {r.leverage ?? 10}x</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="ww-panel mt-8 grid grid-cols-2 divide-x divide-ww-border"
      >
        <div className="px-4 py-5 text-center">
          <p className="ww-label">{isOnboarding ? 'Lesson run' : 'Final score'}</p>
          <p className="mt-1 font-display text-4xl font-bold text-ww-text">{isOnboarding ? '—' : r.score.toLocaleString()}</p>
        </div>
        <div className="px-4 py-5 text-center">
            <p className="ww-label">{isOnboarding || isChallenge ? 'Run type' : 'Rank today'}</p>
            <p className="mt-1 font-display text-4xl font-bold text-ww-text">
              {isOnboarding ? 'LEARN' : isChallenge ? 'DUEL' : <>#{r.rank} <span className="text-lg text-ww-muted">/ {r.rankTotal}</span></>}
            </p>
        </div>
      </motion.div>

      {r.liquidated && data.replay && <KillCamReplay replay={data.replay} result={r} />}

      {isChallenge && data.challenge && (
        <div className="ww-panel mt-3 border-ww-win/30 p-5 text-center sm:p-6">
          <p className="ww-label !text-ww-win">HEAD-TO-HEAD</p>
          <p className="mt-2 font-display text-2xl font-bold text-ww-text">
            {data.challenge.outcome === 'opponent_won' ? 'YOU BEAT' : data.challenge.outcome === 'challenger_won' ? 'THEY BEAT YOU' : 'TIE GAME'}
          </p>
          <p className="mt-1 font-sans text-sm text-ww-secondary">
            @{data.challenge.challenger.username} · {data.challenge.scoreDifference.toLocaleString()} points {data.challenge.outcome === 'tie' ? '' : 'difference'}
          </p>
        </div>
      )}
      {isGhost && data.ghost && (
        <div className="ww-panel mt-3 border-ww-border-strong p-5 text-center sm:p-6">
          <p className="ww-label">GHOST DUEL</p>
          <p className="mt-2 font-display text-2xl font-bold text-ww-text">{r.score > data.ghost.score ? 'YOU BEAT' : r.score < data.ghost.score ? 'GHOST BEAT YOU' : 'TIE GAME'}</p>
          <p className="mt-1 font-sans text-sm text-ww-secondary">@{data.ghost.username} · {Math.abs(r.score - data.ghost.score).toLocaleString()} points difference</p>
        </div>
      )}

      <div className="mt-3 text-center" aria-live="polite">
        {isOnboarding ? (
          <p className="ww-mono text-xs tracking-[0.16em] text-ww-muted">RANKED PROGRESS UNCHANGED</p>
        ) : data.streak.rankedResult ? (
          <p className="ww-mono text-xs font-bold tracking-[0.16em] text-ww-win">{data.streak.current > 0 ? `🔥 ${data.streak.current} DAY STREAK` : 'STREAK BROKEN'}</p>
        ) : (
          <p className="ww-mono text-xs tracking-[0.16em] text-ww-muted">RANKED STREAK UNCHANGED · {data.streak.current} DAYS</p>
        )}
      </div>

      {!isOnboarding && data.nearMiss && (
        <p className={cn('mt-3 text-center font-sans text-sm font-semibold tracking-[0.08em]', data.nearMiss.type === 'liquidation_survival' || data.nearMiss.type === 'near_liquidation' ? 'text-ww-loss' : 'text-ww-secondary')}>
          {data.nearMiss.type === 'leaderboard_cutoff'
            ? `${data.nearMiss.pointsAway} POINTS FROM #${data.nearMiss.targetRank}`
            : data.nearMiss.type === 'leaderboard_tie'
              ? `TIED WITH #${data.nearMiss.targetRank}`
              : data.nearMiss.type === 'liquidation_survival'
                ? `LIQUIDATED AT ${data.nearMiss.liquidationEquityPercent.toFixed(1)}% EQUITY`
                : `YOU DROPPED TO ${data.nearMiss.minimumEquityPercent.toFixed(1)}% EQUITY`}
        </p>
      )}

      {data.achievements.newBadgeIds.length > 0 && (
        <div className="mt-3 text-center" role="status" aria-live="polite">
          <p className="ww-label !text-ww-win">BADGE UNLOCKED</p>
          <p className="mt-1 font-display text-lg font-bold text-ww-text">{data.achievements.badges.filter((badge) => data.achievements.newBadgeIds.includes(badge.id)).map((badge) => badge.name).join(' · ')}</p>
        </div>
      )}

      {isMine && !isOnboarding && <div className="mt-5"><PlayAgainButton sourceRunType={r.runType} /></div>}

      {!isOnboarding && <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="ww-panel mt-3 grid grid-cols-3 divide-x divide-ww-border sm:grid-cols-6"
      >
        {[
          { l: 'Trades', v: String(r.trades) },
          { l: 'Win rate', v: `${Math.round(r.winRate)}%` },
          { l: 'Hold', v: fmtDuration(r.holdTimeMs) },
          { l: 'Start', v: fmtMoney(r.startBalance, 0) },
          { l: 'End', v: fmtMoney(r.endBalance) },
          { l: 'Max DD', v: `${r.maxDrawdownPct.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.l} className="px-2 py-3.5 text-center">
            <p className="ww-mono text-[13px] font-bold text-ww-text sm:text-sm">{s.v}</p>
            <p className="ww-label mt-1">{s.l}</p>
          </div>
        ))}
      </motion.div>}

      {isOnboarding ? (
        <div className="ww-panel mt-6 border-ww-win/30 p-5 text-center sm:p-6">
          <p className="ww-label !text-ww-win">{r.liquidated ? "THAT'S WHAT GETTING WICKED LOOKS LIKE." : 'ONBOARDING COMPLETE'}</p>
          <p className="mt-2 font-sans text-sm text-ww-secondary">{r.liquidated ? 'Leverage can move your equity fast when price turns.' : 'You survived your first Wick.'}</p>
          <Link href="/play" className="mt-5 block"><Button size="lg" className="w-full font-bold tracking-wide">PLAY FOR REAL</Button></Link>
        </div>
      ) : <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="ww-panel mt-6 p-5 sm:p-6">
        <CardGenerator mode="game" gameId={gameId} shareText={shareText} />
      </motion.div>}

      {isMine && !isChallenge && !isOnboarding && <div className="mt-4"><ChallengeButton gameId={gameId} /></div>}
      {isMine && !isGhost && !isOnboarding && <Link href="/play?mode=ghost" className="mt-4 block"><Button size="lg" variant="secondary" className="w-full font-bold">GHOST DUEL</Button></Link>}

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        {!isMine && <Link href="/play" className="flex-1" onClick={() => track('replay_clicked')}><Button size="lg" className="w-full font-bold tracking-wide">PLAY WICK</Button></Link>}
        {rp && (
          <Link href={`/profile/${rp.username}`} className="flex-1">
            <Button size="lg" variant="secondary" className="w-full font-semibold">
              VIEW PROFILE
            </Button>
          </Link>
        )}
        <Link href="/leaderboard" className="flex-1">
          <Button size="lg" variant="secondary" className="w-full font-semibold">
            LEADERBOARD
          </Button>
        </Link>
      </div>
      {!r.verified && (
        <p className="mt-4 text-center font-sans text-[13px] text-ww-loss">UNVERIFIED RUN — not ranked. Replay to post a score.</p>
      )}
    </div>
  );
}
