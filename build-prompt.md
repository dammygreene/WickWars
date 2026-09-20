# WICK WARS : Agent Build Prompt

## ROLE

You are the lead product engineer and frontend engineer building WICK WARS, a premium browser-first competitive trading arcade.

You are not building a generic crypto dashboard.

You are building a polished, highly responsive game product that combines the visual confidence of a professional trading interface with the emotional feedback and replayability of an arcade game.

The game is the product. The token is a supporting economic layer, not the homepage hero.

There is no Telegram Mini App. The primary experience is the website.

Players can authenticate with X or connect a wallet. They must not be forced to approve blockchain transactions merely to create an identity or play the free game.

## PRIMARY GOAL

Build a production-quality MVP in which a player can:

1. Visit the homepage.
2. Understand WICK WARS immediately.
3. Authenticate with X or a wallet.
4. Start a short simulated trading game.
5. Long, short and close positions.
6. See real-time chart movement and P&L feedback.
7. Finish the round.
8. Receive a final score and rank.
9. Generate a polished 1200 × 1500 post-game card.
10. Share/download the card.
11. Visit a public player profile.
12. Generate an all-time profile card.
13. View leaderboards.
14. Replay the game.

## NON-NEGOTIABLE PRODUCT PRINCIPLES

- The game comes before the token.
- Mobile is first-class.
- The site must look premium on first load.
- Do not create generic Web3 UI.
- Do not use random decorative 3D objects unless they serve a clear purpose.
- Do not cover every surface in gradients or glassmorphism.
- Do not overuse glow.
- Do not make users wait through unnecessary animations.
- Do not require a wallet transaction just to play.
- Do not trust client-side scores.
- Do not fabricate ranking data.
- Do not make the result card a CSS imitation when the downloadable card is rendered from the supplied SVG template.
- Do not redesign the supplied card templates.

## RECOMMENDED STACK

Use the existing project stack if one already exists and is healthy.

Otherwise use:

- Next.js with TypeScript
- React
- Tailwind CSS
- Framer Motion or Motion for interface transitions
- Canvas/PixiJS for game/chart rendering where useful
- PostgreSQL for persistent application data
- Redis or equivalent for live leaderboard/game state where needed
- `resvg` as the preferred card rendering engine if practical
- object storage/CDN for generated card images

The exact library choice can change when there is a compelling compatibility reason, but the behaviors and architecture in this prompt are mandatory.

## PROJECT STRUCTURE

Prefer a structure similar to:

```text
app/
  page.tsx
  play/
  results/[gameId]/
  leaderboard/
  profile/[username]/
  season/[seasonId]/
  card/[cardId]/
  how-to-play/

components/
  brand/
  navigation/
  landing/
  game/
  leaderboard/
  profile/
  cards/
  auth/
  ui/

lib/
  auth/
  game/
  scoring/
  leaderboard/
  cards/
  wallet/
  analytics/
  validation/

data/
  scenarios/

public/
  brand/
  cards/

server/
  games/
  cards/
  leaderboards/
```

Do not blindly follow this directory structure if the existing repository already has an equivalent architecture.

## BRAND ASSETS

The WICK WARS logo already exists.

Preserve and use the provided logo assets.

Card assets:

```text
icon-mark.svg
icon-tile.svg
wordmark.svg
lockup-horizontal.svg
game-result-template.svg
all-time-template.svg
```

Do not redraw the logo.

## LANDING PAGE

Build an immersive dark landing page.

The landing page should feel alive before the user interacts.

### Hero

Include:

- WICK WARS logo/wordmark.
- One strong headline.
- One short supporting statement.
- `PLAY WICK` primary CTA.
- X authentication / wallet entry.
- Daily challenge status.

Suggested headline:

`TRADE THE CHART. SURVIVE THE WICK.`

Do not copy this mechanically if the existing brand voice has a better variant, but preserve the idea and tone.

### Hero animation

Use a subtle moving market visualization or ambient chart movement.

The animation must not block loading or make the primary CTA difficult to see.

### Below-fold content

Recommended order:

1. Daily challenge.
2. Live/top leaderboard preview.
3. Example generated cards.
4. How it works.
5. Season/progression preview.
6. Token-enabled utility, when implemented.
7. Minimal footer.

## GAME SCREEN

The game is the most important screen.

### Desktop

Use a large central chart with compact information around it.

Top information:
- time
- current balance
- P&L
- rank

