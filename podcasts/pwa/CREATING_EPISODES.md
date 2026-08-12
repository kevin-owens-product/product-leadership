# Creating Episodes

Everything here runs from `podcasts/pwa/` with plain Node — no extra dependencies.

```
npm run new-episode                                # scaffold a show/episode
npm run validate                                   # lint markdown + audio manifests
npm run publish-episode -- <show-id> <episode-nr>  # validate → TTS → backfill → build
```

## Content layout

```
podcasts/shows/<show-id>/
  podcast.json            show metadata, episode list, TTS voiceMap
  episode-01-<slug>.md    one Markdown file per episode
podcasts/pwa/audio/<show-id>/<episode-basename>/
  0000.mp3 … NNNN.mp3     one clip per dialogue line / cue
  combined.mp3            whole episode (streaming playback)
  manifest.json           per-line text, chapter, duration, startTime
```

## Episode Markdown format

```markdown
# Episode 1: Getting Started
## "Optional Subtitle"

**Duration:** ~30 minutes
**Hosts:** Alex & Riley
**Podcast:** My Show

---

### INTRO

[INTRO MUSIC]

**ALEX:** One full spoken paragraph per line. Keep the colon inside the bold markers.

**RILEY:** Every `### HEADING` starts a new chapter in the player.

[PAUSE]
```

Rules the pipeline actually enforces:

- **Dialogue** — `**NAME:** text` on a single line. `NAME` must be a key in the
  show's `voiceMap` (uppercase letters, digits, spaces, `'&()./-`). Narrative
  shows may instead use the bracket form `[NAME] text`.
- **Chapters** — every `### HEADING` becomes a chapter marker.
- **Duration header** — `**Duration:** ~NN minutes` is used to estimate the
  episode length until real audio exists. Missing it is a lint warning. Once
  audio exists, `node ../tools/sync-duration-headers.js` rewrites the header
  from the real manifest timeline, so it stops being an estimate.
- **Cue tags** — a cue sits alone on its own line. The four music cues render
  the show's theme (see below); the rest insert silence:

  | Cue | Renders |
  | --- | --- |
  | `[PAUSE]` | 0.8s silence |
  | `[LONG PAUSE]` | 1.8s silence |
  | `[MUSIC STING]` | ~1.8s sting |
  | `[MUSIC FADES]` / `[MUSIC FADE]` | ~2.8s pad fade |
  | `[INTRO MUSIC]` | ~4.2s theme |
  | `[OUTRO MUSIC]` | ~5.5s theme, ringing out |
  | `[SFX]` / `[SOUND]` | 0.7s silence |
  | `[AMBIENCE]` / `[AMBIENT BED]` | 1.0s silence |

  A suffix after `-` or `:` is allowed (`[MUSIC STING - FADE TO SILENCE]`).
  Any other `[BRACKETED]` line is a stage direction: it is skipped and
  produces **no** pause — near-misses like `[PAUSE FOR EFFECT]` are lint errors.
- **Expression tags** — inline `<laugh>`, `<breath>`, and `<sigh>` inside a
  dialogue line add vocal nuance to the generated audio (Supertonic 3
  feature). They are stripped from the on-screen transcript and from the
  duration estimate, and pass through to the TTS only:

  ```markdown
  **ALEX:** <laugh> Okay, that one actually surprised me. <breath> Let's dig in.
  ```

  Tags are lowercase; `<laugh>` is the most clearly audible of the three.
  Any other `<angle>` token is a lint error and is stripped from the audio
  rather than read aloud.

## Show music

The four music cues render a per-show theme — a plucked motif over a soft pad,
synthesized by `podcasts/tools/cue-music.js` with no dependencies or asset
files. Every parameter derives from a hash of the show id, so a new show gets a
usable theme for free and re-rendering always produces identical bytes.

Music is normalized to sit ~10 dB under speech, so it never competes with the
dialogue. To give a show a deliberate character instead of the hashed default,
add an entry to `SHOW_OVERRIDES` in that file:

```js
'the-decision-room': { rootHz: 174.61, mode: 'minorPentatonic', brightness: 0.7, tempo: 84 },
```

`mode` is `majorPentatonic` or `minorPentatonic`; `brightness` (0–1) controls
pluck damping and pad shimmer. Cue WAVs are cached like dialogue, so after
changing a theme delete the show's cue clips (or pass `--force`) and re-run
`npm run audio:show` to hear it.

### `podcast.json`

