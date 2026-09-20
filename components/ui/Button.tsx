'use client';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'win' | 'loss';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ww-text text-ww-bg hover:bg-white font-semibold',
  secondary: 'border border-ww-border-strong bg-ww-surface text-ww-text hover:border-ww-muted hover:bg-ww-surface2',
  ghost: 'text-ww-secondary hover:text-ww-text hover:bg-ww-surface',
  danger: 'border border-ww-loss/40 bg-ww-loss/10 text-ww-loss hover:bg-ww-loss/20',
  win: 'bg-ww-win text-[#06130c] hover:brightness-110 font-bold',
  loss: 'bg-ww-loss text-[#1a0508] hover:brightness-110 font-bold',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-md',
  md: 'h-11 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-[15px] rounded-lg',
  xl: 'h-14 px-8 text-base rounded-lg',
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-sans transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