Main content:
- animated candles
- current price
- position state
- trade markers

Bottom controls:
- LONG
- CLOSE
- SHORT

### Mobile

Make the chart occupy most of the available content area.

Keep the three core buttons large and thumb-friendly.

Recommended control height:
- 64 to 76 px on mobile

Keep current position and P&L visible without requiring a scroll.

## GAME MECHANICS MVP

Start with one mode: Daily Wick.

Each round:
- uses a server-assigned deterministic scenario
- begins with a fixed virtual starting balance
- has a short fixed duration
- supports long/short/close
- records trade events
- calculates final P&L and score server-side

Do not build multiple game modes until the first mode feels polished.

## AUTHENTICATION

Support:

### X

Provide a clear `CONTINUE WITH X` path.

Store enough identity to build a public game profile:
- user ID
- handle
- display name
- avatar

### Wallet

Provide `CONNECT WALLET`.

Use message signing for ownership verification where possible.

Do not request transaction approval during basic authentication.

Support linking both identities to one player account when the user explicitly chooses to do so.

## GAME STATE

Represent gameplay explicitly.

Example:

```ts
interface GameState {
  gameId: string;
  challengeId: string;
  scenarioId: string;
  startedAt: number;
  endsAt: number;
  price: number;
  balance: number;
  pnl: number;
  position: 'FLAT' | 'LONG' | 'SHORT';
  entryPrice?: number;
  trades: TradeEvent[];
  status: 'COUNTDOWN' | 'LIVE' | 'ENDING' | 'COMPLETE' | 'INVALID';
}
```

Keep render state separate from authoritative state.

## ANTI-CHEAT

This is mandatory.

The browser is not authoritative.

Server must determine:
- challenge/scenario
- game start
- valid time window
- accepted trade events
- execution price
- final balance
- final score
- leaderboard eligibility

Validate:
- timestamp ordering
- action sequence
- price references
- duration
- duplicate events
- impossible transitions

If the connection is interrupted and the server cannot validate the run, make the result clearly unverified instead of silently ranking it.

## SCORE

Build a configurable scoring engine.

Score should be based on actual accepted gameplay data.

Keep coefficients server-side so the game can be balanced later.

At minimum score should use:
- P&L/ROI
- execution quality
- risk behavior
- survival/time

Do not allow client-submitted score values to affect leaderboards.

## RESULT SCREEN

The result page should feel like a premium sports result page.

Sequence:

1. Freeze chart.
2. Reveal result state.
3. Animate P&L.
4. Reveal ROI.
5. Reveal score.
6. Reveal rank.
7. Show secondary statistics.
8. Offer card generation.

Primary CTA:

`GENERATE CARD`

Secondary CTA:

`PLAY AGAIN`

Use result copy:

Win/profitable:
`PROFITABLE`

Loss:
`YOU GOT WICKED`

Make sure the result state is communicated by text as well as color.

## CARD SYSTEM : SOURCE OF TRUTH

The user has already created the card templates.

Do not redesign them.

Do not create new card layouts unless specifically requested.

All cards are:

`1200 × 1500 px`

### Files

```text
cards/game-result-template.svg
cards/all-time-template.svg
cards/icon-mark.svg
cards/icon-tile.svg
cards/wordmark.svg
cards/lockup-horizontal.svg
```

### Rendering architecture

The SVG files are tokenized with placeholders.

Replace tokens in the raw SVG text.

Do not perform a Figma round-trip.

Recommended:
- `resvg`

Acceptable:
- `sharp`
- `satori`

The final rendering pipeline should produce:

1. source SVG
2. 2x rasterized output at 2400 × 3000
3. optimized final PNG at 1200 × 1500

Store the final card asset and a stable public card ID/URL.

## GAME RESULT CARD TOKENS

Global:

```text
{{ACCENT}}
{{USERNAME}}
{{AVATAR_INITIAL}}
{{SEASON}}
```

Game result:

```text
{{RESULT_TAG}}
{{DATE}}
{{MODE}}
{{PAIR}}
{{DURATION}}
{{START_BALANCE}}
{{END_BALANCE}}
{{PNL}}
{{ROI_ARROW}}
{{ROI}}
{{TRADES}}
{{WIN_RATE}}
{{HOLD_TIME}}
{{SCORE}}
{{RANK}}
{{RANK_TOTAL}}
{{PERCENTILE}}
```

