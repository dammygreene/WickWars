# WICK WARS : Product + Technical Blueprint

## 0. Document purpose

This document is the product and engineering blueprint for WICK WARS, a premium browser-first competitive trading arcade with a meme-native identity and an optional on-chain economy.

The core product is the game, not the token dashboard. A player should be able to discover the site, understand the game immediately, authenticate with X or a wallet, play a short round, receive a detailed performance result, generate a shareable P&L card, and return later to compete for a higher rank.

The product must feel closer to a premium trading terminal crossed with a competitive arcade than a typical Web3 landing page.

The website is the primary product. There is no Telegram Mini App dependency.

## 1. Product north star

> Make losing feel funny, winning feel prestigious, and every game produce something worth sharing.

WICK WARS should create a repeat loop:

1. Discover WICK WARS.
2. Authenticate quickly with X or wallet.
3. Start a game with almost no setup.
4. Make fast long/short/close decisions.
5. Receive an emotional result screen.
6. See rank, score, P&L and performance stats.
7. Generate a polished WICK card.
8. Share the result to X or copy a public result URL.
9. Return to beat a personal best, a friend, or the daily leaderboard.
10. Progress into seasons, streaks, ranked modes, tournaments and token-enabled features.

The product should work even before token utility is introduced. Token features deepen the experience rather than being the prerequisite for discovering the game.

## 2. Product pillars

### 2.1 Instant play

The path from landing page to first game should be extremely short.

Primary CTA: `PLAY WICK`.

Authentication should feel lightweight. X authentication is the fastest entry point. Wallet authentication is available for players who want on-chain identity or token-enabled functionality.

Do not ask for a blockchain transaction just to create a game profile or start a free game.

### 2.2 Competitive identity

A WICK profile is not merely an account settings page. It is the player's public trading-game identity.

Core profile attributes:

- Username / handle
- Avatar
- WICK title
- Archetype
- Level or progression state
- Current rank
- Peak rank
- Games played
- Win rate
- Best score
- Best win
- Current and longest streak
- Season history
- All-time performance history
- Public generated cards

### 2.3 Short-session gameplay

The core game should support roughly 30 to 60 second rounds. A short round creates the repeat impulse without requiring a large time commitment.

The first mode should be one polished daily challenge rather than many average modes.

### 2.4 Social proof through generated artifacts

Cards are a core growth mechanism.

Every meaningful game result should be transformable into a high-quality share card. Cards must look like real trading performance reports rather than generic game screenshots.

The public card URL should route back to a lightweight result/profile experience with a clear `PLAY WICK` CTA.

### 2.5 Mobile-first interaction

Mobile is a primary gameplay environment, not an adapted desktop layout.

Large touch targets, one-thumb controls, responsive chart sizing and restrained animation are mandatory.

Desktop adds keyboard shortcuts, richer peripheral information and larger chart treatment without changing the fundamental game loop.

## 3. Primary information architecture

### `/`

Landing page.

Purpose:
- Communicate the game in seconds.
- Show the current daily challenge.
- Establish the visual identity.
- Give immediate access to play.
- Surface leaderboard/social proof.

Primary actions:
- Play WICK
- Connect X
- Connect Wallet
- View leaderboard

### `/play`

Game shell.

Purpose:
- Run the active game.
- Keep interaction focused on the chart and decisions.
- Prevent unnecessary navigation while a run is active.

### `/results/:gameId`

Post-game result view.

Purpose:
- Show the complete result.
- Celebrate or dramatize outcome.
- Generate/download/share the card.
- Offer immediate replay.
- Link to profile and leaderboard.

### `/leaderboard`

Competitive rankings.

Tabs/filters can include:
- Daily
- Weekly
- Season
- All-time
- Friends / following, when available

### `/profile/:username`

Public player profile.

Purpose:
- Show player identity.
- Show all-time metrics.
- Show season history.
- Show recent cards/games.
- Generate the all-time card.

### `/season/:seasonId`

Season hub.

Purpose:
- Explain current season.
- Show rankings.
- Show season rules.
- Show player progression.
- Show notable achievements.

