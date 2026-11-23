#!/usr/bin/env python3
"""Kokoro-82M batch worker for generate-audio-supertonic.js (--engine kokoro).

Reads the same job JSON the Supertonic worker reads and writes one mono
16-bit PCM WAV per line at 44.1 kHz, so Kokoro clips concatenate cleanly with
the generator's 44.1 kHz silence and music cues.

Job shape:
  {
    "kokoroDir": "/path/with/kokoro-v1.0.onnx-and-voices-v1.0.bin",
    "speed": 1.0,
    "lines": [{"text": "...", "voice": "am_michael", "outputPath": "/abs/0000.wav"}]
  }

Requires: pip install kokoro-onnx soundfile scipy
Model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
"""

import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro

OUT_RATE = 44100
TARGET_PEAK = 10 ** (-3 / 20)  # -3 dBFS, matches the Supertonic worker


def lang_for(voice: str) -> str:
    # Kokoro voice ids start with a language letter: a = US English, b = UK English.
    return "en-gb" if voice.startswith("b") else "en-us"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        job = json.load(f)

    kdir = job["kokoroDir"]
    model = os.path.join(kdir, job.get("modelFile", "kokoro-v1.0.onnx"))
    voices = os.path.join(kdir, job.get("voicesFile", "voices-v1.0.bin"))
    print(f"Loading Kokoro from {model}", flush=True)
    kokoro = Kokoro(model, voices)
    known = set(kokoro.get_voices())
    speed = float(job.get("speed", 1.0))

    lines = job["lines"]
    for i, line in enumerate(lines):
        voice = line["voice"]
        if voice not in known:
            print(f"Unknown Kokoro voice '{voice}'", file=sys.stderr)
            return 2
        print(f"line {i + 1}/{len(lines)} -> {line['outputPath']}", flush=True)
        samples, rate = kokoro.create(line["text"], voice=voice, speed=speed, lang=lang_for(voice))
        audio = np.asarray(samples, dtype=np.float32)
        if rate != OUT_RATE:
            g = np.gcd(OUT_RATE, rate)
            audio = resample_poly(audio, OUT_RATE // g, rate // g).astype(np.float32)
        peak = float(np.max(np.abs(audio))) if audio.size else 0.0
        if peak > 0:
            audio = audio * (TARGET_PEAK / peak)
        os.makedirs(os.path.dirname(line["outputPath"]), exist_ok=True)
        pending = f"{line['outputPath']}.{os.getpid()}.tmp.wav"
        try:
            sf.write(pending, audio, OUT_RATE, subtype="PCM_16")
            os.replace(pending, line["outputPath"])
        finally:
            if os.path.exists(pending):
                os.remove(pending)
    return 0


if __name__ == "__main__":
    sys.exit(main())
