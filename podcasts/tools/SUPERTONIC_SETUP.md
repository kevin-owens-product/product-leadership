# Supertonic audio generation

`generate-audio-supertonic.js` renders each dialogue line in an episode to a
WAV (then optionally MP3) using [Supertonic](https://github.com/supertone-inc/supertonic) —
an on-device ONNX voice synthesis engine. Output drops into `podcasts/pwa/audio/<show>/<episode>/`.
The PWA picks it up automatically: it fetches `audio/<show>/<episode>/manifest.json`
on episode open, attaches a URL to each dialogue line, and the player swaps the
browser's `speechSynthesis` for an `<audio>` element. The local production
workflow is Supertonic-first: every published episode should have a generated
manifest before the PWA is built.

## One-time setup

You need four things on the machine that will generate audio: Node 20,
the Supertonic repo, the ONNX model weights, and (optional but recommended)
`ffmpeg` for MP3 encoding.

1. **Use Node 20 for generation.** The ONNX native package is sensitive to
   Node/architecture combinations; this setup has been verified with Node
   `v20.20.2`.

   ```bash
   source ~/.nvm/nvm.sh
   nvm install 20
   nvm use 20
   ```

2. **Clone Supertonic** somewhere outside this repo:

   ```bash
   git clone https://github.com/supertone-inc/supertonic.git ~/code/supertonic
   cd ~/code/supertonic/nodejs
   npm install
   ```

   On Intel macOS, pin `onnxruntime-node` to a version that still ships the
   `darwin/x64` native binding:

   ```bash
   npm install onnxruntime-node@1.22.0 --save-exact
   ```

3. **Download the ONNX assets** from Hugging Face (uses git-lfs):

   ```bash
   cd ~/code/supertonic
   brew install git-lfs # macOS, if git-lfs is not installed
   git lfs install
   git clone https://huggingface.co/Supertone/supertonic-3 assets
   ```

   After this you should have `~/code/supertonic/assets/onnx/*.onnx` and
   `~/code/supertonic/assets/voice_styles/{M1..M5,F1..F5}.json`.

4. **Install ffmpeg** (optional — used to convert WAV→MP3 and to build a
   per-episode `combined.mp3`). Without ffmpeg, raw 16-bit WAVs are emitted
   and played by the PWA directly.

   ```bash
   brew install ffmpeg     # macOS
   sudo apt install ffmpeg # Debian/Ubuntu
   ```

## Generating audio

Point `SUPERTONIC_DIR` at your checkout, then run the generator from the repo
root.

```bash
# List episodes in a show
node podcasts/tools/generate-audio-supertonic.js \
  --show agentic-coding-frontier --list

# Render a single episode (cached lines are reused — pass --force to rebuild)
SUPERTONIC_DIR=~/code/supertonic \
  node podcasts/tools/generate-audio-supertonic.js \
  --show agentic-coding-frontier --episode 1

# Render the whole show
SUPERTONIC_DIR=~/code/supertonic \
  node podcasts/tools/generate-audio-supertonic.js \
  --show agentic-coding-frontier --all

# Preview what would be generated without calling Supertonic
node podcasts/tools/generate-audio-supertonic.js \
  --show agentic-coding-frontier --episode 1 --dry-run
```

Expect 6 hours of audio in the agentic series to take a long time on CPU
(Supertonic's Node sample loads the ONNX model on every call). Lines are
cached, so a partial run resumes cleanly.

From `podcasts/pwa`, the same generator is exposed through npm scripts:

```bash
npm run audio:list -- --show agentic-coding-frontier
npm run audio:episode -- --show agentic-coding-frontier --episode 1
npm run audio:show -- --show agentic-coding-frontier
```

## Configuring voices

Each show's `podcast.json` may include a `voiceMap` and `lang`:

```json
{
  "voiceMap": { "ALEX": "M1", "RILEY": "F2" },
  "lang": "en"
}
```

Keys match the `**NAME:**` label in each episode (case-insensitive). Values
are Supertonic voice-style names (look for `<voice>.json` under
`assets/voice_styles/` in your Supertonic checkout — defaults include M1–M5
and F1–F5). When no map is present, the generator alternates `M1` / `F1` by
order of speaker appearance.

`lang` defaults to `en`; see the Supertonic README for the full list of 31
supported codes.

## How the PWA finds the audio

The build step (`podcasts/pwa/build-episodes.js`) copies `podcasts/pwa/audio/`
into `dist/audio/`. The generated `dist/podcasts.js` includes each episode's
source `file` so the player can fetch
`audio/<show-id>/<episode-basename>/manifest.json` at runtime.

Each manifest entry includes a `rawLine` field — the source line number in
the episode markdown. The player matches each parsed dialogue line to a
manifest entry by `rawLine` (and falls back to positional matching if every
count lines up), so small edits to the markdown won't silently desync audio
from text.

## Generator flags

| Flag                | Description |
|---------------------|-------------|
| `--show <id>`       | Show directory under `podcasts/shows/`. Required. |
| `--episode <n>`     | Episode id (e.g. `1`) or filename fragment. |
| `--all`             | Render every episode in the show. |
| `--list`            | Print episodes and exit. |
| `--dry-run`         | Parse dialogue but skip Supertonic. |
| `--force`           | Re-render lines whose WAV already exists. |
| `--total-step <n>`  | Forwarded to Supertonic (default 8, higher = better/slower). |
| `--speed <f>`       | Forwarded to Supertonic (default 1.05). |
| `--no-mp3`          | Skip the ffmpeg WAV→MP3 / concat step. |

## Output layout

```
podcasts/pwa/audio/<show>/<episode-basename>/
  0000.mp3        # one file per dialogue line
  0001.mp3
  ...
  combined.mp3    # single-file episode (ffmpeg-concatenated)
  manifest.json   # rawLine / speaker / voice / chapter / file per line
```

`podcasts/pwa/audio/` is gitignored — generated audio is treated as a build
artifact. CI / Netlify regenerates from source markdown.