### `/card/:cardId`

Public share card view.

The card itself should be the hero. Provide:
- View image
- View player
- View game result
- Play WICK
- Share

### `/about` or `/how-to-play`

Optional educational page.

Keep it concise. Explain controls, score, result calculations and simulated nature. Never make the product look like a financial trading terminal that executes real trades.

## 4. Authentication architecture

Support two primary authentication paths.

### X authentication

Use X OAuth/OIDC or the project's chosen supported X authentication flow.

Stored identity:
- X user ID
- handle
- display name
- avatar URL
- authorization metadata needed by the chosen auth provider

Do not store unnecessary private X data.

The X identity becomes the default game identity when available.

### Wallet authentication

Use wallet connection plus a signed message for authentication where possible.

The signed-message flow should prove wallet ownership without requiring a transaction.

Wallet can coexist with X identity. A player can have both.

Suggested account state:

```ts
interface PlayerIdentity {
  playerId: string;
  x?: {
    userId: string;
    handle: string;
    avatarUrl?: string;
  };
  wallet?: {
    address: string;
    chain: string;
  };
}
```

Do not assume one wallet equals one person forever. Account linking should be explicit.

## 5. Game architecture

### 5.1 Client responsibilities

The browser handles:
- Rendering the game.
- Chart animation.
- Input capture.
- Immediate visual feedback.
- Local interpolation and prediction for responsiveness.
- Result presentation.

The server is authoritative for:
- Game creation.
- Market scenario selection.
- Seed/scenario assignment.
- Start/end timestamps.
- Trade event validation.
- Score calculation.
- Final result.
- Leaderboard placement.
- Reward eligibility.

Never trust a client-supplied final score.

### 5.2 Market simulation

The MVP can use deterministic replay scenarios built from curated or generated price paths.

A scenario should include:

```ts
interface MarketScenario {
  id: string;
  symbol: string;
  timeframe: string;
  durationMs: number;
  startingPrice: number;
  candles: Candle[];
  seed: string;
  difficulty: number;
  seasonId: string;
}
```

Candle:

```ts
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
```

For a deterministic game, the same scenario should replay identically for every eligible player in that challenge window.

### 5.3 Trade event model

```ts
interface TradeEvent {
  id: string;
  gameId: string;
  timestamp: number;
  action: 'LONG' | 'SHORT' | 'CLOSE';
  price: number;
  quantity: number;
}
```

The final result is derived from the accepted event stream and scenario state.

### 5.4 Core result model

```ts
interface GameResult {
  gameId: string;
  playerId: string;
  scenarioId: string;
  startBalance: number;
  endBalance: number;
  pnl: number;
  roi: number;
  trades: number;
  winRate: number;
  holdTimeMs: number;
  score: number;
  rank: number;
  rankTotal: number;
  percentile: number;
  durationMs: number;
  resultState: 'PROFITABLE' | 'WICKED' | 'PERSONAL_BEST' | 'TOP_10' | 'LEGENDARY';
  seasonId: string;
  createdAt: string;
}
```

## 6. Scoring system

The scoring system should reward both outcome and quality of execution.

The MVP should calculate score from a deterministic formula based on:

- Realized P&L / ROI.
- Risk-adjusted performance.
- Timing quality.
- Position discipline.
- Survival through volatility.
- Optional streak bonuses.

Do not let a player achieve a huge score through one meaningless exploit.

All scoring rules must be visible in the game information UI. Hidden scoring systems create distrust.

Example conceptual model:

```text
score = performanceScore
      + executionScore
      + riskScore
      + survivalScore
      + optionalModeBonus
```

The exact coefficient values should be configurable server-side so they can be tuned without rebuilding the client.

## 7. Daily challenge architecture

The default mode is a shared daily scenario.

Every player participating in the same challenge window gets the same scenario definition.

Daily challenge object:

```ts
interface DailyChallenge {
  id: string;
  seasonId: string;
  startsAt: string;
  endsAt: string;
  scenarioId: string;
  startingBalance: number;
  durationMs: number;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
}
```

The home page should show:
- countdown
- current player count
- top score
- top few players
- challenge difficulty
- whether the player already played today

