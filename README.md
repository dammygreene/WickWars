# WICK WARS — Trade the chart. Survive the wick.

A premium browser trading arcade. 45-second daily rounds: LONG, SHORT, CLOSE. Server-verified scores, competitive
leaderboards, public player profiles, and 1200×1500 shareable performance cards rendered from the art-directed SVG
templates in `ww/`.

Product specs: `blueprint.md` · `ui_ux.md` · `design.md` · `build-prompt.md` (source of truth).

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Canvas** game chart (60fps rAF, React never re-renders per tick) + Framer Motion UI transitions
- **File-store DB** for MVP (`.data/`, gitignored) behind repository functions in `lib/store/db.ts` — designed to move to Postgres/Redis without touching game, card, or API logic
- **Cards:** tokenized SVG → `@resvg/resvg-js` at 2x (2400×3000) → `sharp` downsample to 1200×1500, with vendored brand TTFs (`assets/fonts/`, OFL)
- **Auth:** X OAuth 2.0 (PKCE) + wallet `personal_sign` verification (`viem`) + guest handles. No transaction is ever required to play.
- Tests: `vitest` (18 unit tests) + `scripts/e2e-qa.mjs` (full game-loop QA)

## Local development

```bash
npm install
npm run production:check   # after setting environment variables
npm run dev                # http://localhost:3000
```

For local play, guest auth works without OAuth. Set a random `WW_SESSION_SECRET` of at least 32 characters. Do not commit
`.env.local` or `.data/`.

Useful scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on `:3000` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` (clean) |
| `npm test` | `vitest run` (unit) |
| `node scripts/e2e-qa.mjs` | Full E2E: guest → game → trades → timeout finish → cards → board |
| `npm run seed:dev` | Seed LOCAL-ONLY demo data (`.data/`, gitignored — never committed) |
| `npm run cards:test` | Render sample cards to `/tmp` for visual QA |
| `npx tsx scripts/cards-edge.ts` | Render card edge cases (loss/huge/tiny/long-name/no-trade/avatar) |
| `npx tsx scripts/render-examples.ts` | Regenerate landing-page example cards |
| `npm run production:check` | Validate production environment variables without printing secrets |

## Environment

| Var | Purpose |
|---|---|
| `WW_SESSION_SECRET` | Required. Random HMAC secret, minimum 32 characters; server-only. |
| `WW_BASE_URL` | Required. Production value is exactly `https://wickwars.xyz`; used for OG/share URLs. |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` / `X_REDIRECT_URI` | Optional as a group. `X_REDIRECT_URI` must be `https://wickwars.xyz/api/auth/x/callback` and must match the X application. Secrets are server-only. |
| `WW_SEASON_ID` / `WW_SEASON_NAME` / `WW_SEASON_START` / `WW_SEASON_END` | Current season window (UTC) |

## Architecture

```
app/                    routes: / /play /results/[gameId] /leaderboard /profile/[u]
                        /season/[id] /card/[cardId] /how-to-play + /api/*
components/             brand/ nav/ landing/ game/ results/ cards/ profile/ auth/ ui/
lib/
  types.ts              Player · Game · Trade · Result · Season (strongly typed)
  game/                 scenario (deterministic market) · engine (trades/P&L) ·
                        scoring (public formula) · finish (authoritative finalize) ·
                        tick (progressive reveal) · challenge (daily/season)
  store/db.ts           file-store repositories (swap for Postgres later)
  auth/                 sessions (HMAC cookies) · identity/titles/archetypes · X OAuth
  cards/                templates · tokens · fit-text · chart/graph regions ·
                        avatars · resvg+sharp render · generate (game + all-time)
  client/               api fetch · usePlayer · useGame · analytics · sound
  wallet/               EIP-1193 client (no SDK weight)
ww/                     art-directed source assets (never redesigned in code)
assets/fonts/           vendored OFL TTFs for the card renderer
public/brand|examples   logo assets · landing example cards
```

### Anti-cheat (server authority)

- One deterministic scenario per daily window; the browser never receives future prices (tick endpoint reveals progressively).
- Execution prices come from the server clock; event times are monotonic-validated; illegal sequences rejected.
- P&L, score, rank, and percentile are computed server-side at finalize. There is no score-submission endpoint to abuse.
- Only `verified` runs enter leaderboards. Interrupted/liquidated runs are marked honestly.

### Card pipeline

`ww/game-result-template.svg` + `ww/all-time-template.svg` are tokenized masters (single template covers win/loss via
`{{ACCENT}}`). The generator replaces the `chart-region`/`graph-region` placeholders with real trade/history geometry,
embeds avatars via the template clip-paths (fallback initials), shrink-fits long values, renders at 2x, and downsamples
to the final 1200×1500 PNG. Cards are content-addressed (`dataRev`) and reused when inputs are unchanged.

## Production deployment

- Run `npm run production:check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then the E2E script against the production server.
- Deploy one application instance only. The current `.data/` JSON store uses an in-process write mutex and atomic temp-file rename; it is not safe for multiple instances or shared network writers.
- Mount `.data/` on persistent writable disk. Losing that directory loses players, games, results, cards, nonces, and analytics. Back up `db.json` and `.data/cards/` regularly; test restore before launch.
- A missing `db.json` starts a fresh empty store. Read/parse failures are logged and fail requests rather than silently resetting data. Restarting with the same persistent disk preserves data.
- Keep `WW_SESSION_SECRET`, X credentials, wallet signatures, and OAuth tokens server-only. Never use `NEXT_PUBLIC_` for them.
- Configure the X developer application callback to exactly match `X_REDIRECT_URI`; for launch this is `https://wickwars.xyz/api/auth/x/callback`.
- `sharp` and `@resvg/resvg-js` ship prebuilt binaries (see `next.config.mjs`). Card routes already have a 60-second max duration and rate limit.

Production logs are newline-delimited JSON with event names such as `game_completed`, `invalid_trade`, `request_rejected`,
`oauth_failure`, `wallet_auth_failure`, `card_generation_failed`, and `persistence_*`. They contain operational identifiers where
available, but never secrets, tokens, signatures, or request bodies.