```json
{
  "id": "my-show",
  "title": "My Show",
  "subtitle": "…",
  "description": "…",
  "author": "Alex & Riley",
  "color": "#6366f1",
  "icon": "🎙️",
  "voiceMap": { "ALEX": "M1", "RILEY": "F2" },
  "lang": "en",
  "seasons": [
    { "number": 1, "title": "Foundations", "description": "Build the core operating model." },
    { "number": 2, "title": "Advanced Practice", "description": "Apply the model under pressure." }
  ],
  "episodes": [
    { "id": 1, "season": 1, "file": "episode-01-getting-started.md", "title": "Getting Started", "subtitle": "…" }
  ]
}
```

`seasons` is optional. Add it only after a show has at least two published
seasons. Every season needs a unique positive `number`, a listener-facing
`title`, and a short `description`; when `seasons` exists, every episode must
declare the matching numeric `season`. The app then renders a season navigator,
season progress, and a smart continue action. Shows without `seasons` retain the
standard flat episode list.

`voiceMap` maps speaker labels to Supertonic voice styles (`M1`, `F1`, `M2`,
`F2`, …). Without it, voices alternate M1/F1 by order of appearance and the
linter skips unknown-speaker checks. That fallback only holds for a two-hander:
a third speaker wraps back onto M1 and becomes indistinguishable from the
first, so any show with 3+ speakers needs an explicit `voiceMap` (the linter
warns). Mapping two speakers to the same voice warns too.

## Commands

### `npm run new-episode`

Interactive wizard. Pick an existing show (or scaffold a new one modeled on
`shows/_template`), enter the episode number/title/subtitle, and it writes a
lint-clean Markdown skeleton — frontmatter, the show's speaker roster, and a
cue-tag reference comment — and registers the episode in `podcast.json`.

### `npm run validate`

Lints every episode and checks generated audio, printing `file:line` messages.
Errors (exit 1): unknown speakers, malformed/near-miss cue tags, unclosed
brackets, colon-outside-bold speaker labels, broken `podcast.json` entries,
missing audio files, manifest timeline drift (against both the summed line
durations and `combined.mp3` via ffprobe when available), and
`AUDIO PLAYS THE WRONG LINE` — dialogue that resolves to a manifest entry
whose text disagrees, which is what a post-render line shift looks like.
Warnings: missing Duration header, missing `combined.mp3`, un-backfilled
durations, and voice collisions — two speakers mapped to the same voice, or
3+ speakers with no `voiceMap` (the M1/F1 fallback would give the third
speaker the first one's voice).

Options: `-- --show <id>`, `-- --episode <n>`, `-- --no-audio`.

The same checks gate `npm run build` — a broken episode fails the build
instead of shipping a silently truncated feed.

### `node ../tools/sync-duration-headers.js [--show <id>] [--dry-run]`

Rewrites every episode's `**Duration:** ~NN minutes` header from the real
manifest timeline, and inserts one where it's missing. Episodes without
generated audio are skipped. `publish-episode` runs it scoped to the show it
just published; run it by hand after regenerating audio or after editing a
script enough to change its length. Pass `--show` to scope it — an unscoped
run touches every show in the catalog.

Inserting a header shifts the lines below it, and manifests point at dialogue
by markdown line number, so the tool shifts the manifest's `rawLine` values by
the same amount — exactly what a re-render would produce, without paying for
TTS again. Editing a script by hand does **not** get that fixup: change an
already-rendered episode's line count and its audio silently plays one line
out of step. `npm run validate` fails with `AUDIO PLAYS THE WRONG LINE` when
that happens; regenerate the show's audio to fix it.

(Distinct from `../tools/backfill-manifest-durations.js`, which writes
`duration`/`startTime` into the manifests from the audio files.)

### `npm run publish-episode -- <show-id> <episode-nr> [--dry-run] [--force]`

Chains the whole pipeline for one episode:

1. validate (Markdown + show manifest)
2. TTS via `../tools/generate-audio-supertonic.js` (needs `SUPERTONIC_DIR`,
   default `~/code/supertonic` — see `../tools/SUPERTONIC_SETUP.md`)
3. duration backfill via `../tools/backfill-manifest-durations.js`
4. `node build-episodes.js` (which re-validates everything, audio included)

TTS is slow but **resumable**: one WAV is cached per line, so if a run is
interrupted, re-running the command skips every already-rendered line (the
plan output shows the cached/total count). `--dry-run` prints the plan and
runs the lint without executing TTS. `--force` re-renders cached lines.