## 8. Progression system

The MVP should have lightweight progression, not a complicated RPG layer.

Progression candidates:
- player level
- title
- streak
- achievements
- season rank
- archetype

Example titles:
- WICK NOVICE
- WICK TRADER
- WICK HUNTER
- WICK LORD
- WICK GOD

Titles should be cosmetic/identity-focused unless and until the economy is explicitly designed around them.

## 9. Archetypes

The system can classify a player from aggregate behavior.

Potential archetypes:
- THE SNIPER
- THE APE
- THE JEET
- THE CONTRARIAN
- THE DEGEN
- THE SURVIVOR

The archetype must be computed from real player behavior rather than manually selected if used publicly.

Example dimensions:
- average hold duration
- average trade frequency
- long/short ratio
- risk-taking
- win rate
- comeback behavior

## 10. Leaderboards

Leaderboard rows should include:
- rank
- player avatar
- handle
- title/archetype
- score
- ROI or selected performance metric
- streak where relevant

Keep the ranking table visually dense but readable.

Live leaderboard updates should be animated subtly. Do not constantly reorder the whole screen with large motion.

Filters should be fast and URL-addressable where useful.

## 11. Profile architecture

A profile should answer:
- Who is this player?
- How good are they?
- What is their playing style?
- What season are they in?
- What have they achieved?
- What cards have they generated?

Core profile sections:

1. Identity hero.
2. Current rank and peak rank.
3. Core statistics.
4. All-time performance graph.
5. Season history.
6. Recent games.
7. Achievement badges.
8. Generated cards.
9. All-time card action.

## 12. Cards architecture

The provided SVG card package is authoritative.

Use exactly these assets:

- `game-result-template.svg`
- `all-time-template.svg`
- `icon-mark.svg`
- `icon-tile.svg`
- `wordmark.svg`
- `lockup-horizontal.svg`

Canvas for all cards:

`1200 × 1500 px`

Do not redesign these templates during implementation.

### 12.1 Game result card

One template supports both wins and losses.

`{{ACCENT}}` drives the visual state.

Suggested defaults:

```text
Win accent:  #35E58B
Loss accent: #FF4F5E
```

Game-result tokens:

