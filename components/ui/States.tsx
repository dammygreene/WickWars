'use client';

import { cn } from '@/lib/utils';
import { Button } from './Button';

export function LoadingState({ label = 'LOADING', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)} role="status" aria-label={label}>
      <span className="flex items-end gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-ww-win"
            style={{ height: 20, animation: `ww-pulse-soft 1s ${i * 0.15}s ease-in-out infinite` }}
          />
        ))}
      </span>
      <p className="ww-label">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ww-border-strong px-6 py-14 text-center', className)}>
      <p className="font-display text-xl font-bold tracking-tight text-ww-text">{title}</p>
      {body && <p className="max-w-sm font-sans text-sm text-ww-secondary">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'SOMETHING BROKE',
  body = 'Give it another shot.',
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-ww-loss/30 bg-ww-loss/[0.04] px-6 py-14 text-center', className)} role="alert">
      <p className="font-display text-xl font-bold tracking-tight text-ww-text">{title}</p>
      <p className="max-w-sm font-sans text-sm text-ww-secondary">{body}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          TRY AGAIN
        </Button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-lg" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}
