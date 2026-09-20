# WICK WARS : Visual Design System

## 0. Design direction

WICK WARS is a premium dark trading arcade.

The visual language should combine:

- elite trading terminal
- competitive sports broadcast
- modern arcade interface
- internet-native meme culture

Avoid generic crypto aesthetics.

Do not default to:
- purple-on-black gradients
- floating coins
- excessive glassmorphism
- random 3D objects
- noisy particles everywhere
- huge token price displays

The design should feel deliberate, sharp and expensive.

## 1. Brand assets

The existing WICK WARS logo is authoritative.

Use the existing assets rather than recreating the logo in CSS.

Card package assets:

- `icon-mark.svg`
- `icon-tile.svg`
- `wordmark.svg`
- `lockup-horizontal.svg`

Use `icon-tile.svg` for browser/app identity where a square icon is needed.

Use `lockup-horizontal.svg` where a horizontal brand lockup is required.

## 2. Canvas and layout system

Primary UI layout base:
- 8 px spacing grid.

Primary card canvas:
- 1200 × 1500 px.

Card rendering:
- 2x working render: 2400 × 3000 px.
- final output: 1200 × 1500 px.

## 3. Colors

### Base

```text
--ww-bg: #08090C
--ww-bg-elevated: #0D0F13
--ww-surface: #11141A
--ww-surface-2: #171A21
--ww-border: #20242B
--ww-border-strong: #2A3038
```

### Text

```text
--ww-text-primary: #F5F7FA
--ww-text-secondary: #A5ACB7
--ww-text-muted: #707783
--ww-text-disabled: #474D56
```

### Win

```text
--ww-win: #35E58B
--ww-win-soft: rgba(53, 229, 139, 0.14)
--ww-win-glow: rgba(53, 229, 139, 0.22)
```

### Loss

```text
--ww-loss: #FF4F5E
--ww-loss-soft: rgba(255, 79, 94, 0.14)
--ww-loss-glow: rgba(255, 79, 94, 0.22)
```

Do not use saturated accents across large surfaces. Accents are for information hierarchy.

## 4. Typography

### Space Grotesk

Weights:
- 600
- 700

Use for:
- logo-adjacent headings
- P&L
- scores
- player names
- titles
- major metric values
- hero headings

Suggested sizing range:
- hero: 64 to 96 px desktop
- major result number: 64 to 80 px
- major stat: 36 to 48 px
- headings: 24 to 40 px
- compact labels: 14 to 16 px

### Inter

Weights:
- 400
- 500
- 600

Use for:
- body copy
- interface labels
- button labels
- descriptions
- secondary statistics

Suggested range:
- body: 15 to 18 px
- UI: 13 to 16 px
- metadata: 11 to 14 px

### IBM Plex Mono

Weights:
- 400
- 500
- 600
- 700

Use for:
- ranks
- numeric metrics
- timestamps
- prices
- percentages
- technical metadata
- chart labels

Suggested range:
- primary numeric metric: 20 to 28 px
- secondary numeric: 12 to 18 px
- chart metadata: 11 to 13 px

## 5. Type rules

Use uppercase sparingly for labels and identity states.

Use normal casing for explanatory copy.

Avoid putting all body copy in uppercase.

P&L numbers should use tabular-looking numeric presentation where possible.

Do not use italic as a primary hierarchy mechanism.

## 6. Spacing

Use a spacing scale derived from 8 px:

```text
4
8
12
16
24
32
40
48
64
80
96
128
```

Major sections should generally use 64 to 128 px separation on desktop.

On mobile, reduce vertical spacing without collapsing the visual hierarchy.

## 7. Borders and radii

General UI:

- subtle border: 1 px
- emphasis border: 1 px
- strong emphasis: 2 px only when necessary

Suggested radii:

```text
small: 8 px
medium: 12 px
large: 16 px
hero/card: 20 px
pill: 999 px
```

Avoid excessive rounded rectangles. Not every element needs a container.

## 8. Buttons

### Primary button

High contrast.

Recommended:
- black or white neutral base depending on context
- strong text contrast
- 12 to 16 px horizontal padding
- 12 to 16 px radius
- 48 px minimum height

### Game action buttons

They are a special component.

Make them substantially larger:

- mobile: 64 to 76 px height
- desktop: 56 to 72 px height

`LONG`, `CLOSE`, `SHORT` should be visually distinct through placement, label and accent behavior.

Do not rely only on red/green.

## 9. Surfaces

Use depth through:
- background changes
- subtle borders
- soft shadows
- restrained glow

Avoid stacking 5 layers of translucent glass.

## 10. Motion design