```text
{{ACCENT}}
{{USERNAME}}
{{AVATAR_INITIAL}}
{{SEASON}}
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

The `chart-region` must be replaced with an actual generated trade chart.

Required chart behavior:
- Use the scenario's real candle data.
- Map timestamp to x position.
- Map price to y position.
- Place long/short/close markers at trade coordinates.
- Handle an open position that reaches game end.
- Handle one-trade games.
- Handle no-trade games gracefully.
- Preserve visual consistency with the static card template.

### 12.2 All-time card

Tokens:

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

Replace the `graph-region` with the player's real season-by-season performance graph.

### 12.3 Long text handling

The renderer must support:
- long X handles
- long numeric P&L
- large score values
- large ranks
- long archetype/title strings

Use bounded text regions.

Rules:
- Prefer shrink-to-fit over truncation for important numeric values.
- For usernames, allow a sensible maximum and then truncate with an ellipsis.
- Never let dynamic text collide with static artwork.
- Test at realistic extremes before launch.

### 12.4 Avatar handling

Use the existing SVG clip paths.

Replace placeholder avatar content with the player's X or wallet-sourced image.

Preserve the tokenized accent ring.

If no avatar is available, use `{{AVATAR_INITIAL}}`.

### 12.5 Renderer

Recommended backend approach:
- Store raw SVG templates.
- Perform validated token replacement.
- Replace only the `chart-region` / `graph-region` dynamic group when necessary.
- Render to PNG at 2x: `2400 × 3000`.
- Downsample/export to the final `1200 × 1500` share/download asset.

Preferred renderer: `resvg` if the runtime supports it cleanly.

Acceptable alternatives:
- `sharp`
- `satori`

Do not introduce a Figma round-trip into the production rendering flow.

## 13. Card sharing flow

After a game:

`GAME OVER` → `RESULT` → `GENERATE CARD` → preview → actions.

Actions:
- Download PNG
- Share to X
- Copy card link
- View profile
- Play again

Sharing should never block on a slow analytics request if the card itself is already ready.

The card URL should remain stable after generation.

## 14. Token/economy layer

The product should not depend on token functionality to prove its core value.

When token features are enabled, use them for deeper game participation rather than as a prerequisite to play.

Potential future utility:
- ranked entry
- tournament access
- cosmetics
- clans
- season passes
- special modes
- progression unlocks

Avoid making the base game feel paywalled.

## 15. Data/storage recommendation

The implementation can use:
- PostgreSQL for durable game/player/leaderboard data.
- Redis or equivalent for live challenge state and leaderboard caching.
- Object storage/CDN for generated card images.
- Server-side job/queue for card rendering if rendering becomes CPU-heavy.

Core tables:

```text
players
identities
wallets
seasons
challenges
scenarios
scenario_candles
games
trade_events
game_results
leaderboard_snapshots
achievements
player_achievements
cards
player_season_stats
player_all_time_stats
```

## 16. Anti-cheat

Treat anti-cheat as part of the architecture, not a later patch.

At minimum:
- Scenario is server-assigned.
- Game start is server-recorded.
- Trade event sequence is validated.
- Trade timestamps must fall inside the game window.
- Prices are resolved from the authoritative scenario.
- Invalid action sequences are rejected.
- Final score is calculated server-side.
- Leaderboard accepts only verified results.
- Suspicious accounts can be flagged for review.

Do not rely on hidden client JavaScript as the security boundary.

## 17. Performance requirements

Target:
- Fast initial content load.
- Smooth gameplay at 60 FPS where the device allows it.
- Avoid full-page re-renders during a game.
- Avoid loading heavy 3D assets for decorative purposes.
- Lazy-load leaderboard and profile sections below the fold.
- Lazy-load card images.
- Compress generated cards appropriately.
- Respect reduced-motion settings.

The landing page should remain visually rich while maintaining a fast interaction path.

## 18. Accessibility requirements

- Keyboard navigation for non-game UI.
- Visible focus states.
- Sufficient contrast.
- Semantic buttons/links.
- Text alternatives for meaningful imagery.
- Do not rely on red vs green alone for result state.
- Use explicit labels such as `PROFITABLE` and `WICKED`.
- Respect `prefers-reduced-motion`.

## 19. Analytics

Track product behavior, not private unnecessary data.

Core events:

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
season_viewed
wallet_connected
```

Important funnel metrics:
- Landing → first game.
- First game → second game.
- Game → card generation.
- Card → share.
- Share → new visitor.
- Daily player retention.
- Daily challenge participation.

## 20. MVP scope

### Must ship

- Premium responsive homepage.
- X authentication.
- Wallet connection/authentication.
- One polished daily game mode.
- Long/short/close interactions.
- Server-authoritative result calculation.
- Daily leaderboard.
- Public player profiles.
- Game result screen.
- Game-result card generation.
- All-time profile card generation.
- Download card.
- Share to X.
- Public card URLs.
- Mobile support.
- Basic anti-cheat.

### Can ship shortly after

- Season history.
- Titles.
- Archetypes.
- Streaks.
- Achievements.
- Friends leaderboard.
- Ranked mode.
- Tournament mode.
- Token-gated features.

### Do not build first

- Large multiplayer worlds.
- Complex clans.
- Elaborate NFT inventories.
- Multiple game engines.
- Dozens of game modes.
- Full DeFi integrations.
- A giant token dashboard.

## 21. Definition of done for MVP

A new visitor on mobile should be able to:

1. Land on the homepage.
2. Understand what WICK WARS is in under 10 seconds.
3. Authenticate with X or wallet.
4. Start a game quickly.
5. Play without a blockchain transaction.
6. Finish a game.
7. See trustworthy result data.
8. Generate a 1200 × 1500 card.
9. Share that card or copy its public URL.
10. Open the public profile from the card.
11. See the leaderboard.
12. Start another game.

On desktop, the same journey must work with keyboard shortcuts and a richer information layout.
