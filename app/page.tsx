'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HeroChart } from '@/components/landing/HeroChart';
import { ChallengePanel } from '@/components/landing/ChallengePanel';
import { LeaderboardPreview } from '@/components/landing/LeaderboardPreview';
import { Button } from '@/components/ui/Button';
import { AuthModal } from '@/components/auth/AuthModal';
import { usePlayer } from '@/lib/client/usePlayer';
import { useSeason } from '@/lib/client/useSeason';
import { track } from '@/lib/client/analytics';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: [0.2, 0.8, 0.3, 1] as const },
};

export default function Landing() {
  const { player } = usePlayer();
  const { season } = useSeason();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    track('landing_viewed');
  }, []);

  const play = (from: string) => track('play_clicked', { from });

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="ww-container pt-10 sm:pt-16" aria-label="Play WICK WARS">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}>
            <div className="flex items-center gap-2.5">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-ww-win" aria-hidden />
              <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-secondary">
                {season ? `${season.id} · DAILY WICK · LIVE` : 'DAILY WICK · LIVE'}
              </p>
            </div>
            <h1 className="mt-4 font-display text-[44px] font-bold leading-[1.02] tracking-tight text-ww-text sm:text-6xl lg:text-[68px]">
              TRADE THE CHART.
              <br />
              <span className="text-ww-win">SURVIVE</span> THE WICK.
            </h1>
            <p className="mt-5 max-w-md font-sans text-[16px] leading-relaxed text-ww-secondary sm:text-lg">
              A 45-second trading arcade. Go long, go short, close before the wick gets you. Every run mints a
              performance card worth posting.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {player ? (
                <Link href="/play" onClick={() => play('hero')} className="w-full sm:w-auto">
                  <Button size="xl" className="w-full font-display font-bold tracking-wide sm:w-auto">
                    PLAY WICK
                  </Button>
                </Link>
              ) : (
                <Button size="xl" onClick={() => { play('hero'); setAuthOpen(true); }} className="w-full font-display font-bold tracking-wide sm:w-auto">
                  PLAY WICK
                </Button>
              )}
              <Link href="/how-to-play" className="w-full sm:w-auto">
                <Button size="xl" variant="secondary" className="w-full font-semibold sm:w-auto">
                  HOW IT WORKS
                </Button>
              </Link>
            </div>
            <p className="ww-mono mt-4 text-xs text-ww-muted">FREE TO PLAY · NO WALLET TRANSACTION TO START</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.8, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="ww-panel relative overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4">
                <p className="ww-mono text-xs font-semibold tracking-[0.14em] text-ww-secondary">WICK/USD · LIVE SIM</p>
                <p className="ww-mono text-xs text-ww-muted">45s ROUNDS</p>
              </div>
              <div className="h-[240px] px-2 pb-2 sm:h-[280px]">
                <HeroChart />
              </div>
            </div>
            <ChallengePanel />
          </motion.div>
        </div>
      </section>

      {/* ---------- BOARD + HOW ---------- */}
      <section className="ww-container mt-16 grid gap-6 sm:mt-24 lg:grid-cols-2" aria-label="Leaderboard and rules">
        <motion.div {...fadeUp}>
          <LeaderboardPreview />
        </motion.div>
        <motion.div {...fadeUp} className="ww-panel flex flex-col justify-between p-5 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ww-text">THREE BUTTONS. ZERO MERCY.</h2>
            <ol className="mt-5 flex flex-col gap-5">
              {[
                { n: '01', t: 'PICK A SIDE', d: 'LONG the pump or SHORT the dump. $10,000 virtual. 10x nerves.', c: 'text-ww-win' },
                { n: '02', t: 'RIDE THE WICK', d: '45 seconds of live simulated price action. Close before it closes you.', c: 'text-ww-text' },
                { n: '03', t: 'CARD IT', d: 'Score, rank and P&L become a 1200×1500 performance card. Post the win. Post the pain.', c: 'text-ww-loss' },
              ].map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className={`ww-mono text-sm font-bold ${s.c}`}>{s.n}</span>
                  <div>
                    <p className="font-display text-[15px] font-bold tracking-tight text-ww-text">{s.t}</p>
                    <p className="mt-1 font-sans text-sm leading-relaxed text-ww-secondary">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Link href="/how-to-play" className="mt-6 font-sans text-sm font-semibold text-ww-secondary transition-colors hover:text-ww-text">
            Full rules + scoring →
          </Link>
        </motion.div>
      </section>

      {/* ---------- CARDS ---------- */}
      <section className="ww-container mt-16 sm:mt-24" aria-label="Example performance cards">
        <motion.div {...fadeUp} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">EVERY RUN MINTS PROOF</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ww-text sm:text-4xl">
              Win or get wicked.
              <br />
              Either way, you post it.
            </h2>
          </div>
          <p className="max-w-sm font-sans text-sm leading-relaxed text-ww-secondary">
            Real candles, real entries and exits, real rank — rendered into a share card from the art-directed WICK
            template. Examples below.
          </p>
        </motion.div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            { src: '/examples/card-win.png', alt: 'Example profitable WICK WARS performance card', tag: 'PROFITABLE', win: true },
            { src: '/examples/card-loss.png', alt: 'Example losing WICK WARS performance card', tag: 'WICKED', win: false },
          ].map((c, i) => (
            <motion.figure
              key={c.src}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="ww-panel group relative overflow-hidden p-3"
            >
              <span
                className={`ww-mono absolute left-6 top-6 z-10 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em] ${
                  c.win ? 'bg-ww-win/15 text-ww-win' : 'bg-ww-loss/15 text-ww-loss'
                }`}
              >
                {c.tag} · EXAMPLE
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.src}
                alt={c.alt}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-lg object-cover object-top transition-transform duration-300 group-hover:scale-[1.01]"
              />
            </motion.figure>
          ))}
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="ww-container mt-16 sm:mt-24" aria-label="Start playing">
        <motion.div {...fadeUp} className="ww-panel relative overflow-hidden px-6 py-12 text-center sm:py-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ww-win/40 to-transparent" aria-hidden />
          <h2 className="mx-auto max-w-xl font-display text-3xl font-bold tracking-tight text-ww-text sm:text-5xl">
            YOUR FIRST WICK IS WAITING.
          </h2>
          <p className="mx-auto mt-3 max-w-md font-sans text-[15px] text-ww-secondary">
            45 seconds. One chart. No wallet transaction required. See where you land on today&apos;s board.
          </p>
          <div className="mt-7 flex justify-center">
            {player ? (
              <Link href="/play" onClick={() => play('final_cta')}>
                <Button size="xl" className="font-display font-bold tracking-wide">
                  PLAY THE DAILY WICK
                </Button>
              </Link>
            ) : (
              <Button size="xl" onClick={() => { play('final_cta'); setAuthOpen(true); }} className="font-display font-bold tracking-wide">
                PLAY THE DAILY WICK
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onDone={() => { window.location.href = '/play'; }} />
    </div>
  );
}
