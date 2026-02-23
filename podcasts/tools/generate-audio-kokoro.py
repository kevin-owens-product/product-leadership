#!/usr/bin/env python3
"""
Audio Generation Script for PodLearn (Kokoro TTS)

Generates high-quality audio from podcast episode markdown files
using the Kokoro-82M open-source TTS model (runs locally on CPU).

Usage:
    python generate-audio-kokoro.py --list
    python generate-audio-kokoro.py --dry-run 1
    python generate-audio-kokoro.py 1
    python generate-audio-kokoro.py --all
    python generate-audio-kokoro.py --show tech-leadership 1

Dependencies:
    pip install kokoro soundfile pydub
    brew install ffmpeg

Voice configuration:
    Default voices: am_adam (speaker 1), am_michael (speaker 2)
    Override via env: VOICE_ALEX=af_heart VOICE_SAM=am_echo
    Override via CLI: --voices '{"ALEX":"af_heart","SAM":"am_echo"}'
"""

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

import numpy as np

# Paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
SHOWS_DIR = SCRIPT_DIR / ".." / "shows"
OUTPUT_DIR = SCRIPT_DIR / ".." / "pwa" / "audio"

# Default Kokoro voices (first two speakers get these; extras cycle)
DEFAULT_VOICES = ["am_adam", "am_michael"]

SAMPLE_RATE = 24000  # Kokoro outputs 24kHz audio
MAX_CHUNK_CHARS = 500


# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

def log(msg, level="info"):
    colors = {"info": "\033[36m", "ok": "\033[32m", "warn": "\033[33m", "error": "\033[31m"}
    reset = "\033[0m"
    prefix = f"{colors.get(level, '')}{level.upper()}{reset}"
    print(f"[{prefix}] {msg}")


# ---------------------------------------------------------------------------
# Episode discovery
# ---------------------------------------------------------------------------

def find_all_episodes(show_filter=None):
    """Scan shows/ for episode-*.md files. Returns list of dicts."""
    episodes = []
    if not SHOWS_DIR.is_dir():
        log(f"Shows directory not found: {SHOWS_DIR}", "error")
        return episodes

    for show_dir in sorted(SHOWS_DIR.iterdir()):
        if not show_dir.is_dir() or show_dir.name.startswith("_"):
            continue
        if show_filter and show_dir.name != show_filter:
            continue
        for md_file in sorted(show_dir.glob("episode-*.md")):
            episodes.append({
                "show": show_dir.name,
                "file": md_file.name,
                "path": md_file,
            })
    return episodes


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------

def clean_text(text):
    """Remove markdown formatting for TTS."""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)   # bold
    text = re.sub(r"\*([^*]+)\*", r"\1", text)        # italics
    text = re.sub(r"`([^`]+)`", r"\1", text)          # inline code
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # links
    return text.strip()