### Accent behavior

Win:

`{{ACCENT}} = #35E58B`

Loss:

`{{ACCENT}} = #FF4F5E`

Use the accent exactly as intended by the template.

Do not manually recolor unrelated template elements.

### RESULT_TAG

Profitable example:

`PROFITABLE`

Loss example:

`WICKED`

Future supported states can include:

`PERSONAL BEST`

`TOP 10`

`LEGENDARY`

No new template is required for these future states.

## CHART REGION GENERATION

`<g id="chart-region">` is a placeholder.

Do not simply leave the sample chart in production.

Generate the chart using:
- actual scenario candles
- actual trade events
- actual timestamps
- actual entry/exit prices

Map timestamp to the template's chart x-range.

Map price to the chart y-range using the displayed scenario range plus a small padding factor.

Trade markers must appear at the correct chart coordinates.

### Edge cases to support immediately

1. No trades.
2. One trade.
3. Open position at time expiry.
4. Multiple same-direction interactions if the mode allows them.
5. Long username.
6. Very large P&L.
7. Very small P&L.
8. Large score.
9. Very large leaderboard size.

## ALL-TIME CARD TOKENS

```text
{{TITLE}}
{{PEAK_RANK}}
{{GAMES}}
{{WIN_RATE}}
{{BEST_SCORE}}
{{BEST_WIN}}
{{LONGEST_STREAK}}
{{SEASONS_PLAYED}}
{{FIRST_PLAYED}}
{{ARCHETYPE}}
{{SEASON_RANGE}}
{{TAGLINE}}
```

Replace `<g id="graph-region">` with a generated line/area graph from real season-by-season player history.

Do not show fabricated historical data.

## LONG TEXT HANDLING

SVG `<text>` does not automatically wrap or shrink.

Implement a reusable function such as:

```ts
fitTextToWidth({
  text,
  maxWidth,
  fontFamily,
  fontWeight,
  fontSize,
  minFontSize,
  step
})
```

For usernames:
- shrink first
- truncate with `…` only when necessary
- preserve as much identity as possible

For P&L/score:
- shrink in 2 px steps after reaching the defined safe width
- never wrap

P&L and score remain left anchored as required by the source template.

## AVATAR RENDERING

The card SVG already contains avatar clipping paths.

Replace the placeholder avatar content with an `<image>` using the existing clip path.

Preserve the accent ring.

Fallback:

`{{AVATAR_INITIAL}}`

If external avatar loading fails, do not block card generation. Use the fallback.

## CARD PREVIEW

In the result page:
- render the exact generated asset
- display inside a responsive frame
- allow zoom/open-fullscreen where appropriate on mobile

Do not make the preview a separately styled HTML approximation.

## CARD ACTIONS

Required:

`DOWNLOAD PNG`

`SHARE TO X`

`COPY LINK`

Optional:

`VIEW PROFILE`

`PLAY AGAIN`

## PUBLIC CARD PAGE

Route:

`/card/:cardId`

The page should show:
- large card image
- player identity
- result summary
- WICK branding
- `PLAY WICK`
- link to player profile

The page must load without requiring login.

## ALL-TIME PROFILE CARD

On `/profile/:username` add:

`GENERATE ALL-TIME CARD`

The card must represent the current all-time snapshot.

If the profile is not the viewer's profile, the action can be read-only or generate a public snapshot depending on product rules. Never imply that the viewer owns or authored another player's card.

## PROFILE PAGE

Build:

- identity header
- avatar
- handle
- title
- archetype
- rank
- peak rank
- games
- win rate
- best score
- best win
- longest streak
- season history
- performance graph
- recent games
- generated cards

Make the profile feel like a competitive game profile, not a settings page.

## LEADERBOARD

Implement:
- Daily
- Season
- All-time

Current player should always be easy to find.

Use pagination or virtualized lists for large rankings.

Do not render thousands of rows into the DOM at once.

## MOBILE REQUIREMENTS

Test widths around:
- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1024 px
- 1440 px and wider

Mobile must support:
- login
- start game
- full game loop
- result
- card generation
- card download/share
- leaderboard
- profile

No horizontal scroll except where deliberately designed and justified.

## ANIMATION REQUIREMENTS

Use motion deliberately.

Required animations:
- countdown
- price/candle movement
- trade markers
- P&L changes
- result reveal
- rank reveal
- card generation transition
- subtle leaderboard rank movement

