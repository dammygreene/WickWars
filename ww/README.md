# WICK WARS — Card Template Package

Canvas: **1200 × 1500px** for every card. Fonts: Space Grotesk (700/600), Inter (400–600), IBM Plex Mono (400–700) — all free on Google Fonts, all natively available in Figma's font picker.

## Files

| File | What it is |
|---|---|
| `game-result-template.svg` | Master template for every post-game card (win AND loss — one file) |
| `all-time-template.svg` | Master template for the permanent profile card |
| `icon-mark.svg` | Logo mark alone, transparent bg |
| `icon-tile.svg` | Logo mark on a rounded dark tile — use for avatar/favicon |
| `wordmark.svg` | "WICK WARS" text lockup alone |
| `lockup-horizontal.svg` | Icon + wordmark combined (this is what's in the card footers) |

## How the templates work

Both card SVGs are **fully tokenized** — every dynamic value is a `{{TOKEN}}` placeholder sitting exactly where the real value should render. Your generator does a plain string-replace on the raw SVG text, then rasterizes it (see "Rendering" below). No Figma round-trip needed at generation time — Figma is just where you (Greene) go to art-direct the static parts.

There is **one template per card type**, not separate win/loss files. Win vs. loss is entirely controlled by the `{{ACCENT}}` token — swap one hex value and the whole card's glow, PnL color, pill, and graph line follow automatically.

### Global tokens (both templates)
| Token | Example | Notes |
|---|---|---|
| `{{ACCENT}}` | `#35E58B` win / `#FF4F5E` loss | Drives glow, PnL color, pill, graph |
| `{{USERNAME}}` | `@OREOLUWA` | |
| `{{AVATAR_INITIAL}}` | `O` | Fallback only — see Avatars below |
| `{{SEASON}}` | `S01` | |

### `game-result-template.svg` tokens
`{{RESULT_TAG}}` (e.g. `PROFITABLE` / `WICKED`), `{{DATE}}`, `{{MODE}}`, `{{PAIR}}`, `{{DURATION}}`, `{{START_BALANCE}}`, `{{END_BALANCE}}`, `{{PNL}}`, `{{ROI_ARROW}}` (▲/▼), `{{ROI}}`, `{{TRADES}}`, `{{WIN_RATE}}`, `{{HOLD_TIME}}`, `{{SCORE}}`, `{{RANK}}`, `{{RANK_TOTAL}}`, `{{PERCENTILE}}`

The `<g id="chart-region">` block is a **placeholder** — a sample chart is drawn there so the layout previews correctly, but your renderer should replace this entire group with procedurally-generated candles built from the player's actual trade log (entry/exit timestamps → candle positions, long/short markers at the right x,y). This is the one part that can't be a simple string-replace; budget it as its own small task, and test it against edge cases early — a 1-trade game, and a game where the player never closes before time runs out.

### `all-time-template.svg` tokens
`{{TITLE}}` (e.g. `WICK LORD`), `{{PEAK_RANK}}`, `{{GAMES}}`, `{{WIN_RATE}}`, `{{BEST_SCORE}}`, `{{BEST_WIN}}`, `{{LONGEST_STREAK}}`, `{{SEASONS_PLAYED}}`, `{{FIRST_PLAYED}}`, `{{ARCHETYPE}}`, `{{SEASON_RANGE}}`, `{{TAGLINE}}`

Same deal for `<g id="graph-region">` — sample line shown, your renderer should plot it from real season-by-season rating/score history.

## Long values won't break the layout

Every dynamic text sits inside a fixed region, but SVG `<text>` doesn't auto-wrap or auto-shrink — your renderer needs to handle two failure modes before it ever ships:
- **Long usernames** (`@thegreatestdegenever`) — either auto-shrink `font-size` based on character count, or truncate with an ellipsis past ~14 characters.
- **Huge numbers** (`$184,291.72` vs `$9.21`) — the PnL and score fields use `text-anchor="start"` at a fixed left x, so they grow rightward and are safe up to about 13 characters at the current font size; past that, shrink font-size in 2px steps until it fits the content width (roughly 620px for the PnL line).

## Avatars

The avatar is a circle with `clip-path="url(#avatarClip)"` (or `avatarClip2` on the all-time card) already positioned correctly. Replace the placeholder circle+initial with an `<image>` tag using the same `clip-path`, pointing at the player's PFP (from X or their wallet). Keep the ring stroke — it's tokenized to `{{ACCENT}}` and is doing real work distinguishing win/loss/profile state at a glance.

## Rendering

These are plain SVG with standard `<text>`, gradients, and clip-paths — no filters or foreign objects that would trip up common renderers. Any of these work:
- **`resvg`** (Rust, fastest, good font support) — recommended for a Node/Bun backend
- **`sharp`** + `svg2png` if you're already on a Node image pipeline
- **`satori`** if you'd rather build cards from JSX/data objects instead of string-replacing raw SVG (more setup, more flexible long-term)

Whatever you pick, render at 2x (2400×3000) before compressing down for the share/download version — text stays crisp on retina screens and when someone zooms into the X post.

## Rare/variant states

The `{{RESULT_TAG}}` and `{{ACCENT}}` tokens are generic on purpose — when you're ready to add `PERSONAL BEST`, `TOP 10`, or `LEGENDARY` cards later, they're just a third/fourth accent + tag combination on this exact same template. No new file needed.
