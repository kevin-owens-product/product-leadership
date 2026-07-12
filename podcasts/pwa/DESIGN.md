# DESIGN.md — the design bible

Direction: **Ember & Wash** — a hybrid of comp A (Ember refined) and comp B
(Artwork-adaptive). This file governs every visual decision from D2 onward.
If a change can't cite a token or rule here, it doesn't ship.

---

## 1. The D1 verdict

Three complete comps were built in `design-lab/` and screenshot-judged at
393×852 (`design-shots/comps/*.png`). Rubric scores (Hierarchy / Rhythm /
Color / Depth / Motion-intent / Survives-real-content):

| Direction | Player | Home | Notes |
|---|---|---|---|
| **A. Ember refined** | 5 / 4 / 4 / **5** / 4 / 5 | 4 / 4 / 4 / 4 / 4 / 5 | Best depth story in the set: black shadow + ember bloom + warm edge light makes the hero and play button feel lit from within. Warm neutrals give the shell a personality no near-gray base has. Weakness: one accent everywhere — every show's player looks identical, and warm-hued artwork (Forge) melts into the shell. |
| **B. Artwork-adaptive** | 5 / 4 / **5** / 4 / 4 / 5 | 4 / 4 / **5** / 4 / 4 / 4 | The single-input palette (`--show-hue` → seven derived roles) is the strongest *system* in the set: 8 distinct show identities from one formula, verified across Deadwater (teal) and Forge (ember) players. Weakness: the base neutral ramp is cold and near-achromatic — with no show active the app reads as a generic dark theme; brand evaporates. |
| **C. Editorial mono** | 4 / 4 / 3 / 2 / 3 / 4 | 4 / 5 / 3 / 2 / 3 / 4 | Gorgeous editorial rhythm on home rows and a genuinely striking display title. But it deliberately refuses an elevation story (hairlines only → Depth 2), the cold cyan accent is arbitrary, and mono hairline artwork is indistinguishable at thumb size (see home list: five near-identical dark squares). Fails two rubric axes; rejected. |

**Winner: A + B hybrid.** A supplies the *shell*: warm neutral ramp, ember as
the brand/resting accent, glow-tinged elevation. B supplies the *identity
layer*: every show gets one hue, seeded into its generated artwork, and the
entire show context (player wash, scrubber, chips, mini-player, card tint)
derives from that hue by formula. Ember is not "the accent that fights the
show color" — it is simply the app's own show-hue (43) used whenever no show
context is active, so the resting state and the active state are the same
system.

## 2. Core tokens (source of truth: `styles/base.css :root`)

### Neutral ramp — warm, hue ~56, real chroma
```
--neutral-0  oklch(0.125 0.010 58)   deepest recess
--neutral-1  oklch(0.162 0.011 56)   page background   (--surface-0)
--neutral-2  oklch(0.212 0.013 55)   card              (--surface-1)
--neutral-3  oklch(0.258 0.015 54)   nested            (--surface-2)
--neutral-4  oklch(0.318 0.016 52)   borders           (--border)
--neutral-6  oklch(0.57  0.020 48)   tertiary text
--neutral-7  oklch(0.708 0.022 50)   secondary text
--neutral-9  oklch(0.982 0.006 60)   primary text
```
Chroma *rises as lightness falls* (0.006 → 0.016): shadows are warmer than
highlights, like light from a low fire. Never introduce a neutral outside
this ramp.

### Ember accent ramp (brand)
```
--accent-200 oklch(0.806 0.108 58)   accent TEXT on surface-0..2 (≥4.5:1)
--accent-300 oklch(0.748 0.140 52)   hover
--accent-400 oklch(0.705 0.163 47)
--accent-500 oklch(0.665 0.180 43)   reference FILL step (--accent)
--accent-600 oklch(0.552 0.152 40)   pressed / deep
```
`--on-accent: oklch(0.145 0.02 45)` — **dark ink on ember fills**; white does
not pass 4.5:1 on `--accent-500` and is banned on accent fills. Status fills
(success-deep etc.) that need white use `--on-status`.

### Elevation — dark UIs need edge light, not just shadow
```
--edge-highlight  inset 0 1px 0 oklch(1 0.01 60 / 0.06)   (warm edge)
--shadow-1..3     black depth, unchanged tiers
--shadow-hero     black depth + 64px bloom of var(--show-glow)
--glow-play       tight black + 28px halo of var(--show-glow)
```
Raised/floating surfaces always pair a `--shadow-N` with `--edge-highlight`.
The hero artwork and primary play button are the **only** elements allowed a
color-glow shadow.

