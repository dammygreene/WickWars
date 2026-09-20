# WICK WARS : UI / UX Specification

## 0. UX philosophy

WICK WARS should feel immediate, competitive and premium.

The interface should never look like it is trying to teach users how to use a trading terminal. The gameplay controls should be obvious within seconds.

The product should create three emotional states:

1. **Anticipation** before a round.
2. **Tension** during a round.
3. **Pride or pain** after a round.

The UI should amplify those states without becoming noisy.

## 1. Core UX principles

### Principle 1: One obvious next action

Every major screen should have one visually dominant action.

Examples:
- Home: `PLAY WICK`
- Game: `LONG`, `CLOSE`, `SHORT`
- Result: `GENERATE CARD`
- Profile: `VIEW ALL-TIME CARD`

### Principle 2: Reduce friction before the first game

Do not place an account setup wizard between landing and gameplay.

X or wallet authentication should be simple.

Do not require token ownership to discover the game.

### Principle 3: Information appears when useful

During the game, prioritize:
- timer
- current balance / P&L
- chart
- position
- action controls
- score

Move secondary statistics out of the way.

### Principle 4: Motion communicates state

Animations must explain:
- countdown
- price movement
- trade execution
- profit/loss
- rank changes
- card generation

Decorative animation should never make controls harder to find.

## 2. User journey

### New visitor

`LANDING` → `PLAY` → `AUTH` → `COUNTDOWN` → `GAME` → `RESULT` → `CARD` → `PROFILE/LEADERBOARD` → `REPLAY`

### Returning player

`LANDING` → `PLAY` → `GAME`

Authentication should already be remembered.

### Social visitor

`CARD URL` → `RESULT CARD` → `PLAYER PROFILE` or `PLAY WICK`

The public card route should be usable without authentication.

## 3. Landing page UX

### Hero

Hero content should contain:

- WICK WARS identity.
- One sentence explaining the game.
- Current daily challenge status.
- Primary `PLAY WICK` CTA.
- Minimal authentication hint.

Recommended copy style:

> Trade the chart. Survive the wick.

Do not make the homepage hero a token price chart or tokenomics explainer.

### Daily challenge preview

Show a compact live preview:
- challenge name
- countdown
- players today
- top score
- current player rank if logged in

### Social proof

Show selected generated cards or leaderboard highlights.

Cards should act as examples of what a player can create after playing.

## 4. Authentication UX

### X

Primary low-friction option.

Button:

`CONTINUE WITH X`

Explain only what is necessary.

### Wallet

Secondary option:

`CONNECT WALLET`

For free play, wallet connection can be an identity/authentication path.

Never request a transaction just to connect or play.

### Combined state

If X is connected and wallet is not:

Show:
`X CONNECTED`

Then offer:
`CONNECT WALLET`

If wallet is connected and X is not:

Show wallet address shortened.

Then offer:
`CONNECT X`

Do not force a player to connect both.

## 5. Pre-game screen

The pre-game state should be short.

Elements:
- challenge name
- mode
- duration
- starting balance
- difficulty
- top score
- player's previous best
- `READY`

Then a dramatic countdown:

`3`

`2`

`1`

`WICK.`

Countdown animation should use scale, opacity and blur carefully. Avoid spinning 3D countdown text.

## 6. Game UI

### Desktop layout

Suggested structure:

```text
┌─────────────────────────────────────────────┐
│ WICK     TIME     BALANCE     P&L     RANK  │
├─────────────────────────────────────────────┤
│                                             │
│                 LIVE CHART                  │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ POSITION         TRADE STATUS               │
├─────────────────────────────────────────────┤
│        LONG       CLOSE       SHORT         │
└─────────────────────────────────────────────┘
```

### Mobile layout

Prioritize the chart and controls.

```text
┌──────────────────────┐
│ TIME      P&L  RANK  │
├──────────────────────┤
│                      │
│                      │
│       CHART          │
│                      │
│                      │
├──────────────────────┤
│ POSITION             │
│                      │
├──────────────────────┤
│ LONG | CLOSE | SHORT │
└──────────────────────┘
```

The controls must be thumb-friendly.

Minimum practical touch target: approximately 48 × 48 CSS px. Prefer larger for core trade buttons.

## 7. Trading controls UX

### LONG

Primary bullish action.

Pressing it should:
- create/modify the current position according to game rules.
- animate a marker onto the chart.
- update position state.
- provide a brief haptic cue when supported.

### SHORT

Same behavior in the opposite direction.

### CLOSE

Closes the current active position.

If no position is open, `CLOSE` should be disabled rather than doing nothing silently.

Do not rely only on color to distinguish long and short. Use text and iconography.

## 8. Position state

The player should always be able to tell:
- whether they are long, short, or flat
- entry price
- current price
- unrealized P&L
- time in position

On small screens, compress the secondary statistics but never hide the current position state.

