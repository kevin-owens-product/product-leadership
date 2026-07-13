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
  episode length until real audio exists. Missing it is a lint warning.
- **Cue tags** — a cue sits alone on its own line and inserts silence:

  | Cue | Silence |
  | --- | --- |
  | `[PAUSE]` | 0.8s |
  | `[LONG PAUSE]` | 1.8s |
  | `[MUSIC STING]` | 1.0s |
  | `[MUSIC FADES]` / `[MUSIC FADE]` | 1.2s |
  | `[INTRO MUSIC]` | 1.5s |
  | `[OUTRO MUSIC]` | 1.5s |
  | `[SFX]` / `[SOUND]` | 0.7s |
  | `[AMBIENCE]` / `[AMBIENT BED]` | 1.0s |

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
  "episodes": [
    { "id": 1, "file": "episode-01-getting-started.md", "title": "Getting Started", "subtitle": "…" }
  ]
}
```

`voiceMap` maps speaker labels to Supertonic voice styles (`M1`, `F1`, `M2`,
`F2`, …). Without it, voices alternate M1/F1 by order of appearance and the
linter skips unknown-speaker checks.

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
missing audio files, and manifest timeline drift (against both the summed line
durations and `combined.mp3` via ffprobe when available). Warnings: missing
Duration header, missing `combined.mp3`, un-backfilled durations.

Options: `-- --show <id>`, `-- --episode <n>`, `-- --no-audio`.

The same checks gate `npm run build` — a broken episode fails the build
instead of shipping a silently truncated feed.

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