Type, space, radius, and motion tokens are unchanged from D0 (1.2 modular
type spine with two half-steps; 4-base space scale; 4/8/12/16 radii;
120/200/320ms + `--ease-out`/`--ease-spring`/`--stagger`). Timers always set
`font-variant-numeric: tabular-nums`; titles get `text-wrap: balance`.

## 3. The adaptive show palette (from B — the identity engine contract)

One number per show: `--show-hue`, the same hue seeded into the show's
generated artwork. Everything else is derived, never hand-picked:

```
--show-accent      oklch(0.74 0.145 h)        fills: play button, scrubber fill,
                                              mini-player progress, active chip
--show-accent-deep oklch(0.52 0.11  h)        pressed states, gradient tail
--show-text        oklch(0.85 0.075 h)        tinted text on dark surfaces
--show-wash        oklch(0.315 0.055 h)       radial background wash
--show-chip        oklch(0.74 0.145 h / 0.14) subtle fills (chips, pills)
--show-on-accent   oklch(0.16 0.035 h)        glyphs on --show-accent fills
--show-glow        oklch(0.6 0.13 h / 0.38)   feeds --shadow-hero / --glow-play
```

Rules:
- `src/ui/artwork.js` owns the show→hue mapping and sets these properties on
  `<body>` when a show context becomes active; it removes them when context
  clears (falling back to the ember defaults in `:root`, `--show-hue: 43`).
- **Contrast is clamped at generation time**: `--show-text` (L 0.85) must
  measure ≥4.5:1 against `--surface-0` and against `--show-wash`;
  `--show-on-accent` (L 0.16) ≥4.5:1 against `--show-accent` (L 0.74). The
  L/C values above already guarantee this for every hue; if a formula value
  is ever tuned, re-verify the worst-case hue (yellows, h≈100) before ship.
- The wash is applied as `radial-gradient(140% 52% at 50% -8%, var(--show-wash), transparent 72%)`
  over `--surface-0` — top-of-screen only, never a full-bleed tint.
- Light theme overrides `--show-text`, `--show-wash`, `--show-glow` in
  `body.light-theme` (darker text, paler wash, fainter glow).

### Where adaptive color applies
- **Player**: background wash, scrubber fill, chapter chip, elapsed time,
  play button + its glow, hero artwork shadow bloom.
- **Mini-player**: progress hairline, play glyph, artwork thumb.
- **Home show cards / episode-list header**: card/header tint via
  `--show-chip`-strength gradients and the artwork itself.
- **Everything else stays ember**: app chrome, focus rings, toasts, modals,
  settings, status colors. Adaptive color means "you are inside this show,"
  never "this is a colorful app."

## 4. Do / Don't

**Do**
- Trace every color to a token; derive show colors only via the §3 formula.
  (Do: `background: var(--show-chip)`. Don't: `background: #1f4d4a`.)
- Give the player exactly one focal point: hero artwork with `--shadow-hero`,
  then title, then transport. Panels below the transport must be visually
  quieter than the hero (smaller type, `--surface-1`, no glow).
- Use uppercase micro-labels (`--fs-caption`, `--tracking-caps`, 600) for
  kickers like NOW PLAYING / CONTINUE — and nothing larger in caps.
- Pair every raised surface with `--edge-highlight`; light comes from above.
- Animate only `transform`/`opacity`, consuming `--dur-*`/`--ease-*`, with a
  `prefers-reduced-motion` branch every single time.
- Dark glyphs (`--on-accent` / `--show-on-accent`) on accent fills.

**Don't**
- Don't put white text on `--accent` or `--show-accent` fills (3.2:1 — fails).
- Don't use ember for a second job inside a show context (e.g. an ember
  badge on a teal Deadwater card) — inside a show, the show hue *is* the
  accent; ember reappears only in global chrome.
- Don't tint text with hues other than `--show-text`/`--accent-text` — body
  copy stays on the neutral ramp.
- Don't add a third glow. Hero + play button only; a glowing card grid reads
  as a casino.
- Don't hand-pick a per-show color "because the formula looks dull for this
  one" — fix the formula or accept it; per-show exceptions destroy the system.
- Don't reintroduce initials-on-a-gradient artwork or emoji-on-canvas; show
  artwork is a designed motif (see §5).

## 5. Artwork (D2 contract)

Each show's cover is generated SVG→data-URL at 2x: a deep, warm-dark field
carrying the show hue (wash gradient + subtle grain), one **designed motif**
drawn per show (waves, node graph, terminal chevron, radar rings… seeded
deterministically from the show id), and a letterspaced caps wordmark. It
must read at both 44px (mini-player) and 320px (hero). The motif inks come
from the show palette (accent / text steps); no pure white, no pure black,
no emoji, no initials.

