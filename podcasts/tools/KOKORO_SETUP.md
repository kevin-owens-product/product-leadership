# Kokoro audio generation

Supertone archived Supertonic in September 2026, so new episodes render with
[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) instead. Kokoro is an
82M-parameter open-weight TTS model under the Apache-2.0 license. It runs on
CPU through ONNX Runtime and the Python
[`kokoro-onnx`](https://github.com/thewh1teagle/kokoro-onnx) package.

Existing Supertonic episodes are unchanged. The generator picks the engine per
episode, so a show can mix old Supertonic seasons and new Kokoro seasons.

## Why Kokoro (Nov 2026 comparison)

| | Kokoro-82M | Kyutai Pocket TTS | Supertonic 3 |
| --- | --- | --- | --- |
| License | Apache-2.0 | CC-BY-4.0 | OpenRAIL |
| Status | Weights stable since 2025, runtime updated Aug 2026, ~12.7M HF downloads/month | Actively developed (new models Oct 2026) | Archived Sept 2026 |
| Speed on 4 CPU cores | ~0.28x real time | ~0.5x real time | — |
| Whisper check on a test paragraph | 6/6 voices clean | "agentic" misread in 3/6 voices | — |
| Built-in voices | ~50 (US and UK English voices used here) | ~20, plus voice cloning | 10 |

Pocket TTS is the fallback if Kokoro ever stops working: it is maintained and
can clone a voice from a short sample. Adding it would be one more worker
beside `kokoro-episode-worker.py`.

## One-time setup

```bash
python3 -m venv ~/code/kokoro/venv
~/code/kokoro/venv/bin/pip install kokoro-onnx soundfile scipy
cd ~/code/kokoro
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

ffmpeg is needed for MP3 output, the same as for Supertonic.

## Using it for a show

In `podcasts/shows/<id>/podcast.json`:

- `kokoroVoiceMap` maps each speaker to a Kokoro voice, for example
  `{ "ALEX": "am_michael", "RILEY": "af_heart" }`. Keep `voiceMap` too: the
  validator uses its keys as the list of known speakers.
- Set `"engine": "kokoro"` on each episode that should render with Kokoro, or
  `"ttsEngine": "kokoro"` on the show to make it the default for every episode.
  `--engine kokoro` on the command line overrides both.

Voices in use:

| Show | Speaker | Kokoro voice |
| --- | --- | --- |
| agentic-coding-frontier (S2) | ALEX / RILEY | `am_michael` / `af_heart` |
| claude-code-mastery (S2) | ALEX / JAMIE | `am_fenrir` / `af_bella` |

Kokoro has no expression tags; `<laugh>`, `<breath>` and `<sigh>` are dropped
for Kokoro episodes. Write version numbers and commands the way they should be
spoken ("slash loop", "Opus 5.5" is fine).

## Generating

```bash
KOKORO_DIR=~/code/kokoro KOKORO_PYTHON=~/code/kokoro/venv/bin/python \
  node podcasts/tools/generate-audio-supertonic.js --show agentic-coding-frontier --episode 7
```

or `npm run publish-episode -- <show> <n>` from `podcasts/pwa/`, which reads the
episode's engine and passes `KOKORO_DIR` / `KOKORO_PYTHON` through.

The worker writes 44.1 kHz mono 16-bit WAVs peak-normalized to -3 dBFS, the
same format as the Supertonic clips, music cues and silences, so the rest of
the pipeline (MP3 encode, `combined.mp3`, manifest timings) is unchanged.
The `dist/audio` gotcha in `SUPERTONIC_SETUP.md` still applies.
