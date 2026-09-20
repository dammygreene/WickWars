'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  username: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  accent?: 'win' | 'loss' | 'none';
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({ username, src, size = 'md', accent = 'none' }: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (username.replace(/^@/, '').charAt(0) || '?').toUpperCase();
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ww-surface2 font-display font-bold text-ww-secondary',
        SIZES[size],
        accent === 'win' && 'ring-2 ring-ww-win/70 ring-offset-2 ring-offset-ww-bg',
        accent === 'loss' && 'ring-2 ring-ww-loss/70 ring-offset-2 ring-offset-ww-bg',
      )}
      aria-hidden
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
      ) : (
        initial
      )}
    </span>
  );
}
