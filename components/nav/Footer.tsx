import Link from 'next/link';
import { Lockup } from '@/components/brand/Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ww-border">
      <div className="ww-container flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <Lockup className="h-7" />
          <p className="ww-mono text-xs text-ww-muted">SIMULATED PERFORMANCE. NOT FINANCIAL ADVICE.</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 font-sans text-sm text-ww-secondary" aria-label="Footer">
          <Link href="/how-to-play" className="transition-colors hover:text-ww-text">
            How to play
          </Link>
          <Link href="/leaderboard" className="transition-colors hover:text-ww-text">
            Leaderboard
          </Link>
          <Link href="/play" className="transition-colors hover:text-ww-text">
            Play
          </Link>
          <a href="https://x.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-ww-text">
            X
          </a>
        </nav>
      </div>
      <div className="border-t border-ww-border/60">
        <div className="ww-container flex items-center justify-between py-4">
          <p className="font-sans text-xs text-ww-disabled">© 2026 WICK WARS</p>
          <p className="ww-mono text-xs text-ww-disabled">SEASON 01</p>
        </div>
      </div>
    </footer>
  );
}