## 6. Player screen anatomy (D3.1 — the signature screen)

Fixed vertical order, one centered column (max 30rem; fold sections 40rem):

1. **Header**: back chevron · NOW PLAYING kicker · ⋯ (options sheet). Ghost
   44px round buttons; no filled chrome up here.
2. **Hero**: `.np-stage` artwork slab (≤288px, `--shadow-hero`, edge light)
   with the audio-reactive visualizer as a halo BEHIND it (`inset: -7% 6%`
   — taller than the art, narrower than it, so loud bars emerge past the
   top/bottom edges only; blurred `--show-accent` bars, transform/opacity
   only, `display:none` under reduced motion).
3. **Type stack**: episode title (`--fs-heading`, 3-line clamp, balance) →
   show · episode number (`--show-text`) → chapter chip + sleep chip
   (`--show-chip` / warning chips).
4. **Scrubber**: 6px full-radius track, ±16px hit area, chapter ticks,
   buffered tint, thumb grows 1.55× while scrubbing; elapsed time is the
   only tinted label (`--show-text`).
5. **Transport**: 72px `--show-accent` play disc (`--glow-play`; the only
   other glow) flanked by ghost skip buttons — circular-arrow glyph with
   the configured seconds inside (`.skip-num`, tabular); outer 30s pair
   steps down in size and tone.
6. **Secondary row**: quiet 44px icon buttons — speed value, sleep, queue,
   bookmark, share — plus the Auto pill (`--show-chip` when active).
7. **Fold seam**: hairline + `--space-6`; below it chapters/bookmarks/queue
   tabs and the transcript panel, all `--surface-1`, no glow.

**Demotion rule**: settings accordion, status readout, stats, and Home live
in the ⋯ bottom sheet (`.sheet-overlay`/`.sheet`, grabber, slide-up with
reduced-motion branch) — never on the primary screen. Icons are hand-drawn
inline SVG, 1.8px round strokes (`.icon`); no emoji glyphs in player chrome.

## 7. Motion choreography (D4 contract)

Every animation consumes `--dur-*`/`--ease-*`/`--stagger`, touches only
`transform`/`opacity` (a press state may *set* `filter: brightness()` but
never transitions it), and has a `prefers-reduced-motion` branch that
swaps motion for an instant state. Verify with
`tools/motion-probe.mjs` (mid-transition frames; `--reduced-motion` to
prove the static branch).

- **Shared-element artwork morph**: one artwork flies between screens via
  View Transitions — home card → show header → player hero → mini-player
  thumb, and back. `morphViews` (src/ui/motion.js) tags exactly one
  source/destination pair with `view-transition-name: hero-art` per
  navigation and cleans up after; CSS (base.css) gives the group
  `--dur-3` + `--ease-spring` and swaps snapshots instantly (same art on
  both ends — cross-fading would blur the flight). The mini-player
  expand is this same morph, so it lands exactly on the hero; the
  `spring-in` rise is only the no-View-Transitions fallback.
- **Staggered list entrances**: showView stamps `.entering` on a
  newly-activated list view (700ms lifetime); the first 8 cards rise
  10px on the `--stagger` (35ms) beat, `backwards` fill, rows 9+ appear
  instantly. Re-renders (search keystrokes, sort) happen after the stamp
  expires and never re-ripple.
- **Press states**: cards scale 0.97 with an instant `brightness(1.07)`;
  round buttons may depress further (0.9–0.94). Transform transitions
  on `--dur-1`; brightness snaps.
- **Scrubber thumb**: grows 1.55× on grab and settles back on release
  with `--dur-2` + `--ease-spring` (transform only).
- **Sheet physics**: sheets/mobile modals travel their full height
  (`translateY(100%)` → 0, `--dur-3`, `--ease-out`) while the scrim
  fades in over `--dur-2` (`scrimIn`, opacity only). Desktop dialogs
  keep the `modalIn` fade-rise. No overshoot: a bottom-anchored sheet
  that overshoots exposes a gap.
- **Don't**: no second shared-element name; no morphs from queue jumps
  or deep links (plain cross-fade — there is no on-screen source to fly
  from); no entrance animation past the 8th row; nothing animates
  `width`/`height`/layout.

## 8. Comps (reference renders)

- `design-lab/a-ember-*.html` → shell look: warm ramp, glow elevation.
- `design-lab/b-adaptive-*.html` → adaptive mechanics + home card grid.
- `design-lab/c-editorial-*.html` → rejected; keep only its lesson: bigger,
  balanced display titles and disciplined caps kickers.
- Screenshots: `design-shots/comps/*.png`.