Motion should be fast, purposeful and physical.

### Landing

- subtle chart motion
- gentle logo entrance
- small metadata transitions

### Game start

Countdown:
- 300 to 600 ms per numeral depending on context.
- scale + opacity.
- final `WICK` state slightly stronger.

### Trade execution

- 150 to 250 ms marker entrance.
- 200 to 350 ms P&L transition.

### Result reveal

Suggested sequence:
- chart freeze: immediate
- result label: 150 ms
- P&L count-up: 500 to 900 ms
- score reveal: 300 to 500 ms
- rank reveal: 250 to 450 ms

Do not make the user wait several seconds before buttons become usable.

## 11. Charts

The gameplay chart should look inspired by professional charting software without cloning a specific platform.

Use:
- thin grid lines
- subtle axis labels
- visible candles
- clear position markers
- restrained volume/secondary information

The card chart can simplify the game chart while preserving the player's actual events.

## 12. Chart color treatment

Base candles should be legible in neutral tones.

Result state accent should control:
- glow
- P&L
- trade markers where appropriate
- selected graph/line state

Do not make every candle neon.

## 13. Glow usage

Glow is reserved for:
- active result state
- primary accent
- critical status
- rare achievement

Glow should be blurred and low-opacity.

Never put glow behind every component.

## 14. Texture / grain

A tiny amount of grain/noise is allowed for depth, especially on card assets.

Keep it subtle enough that text remains perfectly crisp.

Do not use noise as a substitute for visual design.

## 15. Cards

### General card characteristics

Both cards are:

`1200 × 1500 px`

The supplied SVG templates define:
- exact geometry
- exact static artwork
- token locations
- avatar masks
- graph placeholder regions

Implementation must preserve those decisions.

### Game result card

The same template supports wins and losses.

`{{ACCENT}}` controls state.

Win:
`#35E58B`

Loss:
`#FF4F5E`

The generator should not create separate visual layouts.

### All-time card

The all-time card should feel more permanent and prestigious.

Its distinction comes from:
- title
- long-term performance graph
- season history
- archetype
- peak rank

Not from adding lots of decorations.

## 16. Card dynamic text rules

Username:
- default size from template
- shrink when necessary
- truncate only as a final fallback

P&L:
- shrink in 2 px steps if content exceeds the intended width
- left anchored as defined by the SVG

Score:
- same approach

Rank:
- preserve exact number
- do not abbreviate away the rank

## 17. Avatar design

Avatar is circular.

Use the SVG's existing clipping path.

Preserve the accent ring.

Fallback:
- use initial
- neutral background
- accent ring

Do not put decorative frames around avatars unless the template explicitly has them.

## 18. Card result states

### PROFITABLE

Accent:
`#35E58B`

### WICKED

Accent:
`#FF4F5E`

### PERSONAL BEST

Can use the same win accent or a future dedicated accent once the variant system is defined.

### TOP 10 / LEGENDARY

These are future variant states. Do not create extra templates. Use the same tokenized architecture.

## 19. Responsive visual rules

### Mobile

- reduce decorative nav
- keep controls large
- use full-width chart
- compress nonessential metadata
- preserve result hierarchy

### Desktop

- more empty space
- optional side information
- wider chart
- leaderboard preview

Never reduce typography to unreadable sizes simply to fit more information.

## 20. Navigation

Primary desktop nav can include:

`PLAY`

`LEADERBOARD`

`SEASON`

`PROFILE`

Brand at left.

Connect state/actions at right.

On mobile, use a compact header and an overflow/menu pattern rather than a full desktop nav.

## 21. Footer

Keep footer minimal.

Possible links:
- How to play
- Leaderboard
- X
- Terms
- Privacy

Do not make the footer a second landing page.

## 22. Accessibility

Use contrast ratios appropriate for body text and controls.

Do not communicate state solely through color.

Use labels and symbols in addition to accent colors.

All interactive components must have visible focus states.

## 23. Brand voice in UI

Copy should be short, direct and slightly irreverent.

Examples:
- `PLAY WICK`
- `READY?`
- `YOU GOT WICKED`
- `PROFITABLE`
- `BEAT YOUR BEST`
- `TOP 1%`
- `RUN IT BACK`
- `VIEW CARD`

Avoid corporate phrasing such as:
- `Initiate trading simulation`
- `Your performance has been calculated successfully`
- `Congratulations on your result`

## 24. Visual hierarchy test

Before approving any major screen, blur the screen mentally or literally.

The eye should still know:
1. what the main action is
2. what the current state is
3. where the main metric is
4. where the next action is

If everything is glowing, nothing is important.
