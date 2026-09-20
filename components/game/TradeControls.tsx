'use client';

import { useEffect } from 'react';
import type { TradeAction } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  side: 'FLAT' | 'LONG' | 'SHORT';
  disabled: boolean;
  trading: boolean;
  onTrade: (a: TradeAction) => void;
}

export function TradeControls({ side, disabled, trading, onTrade }: Props) {
  // Desktop keyboard shortcuts: L / S / C (or arrows).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'l' || k === 'arrowup') onTrade('LONG');
      else if (k === 's' || k === 'arrowdown') onTrade('SHORT');
      else if (k === 'c' || k === 'x' || k === 'escape') onTrade('CLOSE');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, onTrade]);

  const btn =
    'relative flex h-16 sm:h-[68px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl font-display text-lg font-bold tracking-wide transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 select-none touch-manipulation';

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Trade actions">
      <button
        onClick={() => onTrade('LONG')}
        disabled={disabled || trading || side === 'LONG'}
        aria-label="Go long"
        className={cn(
          btn,
          'bg-ww-win text-[#06130c] hover:brightness-110',
          side === 'LONG' && 'ring-2 ring-ww-win ring-offset-2 ring-offset-ww-bg',
        )}
      >
        <span aria-hidden className="text-xl leading-none">▲</span>
        LONG
        <span className="hidden font-mono text-[10px] font-medium opacity-60 sm:block">L / ↑</span>
      </button>
      <button
        onClick={() => onTrade('CLOSE')}
        disabled={disabled || trading || side === 'FLAT'}
        aria-label="Close position"
        className={cn(btn, 'border border-ww-border-strong bg-ww-surface text-ww-text hover:bg-ww-surface2')}
      >
        <span aria-hidden className="text-xl leading-none">✕</span>
        CLOSE
        <span className="hidden font-mono text-[10px] font-medium text-ww-muted sm:block">C / X</span>
      </button>
      <button
        onClick={() => onTrade('SHORT')}
        disabled={disabled || trading || side === 'SHORT'}
        aria-label="Go short"
        className={cn(
          btn,
          'bg-ww-loss text-[#1a0508] hover:brightness-110',
          side === 'SHORT' && 'ring-2 ring-ww-loss ring-offset-2 ring-offset-ww-bg',
        )}
      >
        <span aria-hidden className="text-xl leading-none">▼</span>
        SHORT
        <span className="hidden font-mono text-[10px] font-medium opacity-60 sm:block">S / ↓</span>
      </button>
    </div>
  );
}
