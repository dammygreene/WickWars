import Link from 'next/link';
import { cn } from '@/lib/utils';

export function IconMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/icon-mark.svg" alt="WICK WARS" className={cn('h-8 w-8', className)} draggable={false} />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/wordmark.svg" alt="WICK WARS" className={cn('h-6 w-auto', className)} draggable={false} />
  );
}

export function Lockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/lockup-horizontal.svg" alt="WICK WARS" className={cn('h-8 w-auto', className)} draggable={false} />
  );
}

export function BrandLink({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="WICK WARS home">
      <IconMark className="h-8 w-8" />
      {!compact && <Wordmark className="hidden h-[22px] min-[400px]:block" />}
    </Link>
  );
}
