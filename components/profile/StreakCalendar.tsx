'use client';

import { useState } from 'react';
import { CountdownChip } from '@/components/ui/Countdown';
import type { RankedDay, StreakCalendar as StreakCalendarData } from '@/lib/types';
import { cn, fmtMoney } from '@/lib/utils';

const stateClass: Record<RankedDay['state'], string> = {
  PROFITABLE: 'bg-ww-win/80 border-ww-win/70',
  WICKED: 'bg-ww-loss/75 border-ww-loss/70',
  FLAT: 'bg-ww-muted/35 border-ww-muted/40',
  NOT_PLAYED: 'bg-ww-bg border-ww-border',
};

const stateLabel: Record<RankedDay['state'], string> = {
  PROFITABLE: 'profitable',
  WICKED: 'wicked',
  FLAT: 'flat',
  NOT_PLAYED: 'not played',
};

function dayLabel(day: RankedDay): string {
  return new Date(`${day.date}T12:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function StreakCalendar({ calendar }: { calendar: StreakCalendarData }) {
  const [selected, setSelected] = useState<RankedDay | null>(null);
  const hasHistory = calendar.days.some((day) => day.state !== 'NOT_PLAYED');

  if (!hasHistory) {
    return (
      <section className="ww-panel mt-6 p-5 sm:p-6" aria-label="Wick history">
        <h2 className="font-display text-base font-bold text-ww-text">YOUR WICK HISTORY</h2>
        <p className="mt-2 font-display text-2xl font-bold text-ww-text">{calendar.currentStreak > 0 ? `🔥 ${calendar.currentStreak} DAYS` : 'NO STREAK YET'}</p>
        <p className="mt-1 font-sans text-sm text-ww-muted">No ranked days yet.</p>
        <a href="/play" className="mt-4 inline-block rounded-md bg-ww-text px-4 py-2.5 font-sans text-sm font-bold text-ww-bg">PLAY TODAY&apos;S WICK</a>
      </section>
    );
  }

  return (
    <section className="ww-panel mt-6 p-5 sm:p-6" aria-label="Streak calendar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="ww-label">CURRENT STREAK</p>
          <p className="mt-1 font-display text-3xl font-bold text-ww-text">{calendar.currentStreak > 0 ? `🔥 ${calendar.currentStreak} DAYS` : '0 DAYS'}</p>
        </div>
        {calendar.streakAtRisk && (
          <div className="text-left sm:text-right">
            <p className="ww-label !text-ww-loss">STREAK AT RISK</p>
            <CountdownChip targetMs={new Date(calendar.resetAt).getTime()} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-ww-text">STREAK CALENDAR</h2>
        <p className="ww-mono text-[11px] text-ww-muted">LAST 12 WEEKS</p>
      </div>
      <div className="mt-3 overflow-hidden" role="grid" aria-label="Ranked Wick history for the last 12 weeks">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 sm:gap-2">
          {calendar.days.map((day) => {
            const label = `${dayLabel(day)} — ${stateLabel[day.state]}${day.score == null ? '' : ` — score ${day.score.toLocaleString()}`}`;
            return (
              <button
                key={day.date}
                type="button"
                role="gridcell"
                aria-label={day.today ? `${label} — today` : label}
                onClick={() => setSelected((current) => current?.date === day.date ? null : day)}
                className={cn('aspect-square min-w-0 rounded-[3px] border transition-colors focus-visible:ring-2 focus-visible:ring-ww-win', stateClass[day.state], day.today && 'ring-2 ring-ww-text ring-offset-1 ring-offset-ww-elevated', day.activeStreak && 'shadow-[0_0_0_1px_rgba(53,229,139,0.45)]')}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Calendar legend">
        {(['PROFITABLE', 'WICKED', 'FLAT', 'NOT_PLAYED'] as const).map((state) => (
          <span key={state} className="flex items-center gap-1.5 font-sans text-[11px] text-ww-muted">
            <span className={cn('h-2.5 w-2.5 rounded-[2px] border', stateClass[state])} aria-hidden />
            {state === 'PROFITABLE' ? 'PROFIT' : state === 'WICKED' ? 'LOSS' : state === 'FLAT' ? 'FLAT' : 'NOT PLAYED'}
          </span>
        ))}
      </div>
      {selected && (
        <div className="mt-4 border-t border-ww-border pt-3" role="status">
          <p className="ww-label">{dayLabel(selected)}{selected.today ? ' · TODAY' : ''}</p>
          <p className="mt-1 font-sans text-sm font-semibold text-ww-text">{stateLabel[selected.state].toUpperCase()}</p>
          {selected.score != null && <p className="ww-mono mt-1 text-xs text-ww-secondary">SCORE {selected.score.toLocaleString()} · P&amp;L {fmtMoney(selected.pnl ?? 0)}</p>}
        </div>
      )}
    </section>
  );
}