Avoid:
- perpetual full-screen particle effects
- overly long page transitions
- animation that blocks input
- excessive spring/bounce behavior

Respect `prefers-reduced-motion`.

## PERFORMANCE REQUIREMENTS

Target a premium feel without sacrificing loading speed.

- Code split heavy game dependencies.
- Lazy-load below-the-fold content.
- Avoid giant background videos.
- Optimize logo assets.
- Serve responsive image sizes.
- Cache stable cards.
- Avoid re-rendering the entire React tree every game tick.
- Use animation loops outside React state when necessary.

## ERROR HANDLING

Do not expose technical errors.

Use clear states:

`CONNECTION LOST`

`RECONNECT`

`RUN COULD NOT BE VERIFIED`

`TRY AGAIN`

If a game cannot be verified, it must not silently enter the leaderboard.

## ANALYTICS

Implement events for:

```text
landing_viewed
play_clicked
auth_started
auth_completed
game_started
trade_opened
trade_closed
game_completed
personal_best_reached
leaderboard_viewed
profile_viewed
card_generated
card_downloaded
card_shared
card_link_opened
replay_clicked
wallet_connected
```

Do not collect unnecessary personal information.

## QUALITY BAR

Before declaring the MVP complete, manually test:

### Gameplay
- no trade
- one trade
- multiple trades
- open position at end
- win
- loss
- best score
- rank changes
- connection interruption

### Cards
- tiny P&L
- large P&L
- long username
- short username
- missing avatar
- X avatar
- wallet identity
- win card
- loss card
- all-time card
- one season
- many seasons

### Responsive
- 320 px mobile
- 375 px mobile
- 430 px mobile
- tablet
- desktop
- wide desktop

### Accessibility
- keyboard navigation
- focus states
- reduced motion
- color-independent state communication

## ACCEPTANCE CRITERIA

The build is not complete until all of the following are true:

### Product

- Landing page communicates the concept immediately.
- Primary CTA is obvious.
- Player can authenticate with X or wallet.
- Player can play without a blockchain transaction.
- Daily game works.
- Score is server-authoritative.
- Result page works.
- Leaderboard works.
- Public profile works.
- Card generation works.
- Public card URL works.
- All-time card works.
- Mobile works.

### Cards

- Final card canvas is 1200 × 1500.
- Source templates are not visually redesigned.
- Tokens are replaced correctly.
- Win accent is `#35E58B`.
- Loss accent is `#FF4F5E`.
- Chart region is generated from actual game data.
- Graph region is generated from actual season data.
- Avatars use the supplied clip paths.
- Long values do not overflow.
- Final PNG is crisp.

### Visual

- The site does not look like a generic Web3 template.
- The visual hierarchy survives on mobile.
- Motion feels deliberate.
- Glow is restrained.
- The WICK brand is obvious.
- Result cards look good enough to be posted publicly without additional editing.

## BUILD ORDER

Build in this order unless the repository architecture requires a different sequence:

### Phase 1: Foundation
- project setup
- fonts
- theme tokens
- logo assets
- layout primitives
- navigation
- responsive shell

### Phase 2: Landing
- hero
- daily challenge block
- leaderboard preview
- example card section
- responsive behavior

### Phase 3: Authentication
- X
- wallet
- player profile model

### Phase 4: Game engine
- scenario model
- chart rendering
- trade actions
- game timer
- local UI state
- server validation
- score calculation

### Phase 5: Result experience
- result screen
- rank/score animation
- result states

### Phase 6: Card rendering
- SVG token engine
- avatar replacement
- text fit logic
- chart-region generation
- resvg/sharp renderer
- 2x rasterization
- object storage
- public card URL

### Phase 7: Profiles and leaderboards
- public profile
- all-time stats
- all-time graph
- all-time card
- daily/season/all-time leaderboard

### Phase 8: Polish
- animation tuning
- mobile tuning
- accessibility
- loading/error states
- performance
- anti-cheat hardening
- analytics

## FINAL IMPLEMENTATION BEHAVIOR

When unsure between a visually flashy implementation and a clearer premium implementation, choose the clearer premium implementation.

When unsure whether to add another feature, protect the core loop first.

When deciding where token utility should appear, keep it secondary to the game until the core experience is proven.

The finished result should make a new user think:

> "I want to play this."

Then, after a strong round:

> "I need to beat that score."

And after generating a card:

> "I'm posting this."
