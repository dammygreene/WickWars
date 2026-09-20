'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLink } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AuthModal } from '@/components/auth/AuthModal';
import { usePlayer } from '@/lib/client/usePlayer';
import { track } from '@/lib/client/analytics';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/play', label: 'PLAY' },
  { href: '/leaderboard', label: 'LEADERBOARD' },
  { href: '/season/current', label: 'SEASON' },
];

export function Header() {
  const { player, loading, logout } = usePlayer();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const inGame = pathname === '/play';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ww-border/80 bg-ww-bg/85 backdrop-blur-md">
        <div className="ww-container flex h-16 items-center justify-between gap-3">
          <BrandLink />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => l.href === '/play' && track('play_clicked', { from: 'nav' })}
                className={cn(
                  'rounded-md px-3.5 py-2 font-sans text-[13px] font-semibold tracking-wide transition-colors',
                  pathname === l.href || (l.href === '/play' && inGame)
                    ? 'bg-ww-surface text-ww-text'
                    : 'text-ww-secondary hover:bg-ww-surface hover:text-ww-text',
                )}
              >
                {l.label}
              </Link>
            ))}
            {player && (
              <Link
                href={`/profile/${player.username}`}
                className={cn(
                  'rounded-md px-3.5 py-2 font-sans text-[13px] font-semibold tracking-wide transition-colors',
                  pathname.startsWith('/profile')
                    ? 'bg-ww-surface text-ww-text'
                    : 'text-ww-secondary hover:bg-ww-surface hover:text-ww-text',
                )}
              >
                PROFILE
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="skeleton h-10 w-28 rounded-md" aria-hidden />
            ) : player ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${player.username}`}
                  className="hidden items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-ww-surface sm:flex"
                >
                  <Avatar username={player.username} src={player.avatarUrl} size="sm" />
                  <span className="max-w-[120px] truncate font-sans text-sm font-semibold text-ww-text">
                    @{player.username}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="hidden rounded-md px-2 py-2 font-sans text-[13px] font-medium text-ww-muted transition-colors hover:text-ww-text sm:block"
                >
                  Log out
                </button>
                <Link href="/play" onClick={() => track('play_clicked', { from: 'nav_cta' })}>
                  <Button size="sm" className="font-bold tracking-wide">
                    PLAY WICK
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} className="hidden sm:inline-flex">
                  CONNECT
                </Button>
                <Button size="sm" onClick={() => setAuthOpen(true)} className="font-bold tracking-wide">
                  PLAY WICK
                </Button>
              </div>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-md text-ww-secondary hover:bg-ww-surface hover:text-ww-text md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                {menuOpen ? (
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-ww-border bg-ww-bg px-4 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    setMenuOpen(false);
                    if (l.href === '/play') track('play_clicked', { from: 'nav_mobile' });
                  }}
                  className="rounded-lg px-3 py-3 font-display text-base font-bold text-ww-text hover:bg-ww-surface"
                >
                  {l.label}
                </Link>
              ))}
              {player ? (
                <>
                  <Link
                    href={`/profile/${player.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-3 font-display text-base font-bold text-ww-text hover:bg-ww-surface"
                  >
                    PROFILE
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-3 text-left font-sans text-sm text-ww-muted"
                  >
                    Log out @{player.username}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="rounded-lg px-3 py-3 text-left font-display text-base font-bold text-ww-text hover:bg-ww-surface"
                >
                  CONNECT
                </button>
              )}
            </div>
          </nav>
        )}
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