def parse_episode(file_path):
    """Parse a markdown episode file into dialogue lines.

    Dynamically detects any **SPEAKER:** pattern.
    Returns list of {speaker, text, chapter}.
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    dialogue = []
    current_chapter = "INTRO"
    speaker_pattern = re.compile(r"^\*\*([A-Z][A-Z0-9]+):\*\*\s*(.+)$")
    stage_direction = re.compile(r"^\*\*\[.*\]\*\*$")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Track chapters via ### headers
        if stripped.startswith("### "):
            current_chapter = stripped[4:].strip()
            continue

        # Skip stage directions like **[MUSIC FADES]**
        if stage_direction.match(stripped):
            continue

        # Parse speaker lines
        m = speaker_pattern.match(stripped)
        if m:
            speaker = m.group(1).upper()
            text = clean_text(m.group(2))
            if text:
                dialogue.append({
                    "speaker": speaker,
                    "text": text,
                    "chapter": current_chapter,
                })

    return dialogue


# ---------------------------------------------------------------------------
# Text chunking
# ---------------------------------------------------------------------------

def chunk_text(text, max_chars=MAX_CHUNK_CHARS):
    """Split long text at sentence boundaries, yielding chunks <= max_chars.

    If a single sentence exceeds max_chars it is yielded as-is.
    """
    if len(text) <= max_chars:
        yield text
        return

    # Split on sentence-ending punctuation followed by space
    sentences = re.split(r"(?<=[.!?])\s+", text)
    buf = ""
    for sent in sentences:
        if buf and len(buf) + 1 + len(sent) > max_chars:
            yield buf
            buf = sent
        else:
            buf = f"{buf} {sent}".strip() if buf else sent
    if buf:
        yield buf


# ---------------------------------------------------------------------------
# Voice mapping
# ---------------------------------------------------------------------------

def build_voice_map(dialogue, cli_voices_json=None):
    """Build a {SPEAKER: kokoro_voice_id} mapping.

    Priority: CLI --voices JSON > VOICE_<SPEAKER> env vars > defaults.
    """
    # Discover unique speakers in order of first appearance
    seen = {}
    for line in dialogue:
        if line["speaker"] not in seen:
            seen[line["speaker"]] = len(seen)
    speakers_ordered = list(seen.keys())

    # Start with defaults assigned by appearance order
    voice_map = {}
    for i, spk in enumerate(speakers_ordered):
        voice_map[spk] = DEFAULT_VOICES[i % len(DEFAULT_VOICES)]

    # Override from env vars (e.g. VOICE_ALEX=af_heart)
    for spk in speakers_ordered:
        env_val = os.environ.get(f"VOICE_{spk}")
        if env_val:
            voice_map[spk] = env_val

    # Override from CLI JSON
    if cli_voices_json:
        try:
            overrides = json.loads(cli_voices_json)
            for spk, voice in overrides.items():
                voice_map[spk.upper()] = voice
        except json.JSONDecodeError as e:
            log(f"Invalid --voices JSON: {e}", "error")

    return voice_map


# ---------------------------------------------------------------------------
# Audio generation
# ---------------------------------------------------------------------------

def check_ffmpeg():
    """Verify ffmpeg is available."""
    if not shutil.which("ffmpeg"):
        log("ffmpeg not found. Install it with: brew install ffmpeg", "error")
        sys.exit(1)


def generate_episode_audio(episode, pipeline, voice_map, dry_run=False):
    """Generate MP3 audio files and manifest for one episode."""
    ep_file_stem = episode["path"].stem  # e.g. episode-01-pe-value-creation
    show_id = episode["show"]

    log(f"Parsing {episode['file']}...")
    dialogue = parse_episode(episode["path"])
    log(f"Found {len(dialogue)} dialogue lines")

    if not dialogue:
        log("No dialogue found, skipping", "warn")
        return

    # Build voice map for this episode's speakers
    ep_voice_map = build_voice_map(dialogue)
    ep_voice_map.update(voice_map)  # apply global overrides

    if dry_run:
        log("Dry run — would generate:")
        speakers = sorted(set(d["speaker"] for d in dialogue))
        print(f"  Speakers: {', '.join(speakers)}")
        for spk in speakers:
            print(f"    {spk} -> voice: {ep_voice_map.get(spk, '?')}")
        print()
        for i, d in enumerate(dialogue[:5]):
            preview = d["text"][:80] + ("..." if len(d["text"]) > 80 else "")
            print(f"  {i+1}. [{d['speaker']}] {preview}")
        if len(dialogue) > 5:
            print(f"  ... and {len(dialogue) - 5} more lines")
        return

    from pydub import AudioSegment

    # Create output directory
    out_dir = OUTPUT_DIR / show_id / ep_file_stem
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = []
    seg_index = 0
    total = len(dialogue)

    # Silence gap between chunks (150ms)
    silence_samples = int(0.15 * SAMPLE_RATE)
    silence = np.zeros(silence_samples, dtype=np.float32)

    for line_idx, line in enumerate(dialogue):
        voice = ep_voice_map.get(line["speaker"], DEFAULT_VOICES[0])
        chunks = list(chunk_text(line["text"]))

        print(f"\r  Generating line {line_idx + 1}/{total}...", end="", flush=True)

        try:
            # Generate audio for each chunk, then concatenate
            audio_parts = []
            for ci, chunk in enumerate(chunks):
                generator = pipeline(chunk, voice=voice)
                for _, _, audio_np in generator:
                    audio_parts.append(audio_np)
                if ci < len(chunks) - 1:
                    audio_parts.append(silence)

            if not audio_parts:
                log(f"\n  No audio returned for line {line_idx}", "warn")
                continue

            combined = np.concatenate(audio_parts)

            # Convert float32 [-1,1] -> int16 -> pydub AudioSegment -> MP3
            int16_audio = np.clip(combined * 32767, -32768, 32767).astype(np.int16)
            audio_seg = AudioSegment(
                int16_audio.tobytes(),
                frame_rate=SAMPLE_RATE,
                sample_width=2,  # 16-bit
                channels=1,
            )

            filename = f"{seg_index:04d}.mp3"
            mp3_path = out_dir / filename
            audio_seg.export(str(mp3_path), format="mp3", bitrate="128k")

            manifest.append({
                "index": seg_index,
                "speaker": line["speaker"].lower(),
                "text": line["text"],
                "chapter": line["chapter"],
                "file": filename,
            })
            seg_index += 1

        except Exception as e:
            log(f"\n  Failed line {line_idx}: {e}", "error")
            # Continue with next line (matching JS behavior)

    print()  # newline after progress

    # Write manifest
    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    log(f"Saved manifest ({len(manifest)} segments) to {manifest_path}", "ok")

    return manifest


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(
        description="Generate podcast audio using Kokoro TTS (local, free, open-source)",
    )
    parser.add_argument("episode", nargs="?", help="Episode number or filename")
    parser.add_argument("--all", action="store_true", help="Generate audio for all episodes")
    parser.add_argument("--list", action="store_true", help="List available episodes")
    parser.add_argument("--dry-run", action="store_true", help="Parse and preview without generating audio")
    parser.add_argument("--show", type=str, default=None, help="Filter by show ID (e.g. tech-leadership)")
    parser.add_argument("--voices", type=str, default=None,
                        help='Voice overrides as JSON, e.g. \'{"ALEX":"am_adam","SAM":"af_heart"}\'')
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    print("\n=== PodLearn Audio Generator (Kokoro TTS) ===\n")

    # --list
    if args.list:
        episodes = find_all_episodes(args.show)
        log(f"Found {len(episodes)} episodes:\n")
        for i, ep in enumerate(episodes):
            print(f"  {i + 1}. [{ep['show']}] {ep['file']}")
        print("\nUsage: python generate-audio-kokoro.py <episode-number>")
        print("       python generate-audio-kokoro.py --all")
        return

    # For anything that generates audio, check ffmpeg first
    if not args.dry_run:
        check_ffmpeg()

    # Build global voice overrides from CLI
    global_voice_overrides = {}
    if args.voices:
        try:
            overrides = json.loads(args.voices)
            global_voice_overrides = {k.upper(): v for k, v in overrides.items()}
        except json.JSONDecodeError as e:
            log(f"Invalid --voices JSON: {e}", "error")
            sys.exit(1)

    # Also pick up VOICE_* env vars
    for key, val in os.environ.items():
        if key.startswith("VOICE_") and len(key) > 6:
            speaker = key[6:].upper()
            if speaker not in global_voice_overrides:
                global_voice_overrides[speaker] = val

    # Initialize Kokoro pipeline (lazy — only when actually generating)
    pipeline = None
    if not args.list:
        if not args.dry_run:
            log("Loading Kokoro TTS model (first run downloads ~300MB)...")
        try:
            from kokoro import KPipeline
            pipeline = KPipeline(lang_code="a")  # 'a' = American English
            if not args.dry_run:
                log("Kokoro model loaded", "ok")
        except ImportError:
            if not args.dry_run:
                log("kokoro package not installed. Run: pip install kokoro soundfile", "error")
                sys.exit(1)
        except Exception as e:
            if not args.dry_run:
                log(f"Failed to load Kokoro model: {e}", "error")
                sys.exit(1)

    episodes = find_all_episodes(args.show)

    # --all
    if args.all:
        log(f"Generating audio for {len(episodes)} episodes...")
        for ep in episodes:
            print(f"\n--- {ep['show']}/{ep['file']} ---")
            generate_episode_audio(ep, pipeline, global_voice_overrides, dry_run=args.dry_run)
        return

    # Specific episode
    if args.episode:
        num = None
        try:
            num = int(args.episode)
        except ValueError:
            pass

        if num is not None and 1 <= num <= len(episodes):
            ep = episodes[num - 1]
            generate_episode_audio(ep, pipeline, global_voice_overrides, dry_run=args.dry_run)
        else:
            # Try to find by filename substring
            matches = [e for e in episodes if args.episode in e["file"] or args.episode in str(e["path"])]
            if matches:
                for ep in matches:
                    generate_episode_audio(ep, pipeline, global_voice_overrides, dry_run=args.dry_run)
            else:
                log(f"Episode not found: {args.episode}", "error")
                print("Use --list to see available episodes")
        return

    # No args — show help
    parser.print_help()


if __name__ == "__main__":
    main()
