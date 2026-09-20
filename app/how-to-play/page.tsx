import type { Metadata } from 'next';
import Link from 'next/link';
import { SCORING } from '@/lib/game/scoring';

export const metadata: Metadata = {
  title: 'How to play',
  description: 'WICK WARS rules: long, short, close. Scoring is public — no hidden formulas.',
};

const ROWS: Array<[string, string]> = [
  ['Finish the round', `+${SCORING.baseFinish} base (${SCORING.baseNoTrade} if you never trade)`],
  ['ROI', `±${SCORING.roiPerPct} pts per 1% (capped ${SCORING.perfFloor}…+${SCORING.perfCap})`],
  ['Win rate', `Up to +${SCORING.winRateWeight} at 100% closed-trade wins`],
  ['Discipline', `+${SCORING.disciplineBonus} for 1–10 trades`],
  ['Overtrading', `−${SCORING.overtradePenaltyPer} per trade beyond ${SCORING.overtradeThreshold}`],
  ['Drawdown', `−${SCORING.drawdownPerPct} per 1% peak-to-trough (max −${SCORING.drawdownCap})`],
  ['Survival', `+${SCORING.survivalBonus} — or −${SCORING.liquidationPenalty} if liquidated`],
  ['Streak', `+${SCORING.streakPerDay} per straight profitable day (max +${SCORING.streakCap})`],
];

export default function HowToPlay() {
  return (
    <div className="ww-container max-w-3xl py-8 sm:py-12">
      <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">FIELD MANUAL</p>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-ww-text sm:text-5xl">HOW TO PLAY</h1>

      <section className="ww-panel mt-8 p-5 sm:p-7" aria-label="The loop">
        <h2 className="font-display text-xl font-bold text-ww-text">THE LOOP — 45 SECONDS</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            ['START WITH $10,000 VIRTUAL', 'Every daily round starts flat with the same balance and the same chart as everyone else. 10x leverage applies to every position.'],
            ['LONG, SHORT, OR HOLD', 'LONG rides price up, SHORT rides it down. Pressing the opposite side flips your position. CLOSE banks it. No position, no glory.'],
            ['SURVIVE THE WICK', 'Somewhere mid-round the market does something violent. If your equity drops to 5% of start, you are liquidated and the run ends.'],
            ['BANK THE CARD', 'Score, rank, P&L and every candle become a 1200×1500 performance card. Download it, post it, defend it tomorrow.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="ww-mono text-sm font-bold text-ww-win">0{i + 1}</span>
              <div>
                <p className="font-display text-[15px] font-bold text-ww-text">{t}</p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ww-secondary">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ww-panel mt-4 p-5 sm:p-7" aria-label="Scoring">
        <h2 className="font-display text-xl font-bold text-ww-text">SCORING — NO HIDDEN FORMULA</h2>
        <p className="mt-2 font-sans text-sm text-ww-secondary">
          Scores are computed on the server from verified fills. Max {SCORING.scoreMax.toLocaleString()}. Same rules for everyone:
        </p>
        <dl className="mt-4 divide-y divide-ww-border overflow-hidden rounded-lg border border-ww-border">
          {ROWS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 bg-ww-surface/50 px-4 py-2.5">
              <dt className="font-sans text-sm font-semibold text-ww-text">{k}</dt>
              <dd className="ww-mono text-right text-[13px] text-ww-secondary">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ww-panel mt-4 p-5 sm:p-7" aria-label="Fair play">
        <h2 className="font-display text-xl font-bold text-ww-text">FAIR PLAY</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 font-sans text-sm leading-relaxed text-ww-secondary">
          <li>Everyone in a daily window trades the identical deterministic scenario.</li>
          <li>Future prices are never sent to your browser — the server reveals the chart tick by tick.</li>
          <li>Execution prices come from the server clock, not your clicks.</li>
          <li>Only verified runs appear on leaderboards. Interrupted runs stay unverified.</li>
          <li>Simulated performance. Not trading advice. Not real markets.</li>
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/play" className="flex-1 rounded-lg bg-ww-text px-6 py-3.5 text-center font-display text-sm font-bold tracking-wide text-ww-bg">
          PLAY THE DAILY WICK
        </Link>
        <Link href="/leaderboard" className="flex-1 rounded-lg border border-ww-border-strong bg-ww-surface px-6 py-3.5 text-center font-sans text-sm font-semibold text-ww-text">
          TODAY&apos;S BOARD
        </Link>
      </div>
    </div>
  );
}
