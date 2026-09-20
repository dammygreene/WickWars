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

## Quickstart

```bash
npm install
cp .env.local .env.local   # already present for dev; set WW_SESSION_SECRET in prod
npm run dev                # http://localhost:3000
```

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

## Environment

| Var | Purpose |
|---|---|
| `WW_SESSION_SECRET` | HMAC secret for session cookies (rotate in prod!) |
| `WW_BASE_URL` | Canonical URL (OG tags, share links, X callback) |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` / `X_REDIRECT_URI` | X OAuth 2.0 (optional — UI degrades honestly when unset) |
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

## Deploy notes

- Set `WW_SESSION_SECRET` + `WW_BASE_URL`; configure X OAuth for X login.
- `.data/` is ephemeral local storage — for production, implement `lib/store/db.ts` against Postgres (+ object storage for `lib/cards/render.ts` output) and set `maxDuration` on card routes.
- `sharp` + `@resvg/resvg-js` ship prebuilt binaries (see `serverComponentsExternalPackages` in `next.config.mjs`).