## 9. Game feedback

### Successful trade

Use:
- subtle accent burst
- concise P&L update
- chart marker animation
- optional light haptic feedback

### Losing trade

Use:
- restrained red feedback
- P&L drop animation
- chart marker

Do not shake the entire screen on every loss.

### Liquidation / catastrophic loss

Use a stronger state transition:
- chart freezes
- accent changes to loss
- final number locks in
- short dramatic text such as `YOU GOT WICKED`

Avoid excessive screen effects that can reduce accessibility or cause motion discomfort.

## 10. End-of-game UX

The end-of-game transition is a key retention moment.

Suggested sequence:

1. Freeze chart.
2. Stop timer.
3. Reveal final balance.
4. Count P&L into final number.
5. Reveal score.
6. Reveal rank.
7. Show result label.
8. Offer card generation.

The result screen should not feel like a generic modal.

It should feel like a post-match sports result.

## 11. Result page hierarchy

Most important:

`RESULT TAG`

`PNL`

`ROI`

Then:

`SCORE`

`RANK`

Then:

secondary stats.

Primary CTA:

`GENERATE CARD`

Secondary CTA:

`PLAY AGAIN`

Tertiary actions:
- View profile
- View leaderboard
- Share result

## 12. Card generation UX

When user presses `GENERATE CARD`:

### State 1: preparing

Show a compact progress state.

Example:

`BUILDING YOUR CARD...`

Do not show a fake progress percentage.

### State 2: preview

Show the 1200 × 1500 card within a responsive preview frame.

### State 3: actions

- `DOWNLOAD PNG`
- `SHARE TO X`
- `COPY LINK`

Optional:
- `VIEW PROFILE`
- `PLAY AGAIN`

The card preview should use the final rendered asset, not a CSS recreation that differs from the download.

## 13. Sharing to X

Share text should be generated from result data but kept concise.

Examples:

Win:

`+24.81% in today's WICK WARS challenge. #WICK`

Loss:

`I got wicked. Again. #WICK`

Do not auto-post without user action.

Provide a share composer or X intent where supported.

## 14. Leaderboard UX

### Daily leaderboard

Optimize for immediacy.

Show:
- rank
- avatar
- player
- score
- result metric

Highlight the current user row.

If the user is far down the list, provide a sticky `YOUR RANK` summary instead of forcing them to scroll thousands of rows.

### Season leaderboard

Add:
- rank
- title
- score
- games
- win rate
- season points

### All-time leaderboard

Show legacy/status metrics rather than only today's performance.

## 15. Profile UX

Profile hero:

Avatar + handle + title + archetype + rank.

Then a compact stat strip.

Then all-time performance graph.

Then season history.

Then generated cards.

The all-time card action should be prominent:

`GENERATE ALL-TIME CARD`

If a card already exists for the same data revision, reuse/cached-render it instead of rebuilding unnecessarily.

## 16. All-time card UX

User taps `GENERATE ALL-TIME CARD`.

The system builds the card from the player's current all-time snapshot.

Show:
- generation state
- preview
- download
- share
- public card URL

The card should visually communicate permanence. It is the player's WICK identity snapshot.

## 17. Responsive behavior

Breakpoints should be content-driven.

Use a minimum of:
- small mobile
- large mobile
- tablet
- desktop
- wide desktop

Do not make the entire layout depend on device names.

### Mobile

- Single-column.
- Controls fixed near bottom when appropriate.
- Reduce decorative UI.
- Preserve chart height.
- Keep critical information above the fold.

### Tablet

- Give chart more breathing room.
- Expand stat rows.

### Desktop

- Wider chart.
- More surrounding metadata.
- Keyboard shortcuts.
- Optional side panels.

### Wide desktop

Do not simply stretch everything.

Constrain content width and increase negative space.

## 18. Loading states

Avoid generic spinners everywhere.

Use contextual loading states:
- `LOADING DAILY WICK`
- `CONNECTING`
- `BUILDING CARD`
- `LOADING PROFILE`

Use skeletons for static data sections.

## 19. Empty states

### No games

`NO RUNS YET.`

CTA:
`PLAY YOUR FIRST WICK`

### No cards

`YOUR WALL IS EMPTY.`

CTA:
`PLAY A GAME`

### No season history

`THIS IS YOUR FIRST SEASON.`

## 20. Error UX

Never show raw stack traces.

Keep error copy short and actionable.

Examples:

`COULDN'T SAVE THAT RUN`

`RETRY`

`YOUR CONNECTION DROPPED`

`RECONNECT`

If a game cannot be trusted after connection loss, mark it clearly and do not silently submit an unverified score.

## 21. Reduced motion

When `prefers-reduced-motion: reduce`:
- disable large scale transitions
- reduce chart entrance animation
- replace flashing effects with static accent states
- keep timing and hierarchy understandable

Gameplay information must remain available without animation.
