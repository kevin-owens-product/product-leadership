#!/usr/bin/env node
/**
 * Audio Generation Script for PodLearn — Supertonic backend.
 *
 * Renders each dialogue line to a WAV file using a local Supertonic checkout
 * (https://github.com/supertone-oss-archive/supertonic), then optionally concatenates
 * the WAVs into a single MP3 per episode using ffmpeg.
 *
 * Output layout:
 *
 *   podcasts/pwa/audio/<show-id>/<episode-basename>/0000.wav
 *   podcasts/pwa/audio/<show-id>/<episode-basename>/0001.wav
 *   ...
 *   podcasts/pwa/audio/<show-id>/<episode-basename>/manifest.json
 *   podcasts/pwa/audio/<show-id>/<episode-basename>/combined.mp3   (if ffmpeg present)
 *
 * Usage:
 *
 *   SUPERTONIC_DIR=~/code/supertonic \
 *     node podcasts/tools/generate-audio-supertonic.js --show agentic-coding-frontier --all
 *
 *   SUPERTONIC_DIR=~/code/supertonic \
 *     node podcasts/tools/generate-audio-supertonic.js --show agentic-coding-frontier --episode 1
 *
 * Flags:
 *   --show <id>       Show id (directory name under podcasts/shows/). Required.
 *   --episode <n>     Episode number to generate. Mutually exclusive with --all.
 *   --all             Generate every episode in the show.
 *   --list            List episodes in the show and exit.
 *   --dry-run         Parse dialogue but skip synthesis. Useful for previewing.
 *   --force           Re-render lines even if their WAV already exists.
 *   --total-step <n>  Forwarded to Supertonic (default 8, higher = better quality).
 *   --speed <f>       Forwarded to Supertonic (default 1.05).
 *   --no-mp3          Skip the ffmpeg WAV→MP3 concat step.
 *   --engine <name>   TTS engine: "supertonic" or "kokoro". Overrides the
 *                     episode's `engine` and the show's `ttsEngine` in
 *                     podcast.json. Default: supertonic.
 *
 * Engines:
 *   supertonic  Supertonic 3 (archived upstream Sept 2026). Voices M1..M5/F1..F5.
 *   kokoro      Kokoro-82M (Apache-2.0) through the Python kokoro-onnx package,
 *               run by tools/kokoro-episode-worker.py. Voices such as
 *               am_michael / af_heart. See KOKORO_SETUP.md.
 *
 * Peak headroom:
 *   The episode worker peak-normalizes each rendered line to -3 dBFS before
 *   writing PCM16. writeWavFile hard-clips floats to [-1,1], so without this
 *   hot voices ship as flat-topped distortion (see ap-finance-mastery).
 *
 * Env:
 *   SUPERTONIC_DIR    Path to your local supertonic repo checkout. Required for
 *                     the supertonic engine. Must contain nodejs/example_onnx.js
 *                     and assets/voice_styles/*.json.
 *   KOKORO_DIR        Folder holding kokoro-v1.0.onnx and voices-v1.0.bin.
 *                     Required for the kokoro engine.
 *   KOKORO_PYTHON     Python interpreter with kokoro-onnx installed
 *                     (default: python3).
 *
 * Voice mapping:
 *   Reads `voiceMap` from podcasts/shows/<id>/podcast.json, e.g.
 *     "voiceMap": { "ALEX": "M1", "RILEY": "F2", "SAM": "F1" }
 *   Keys are matched case-insensitively against the **NAME:** label in each
 *   episode markdown. Falls back to alternating M1/F1 if the map is missing.
 *   Kokoro pace comes from `kokoroSpeed` in podcast.json (default 1.0).
 *   The kokoro engine reads `kokoroVoiceMap` instead (same keys, Kokoro voice
 *   ids as values) and falls back to alternating am_michael/af_heart.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createHash } = require('node:crypto');
const { replaceDirectory, withRenderLock } = require('./render-storage');
const { isMusicCue, renderCueWav, MUSIC_CUE_SECONDS } = require('./cue-music');

const ROOT = path.resolve(__dirname, '..');
const SHOWS_DIR = path.join(ROOT, 'shows');
const OUTPUT_ROOT = path.join(ROOT, 'pwa', 'audio');
const BOLD_SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
const BRACKET_CUE_LINE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s*[-:]\s*[^\]]+)?\]$/i;
// Silence cues; the music cues come from cue-music.js, which renders them.
const CUE_DURATIONS = {
  'PAUSE': 0.8,
  'LONG PAUSE': 1.8,
  'SFX': 0.7,
  'SOUND': 0.7,
  'AMBIENCE': 1.0,
  'AMBIENT BED': 1.0,
  ...MUSIC_CUE_SECONDS,
};
const SILENCE_SAMPLE_RATE = 44100;

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(`--${name}`);
}

function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || i === args.length - 1) return fallback;
  return args[i + 1];
}

const SHOW_ID = opt('show');
const EPISODE_ARG = opt('episode');
const TOTAL_STEP = String(opt('total-step', '8'));
const SPEED = String(opt('speed', '1.05'));
const SUPERTONIC_DIR = process.env.SUPERTONIC_DIR;
const KOKORO_DIR = process.env.KOKORO_DIR;
const KOKORO_PYTHON = process.env.KOKORO_PYTHON || 'python3';
const ENGINE_ARG = opt('engine');
const ENGINES = new Set(['supertonic', 'kokoro']);
if (ENGINE_ARG && !ENGINES.has(ENGINE_ARG)) {
  console.error(`Unknown --engine ${ENGINE_ARG}; expected one of ${[...ENGINES].join(', ')}`);
  process.exit(1);
}

const FLAGS = {
  all: flag('all'),
  list: flag('list'),
  dryRun: flag('dry-run'),
  force: flag('force'),
  noMp3: flag('no-mp3'),
};

const COLORS = {
  info: '\x1b[36m[INFO]\x1b[0m',
  ok: '\x1b[32m[OK]\x1b[0m',
  warn: '\x1b[33m[WARN]\x1b[0m',
  err: '\x1b[31m[ERROR]\x1b[0m',
};

function log(msg, level = 'info') {
  console.log(`${COLORS[level] || ''} ${msg}`);
}

function die(msg) {
  log(msg, 'err');
  process.exit(1);
}

function checkSupertonic() {
  if (!SUPERTONIC_DIR) {
    die('SUPERTONIC_DIR is not set. Point it at your local supertonic checkout (see SUPERTONIC_SETUP.md).');
  }
  const exampleScript = path.join(SUPERTONIC_DIR, 'nodejs', 'example_onnx.js');
  if (!fs.existsSync(exampleScript)) {
    die(`Could not find ${exampleScript}. Did you clone https://github.com/supertone-oss-archive/supertonic to SUPERTONIC_DIR?`);
  }
  const onnxDir = path.join(SUPERTONIC_DIR, 'assets', 'onnx');
  if (!fs.existsSync(onnxDir)) {
    die(`Could not find ${onnxDir}. Download the ONNX assets from Hugging Face (see SUPERTONIC_SETUP.md).`);
  }
  return exampleScript;
}

function loadShow(showId) {
  if (!showId) die('--show <id> is required');
  const showDir = path.join(SHOWS_DIR, showId);
  const manifestPath = path.join(showDir, 'podcast.json');
  if (!fs.existsSync(manifestPath)) die(`Show manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return { showDir, manifest };
}

function resolveVoiceStyle(voiceName) {
  const file = path.join(SUPERTONIC_DIR, 'assets', 'voice_styles', `${voiceName}.json`);
  if (!fs.existsSync(file)) {
    die(`Voice style file not found: ${file}. Available styles depend on the Supertonic assets you downloaded.`);
  }
  return file;
}

function checkKokoro() {
  if (!KOKORO_DIR) {
    die('KOKORO_DIR is not set. Point it at the folder holding kokoro-v1.0.onnx and voices-v1.0.bin (see KOKORO_SETUP.md).');
  }
  for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) {
    if (!fs.existsSync(path.join(KOKORO_DIR, f))) die(`Could not find ${path.join(KOKORO_DIR, f)} (see KOKORO_SETUP.md).`);
  }
  const res = spawnSync(KOKORO_PYTHON, ['-c', 'import kokoro_onnx, soundfile, scipy'], { stdio: 'ignore' });
  if (res.status !== 0) die(`${KOKORO_PYTHON} cannot import kokoro_onnx, soundfile and scipy. Install them (see KOKORO_SETUP.md) or set KOKORO_PYTHON.`);
}

function episodeEngine(episodeMeta, showManifest) {
  return ENGINE_ARG || episodeMeta.engine || showManifest.ttsEngine || 'supertonic';
}

function pickVoice(speakerName, voiceMap, fallbackIndex, engine = 'supertonic') {
  const key = String(speakerName || '').toUpperCase();
  if (voiceMap && voiceMap[key]) return voiceMap[key];
  // Case-insensitive lookup
  if (voiceMap) {
    for (const k of Object.keys(voiceMap)) {
      if (k.toUpperCase() === key) return voiceMap[k];
    }
  }
  // Fallback: alternate male / female by order of appearance
  if (engine === 'kokoro') return fallbackIndex % 2 === 0 ? 'am_michael' : 'af_heart';
  return fallbackIndex % 2 === 0 ? 'M1' : 'F1';
}

// Supertonic 3 inline expression tags (the documented subset — the model
// ships 10 but only these are named upstream, and only <laugh> is verified
// clearly audible). Known tags pass through to the model lowercased; any
// other <angle> token is stripped so a typo is never read aloud as text.
const EXPRESSION_TAGS = new Set(['laugh', 'breath', 'sigh']);

function normalizeExpressionTags(text) {
  return text
    .replace(/<\s*([a-zA-Z_]+)\s*>/g, (m, name) =>
      EXPRESSION_TAGS.has(name.toLowerCase()) ? `<${name.toLowerCase()}>` : '')
    .replace(/ {2,}/g, ' ');
}

function cleanText(text, engine = 'supertonic') {
  if (engine === 'kokoro') {
    // Kokoro has no expression tags; drop them so they are never read aloud.
    return cleanText(text).replace(/<\s*[a-zA-Z_]+\s*>/g, '').replace(/ {2,}/g, ' ').trim();
  }
  return normalizeExpressionTags(
    text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'code block')
  ).trim();
}

function parseEpisode(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const events = [];
  let chapter = 'INTRO';
  let lastSpeaker = null;
  let lastSpeakerLine = -2;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      chapter = trimmed.replace(/^###\s+/, '').trim();
      continue;
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
    const cueMatch = trimmed.match(BRACKET_CUE_LINE_RE);
    if (cueMatch) {
      const cue = cueMatch[1].toUpperCase();
      events.push({
        type: 'cue',
        cue,
        duration: CUE_DURATIONS[cue] || 0.8,
        chapter,
        rawLine: i,
      });
      lastSpeaker = null;
      continue;
    }
    if (/^\*?\*?\[.+\]\*?\*?$/.test(trimmed)) {
      lastSpeaker = null;
      continue; // stage directions
    }

    const m = trimmed.match(BOLD_SPEAKER_LINE_RE) || trimmed.match(BRACKET_SPEAKER_LINE_RE);
    if (m) {
      const speaker = m[1].trim();
      const text = cleanText(m[2] || '');
      if (!text) {
        lastSpeaker = speaker;
        lastSpeakerLine = i;
        continue;
      }
      events.push({ type: 'dialogue', speaker, text, chapter, rawLine: i });
      lastSpeaker = speaker;
      lastSpeakerLine = i;
      continue;
    }

    // Continuation line (no speaker label, but immediately follows one)
    if (lastSpeaker && i - lastSpeakerLine <= 4) {
      const text = cleanText(trimmed);
      if (text && !/^\*?\*?\[/.test(trimmed)) {
        events.push({ type: 'dialogue', speaker: lastSpeaker, text, chapter, rawLine: i });
        lastSpeakerLine = i;
      }
    }
  }
  return events;
}

function findEpisodes(showManifest, showDir) {
  return showManifest.episodes.map((ep) => ({
    id: ep.id,
    title: ep.title,
    file: ep.file,
    basename: path.basename(ep.file, '.md'),
    path: path.join(showDir, ep.file),
    engine: ep.engine,
  }));
}

function pickEpisode(episodes, episodeArg) {
  const n = parseInt(episodeArg, 10);
  if (!Number.isNaN(n)) {
    const match = episodes.find((e) => e.id === n);
    if (match) return [match];
  }
  const match = episodes.find((e) => e.file.includes(String(episodeArg)));
  if (match) return [match];
  die(`Episode not found: ${episodeArg}`);
  return [];
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// Hash large model files in chunks and reuse their identity across --all.
const modelHashes = new Map();
function hashFile(file) {
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(256 * 1024);
  const fd = fs.openSync(file, 'r');
  try {
    let bytes;
    while ((bytes = fs.readSync(fd, buffer)) > 0) hash.update(buffer.subarray(0, bytes));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function modelFileHash(file) {
  if (!modelHashes.has(file)) modelHashes.set(file, hashFile(file));
  return modelHashes.get(file);
}

function digest(inputs) {
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

function modelSignature(engine) {
  if (engine === 'kokoro') {
    return digest([
      modelFileHash(path.join(__dirname, 'kokoro-episode-worker.py')),
      modelFileHash(path.join(KOKORO_DIR, 'kokoro-v1.0.onnx')),
      modelFileHash(path.join(KOKORO_DIR, 'voices-v1.0.bin')),
    ]);
  }
  const dir = path.join(SUPERTONIC_DIR, 'assets', 'onnx');
  const assets = fs.readdirSync(dir, { recursive: true }).sort()
    .filter(file => fs.statSync(path.join(dir, file)).isFile())
    .map(file => [file, modelFileHash(path.join(dir, file))]);
  return digest([assets, modelFileHash(path.join(SUPERTONIC_DIR, 'nodejs', 'helper.js')),
    modelFileHash(path.join(__dirname, 'supertonic-episode-worker.mjs'))]);
}

// Safety net: peak-normalize mono PCM16 WAVs that still hit full scale
// (e.g. older single-line path, or a worker that skipped normalize).
const TARGET_PEAK_I16 = Math.floor(32767 * Math.pow(10, -3 / 20)); // -3 dBFS

function peakNormalizeWavFile(wavPath) {
  const buf = fs.readFileSync(wavPath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return false;
  let offset = 12;
  let dataOffset = null;
  let dataSize = null;
  let bits = null;
  let channels = null;
  let audioFormat = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      audioFormat = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (dataOffset == null || audioFormat !== 1 || bits !== 16 || channels !== 1) return false;
  let peak = 0;
  for (let i = 0; i < dataSize; i += 2) {
    const s = Math.abs(buf.readInt16LE(dataOffset + i));
    if (s > peak) peak = s;
  }
  if (peak <= TARGET_PEAK_I16) return false;
  const scale = TARGET_PEAK_I16 / peak;
  const out = Buffer.from(buf);
  for (let i = 0; i < dataSize; i += 2) {
    const s = buf.readInt16LE(dataOffset + i);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * scale))), dataOffset + i);
  }
  fs.writeFileSync(wavPath, out);
  return true;
}

function runSupertonicBatch({ lines, outDir, lang, speed }) {
  const workerPath = path.join(__dirname, 'supertonic-episode-worker.mjs');
  const jobPath = path.join(outDir, 'job.json');
  const job = {
    supertonicDir: SUPERTONIC_DIR,
    totalStep: Number(TOTAL_STEP),
    speed,
    lang: lang || 'en',
    lines: lines.map(line => ({
      index: line.index,
      text: line.text,
      voiceStylePath: resolveVoiceStyle(line.voice),
      outputPath: line.cachedWav,
    })),
  };
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));

  const result = spawnSync('node', [workerPath, '--input', jobPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`Supertonic exited with status ${result.status}`);
  }

  process.stdout.write(result.stdout || '');
}

function runKokoroBatch({ lines, outDir, speed }) {
  const workerPath = path.join(__dirname, 'kokoro-episode-worker.py');
  const jobPath = path.join(outDir, 'job.json');
  const job = {
    kokoroDir: KOKORO_DIR,
    speed,
    lines: lines.map(line => ({
      index: line.index,
      text: line.text,
      voice: line.voice,
      outputPath: line.cachedWav,
    })),
  };
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
  const result = spawnSync(KOKORO_PYTHON, [workerPath, '--input', jobPath], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (result.status !== 0) throw new Error(`Kokoro worker exited with status ${result.status}`);
}

function writeSilenceWav(outputPath, seconds, sampleRate = SILENCE_SAMPLE_RATE) {
  const safeSeconds = Math.max(0.1, Number(seconds) || 0.8);
  const sampleCount = Math.max(1, Math.round(sampleRate * safeSeconds));
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const pcmLength = sampleCount * blockAlign;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmLength, 40);

  fs.writeFileSync(outputPath, Buffer.concat([header, Buffer.alloc(pcmLength)]));
}

function hasFfmpeg() {
  const res = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return res.status === 0;
}

function ffprobeDuration(filePath) {
  const res = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
  );
  if (res.status !== 0) return null;
  const seconds = parseFloat(String(res.stdout || '').trim());
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function wavToMp3(wavPath, mp3Path) {
  const res = spawnSync('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    process.stderr.write(res.stderr || '');
    throw new Error(`ffmpeg failed to encode ${wavPath}`);
  }
}

function concatToMp3(wavs, mp3Path) {
  const listFile = path.join(path.dirname(mp3Path), 'files.txt');
  fs.writeFileSync(listFile, wavs.map((w) => `file '${path.basename(w)}'`).join('\n'));
  const res = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0',
    '-i', listFile,
    '-codec:a', 'libmp3lame', '-qscale:a', '4',
    mp3Path,
  ], {
    cwd: path.dirname(mp3Path),
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  fs.rmSync(listFile, { force: true });
  if (res.status !== 0) {
    process.stderr.write(res.stderr || '');
    throw new Error('ffmpeg concat failed');
  }
}

async function generateEpisode({ showId, episode, manifest }) {
  const engine = episodeEngine(episode, manifest);
  log(`${episode.basename}: engine ${engine}`);
  const events = parseEpisode(episode.path);
  const dialogue = events.filter((event) => event.type === 'dialogue');
  const cues = events.filter((event) => event.type === 'cue');
  log(`${episode.basename}: ${dialogue.length} dialogue lines`);
  if (cues.length > 0) log(`${episode.basename}: ${cues.length} production cues`);

  if (FLAGS.dryRun) {
    events.slice(0, 8).forEach((event, i) => {
      if (event.type === 'cue') {
        console.log(`  ${String(i).padStart(4, '0')} [${event.cue}] ${event.duration}s`);
        return;
      }
      console.log(`  ${String(i).padStart(4, '0')} [${event.speaker}] ${event.text.slice(0, 80)}${event.text.length > 80 ? '…' : ''}`);
    });
    if (events.length > 8) console.log(`  … and ${events.length - 8} more events`);
    return;
  }

  const parent = path.join(OUTPUT_ROOT, showId);
  const dest = path.join(parent, episode.basename);
  const cacheDir = path.join(OUTPUT_ROOT, '.render-cache', showId, episode.basename);
  ensureDir(parent);
  ensureDir(cacheDir);
  withRenderLock(cacheDir, () => {
    const staging = fs.mkdtempSync(path.join(parent, '.render-'));
    const next = path.join(staging, 'next');
    try {
      ensureDir(next);
      const used = renderEpisode({ showId, events, engine, manifest, outDir: next, cacheDir });
      replaceDirectory(next, dest, path.join(staging, 'previous'));
      for (const name of fs.readdirSync(cacheDir)) {
        if (/^[a-f0-9]{64}\.(wav|mp3)$/.test(name) && !used.has(name)) fs.unlinkSync(path.join(cacheDir, name));
      }
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  });
}

function renderEpisode({ showId, events, engine, manifest, outDir, cacheDir }) {
  const used = new Set();
  const model = modelSignature(engine);
  const lang = manifest.lang || 'en';
  const speed = engine === 'kokoro' ? Number(opt('speed', manifest.kokoroSpeed ?? 1.0)) : Number(SPEED);
  const voiceMap = (engine === 'kokoro' ? manifest.kokoroVoiceMap : manifest.voiceMap) || {};
  const speakerOrder = new Map();
  const items = [];
  const wavs = [];
  const pending = new Map();
  const dialogueFiles = [];

  let dialogueIndex = 0;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const wavName = `${String(i).padStart(4, '0')}.wav`;
    const wavPath = path.join(outDir, wavName);

    if (event.type === 'cue') {
      if (isMusicCue(event.cue)) renderCueWav(wavPath, event.cue, showId);
      else writeSilenceWav(wavPath, event.duration);
      wavs.push(wavPath);
      items.push({
        index: i,
        rawLine: event.rawLine,
        type: 'cue',
        cue: event.cue,
        text: `[${event.cue}]`,
        chapter: event.chapter,
        file: wavName,
      });
      continue;
    }

    const line = event;
    if (!speakerOrder.has(line.speaker)) speakerOrder.set(line.speaker, speakerOrder.size);
    const voice = pickVoice(line.speaker, voiceMap, speakerOrder.get(line.speaker), engine);

    const text = engine === 'kokoro' ? cleanText(line.text, engine) : line.text;
    const style = engine === 'supertonic' ? modelFileHash(resolveVoiceStyle(voice)) : null;
    const key = digest({ engine, model, text, voice, style, speed,
      ...(engine === 'supertonic' ? { lang, totalStep: Number(TOTAL_STEP) } : {}) });
    const cachedWav = path.join(cacheDir, key + '.wav');
    used.add(path.basename(cachedWav));
    if (FLAGS.force || !fs.existsSync(cachedWav)) {
      pending.set(key, { index: dialogueIndex, text, voice, cachedWav });
    }
    dialogueFiles.push({ cachedWav, wavPath });

    wavs.push(wavPath);
    items.push({
      index: i,
      dialogueIndex,
      rawLine: line.rawLine,
      type: 'dialogue',
      speaker: line.speaker,
      voice,
      text: line.text,
      chapter: line.chapter,
      file: wavName,
    });
    dialogueIndex += 1;
  }

  if (pending.size) {
    console.log(`  rendering ${pending.size} uncached lines with one ${engine} worker`);
    const job = { lines: [...pending.values()], outDir, lang, speed };
    if (engine === 'kokoro') runKokoroBatch(job);
    else runSupertonicBatch(job);
    fs.unlinkSync(path.join(outDir, 'job.json'));
  }
  for (const { cachedWav, wavPath } of dialogueFiles) {
    fs.copyFileSync(cachedWav, wavPath, fs.constants.COPYFILE_FICLONE);
  }
  for (const item of items) {
    const wav = wavs[item.index];
    peakNormalizeWavFile(wav);
    item.audioHash = hashFile(wav);
  }

  // Per-line MP3 (smaller, what the PWA prefers)
  if (!FLAGS.noMp3 && hasFfmpeg()) {
    for (const item of items) {
      const wav = path.join(outDir, item.file);
      const mp3 = wav.replace(/\.wav$/, '.mp3');
      // Derive the encoded cache key from the normalized PCM. This also
      // invalidates edited cues, regenerated voices and changed render settings.
      const cachedMp3 = path.join(cacheDir, digest(['libmp3lame-q4', item.audioHash]) + '.mp3');
      if (FLAGS.force || !fs.existsSync(cachedMp3)) {
        wavToMp3(wav, mp3);
        const tmp = path.join(outDir, 'encoded.tmp');
        fs.copyFileSync(mp3, tmp, fs.constants.COPYFILE_FICLONE);
        fs.renameSync(tmp, cachedMp3);
      } else {
        fs.copyFileSync(cachedMp3, mp3, fs.constants.COPYFILE_FICLONE);
      }
      used.add(path.basename(cachedMp3));
      item.file = path.basename(mp3);
    }
    const combined = path.join(outDir, 'combined.mp3');
    concatToMp3(wavs, combined);
  } else if (!FLAGS.noMp3) {
    log('ffmpeg not found on PATH; leaving WAV files in place. Install ffmpeg for MP3 output.', 'warn');
  }

  // Per-line durations + cumulative startTime so the player can use combined.mp3
  // as a single <audio> source and still highlight the correct line. Probe the
  // WAV sources used for the combined render; per-line MP3 encoder padding would
  // otherwise make the manifest timeline drift longer than combined.mp3.
  let cumulative = 0;
  for (const item of items) {
    const wavName = `${String(item.index).padStart(4, '0')}.wav`;
    const filePath = path.join(outDir, wavName);
    const dur = fs.existsSync(filePath) ? ffprobeDuration(filePath) : null;
    if (dur != null) {
      item.duration = Number(dur.toFixed(3));
      item.startTime = Number(cumulative.toFixed(3));
      cumulative += dur;
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2) + '\n');
  return used;
}

async function main() {
  console.log('\n=== PodLearn Audio Generator (Supertonic / Kokoro) ===\n');

  const { showDir, manifest } = loadShow(SHOW_ID);
  const episodes = findEpisodes(manifest, showDir);

  if (FLAGS.list) {
    log(`Show: ${manifest.title} (${SHOW_ID})`);
    episodes.forEach((e) => console.log(`  ${e.id}. ${e.file}`));
    return;
  }

  let targets;
  if (FLAGS.all) {
    targets = episodes;
  } else if (EPISODE_ARG) {
    targets = pickEpisode(episodes, EPISODE_ARG);
  } else {
    die('Specify --episode <n> or --all');
  }

  const engines = new Set(targets.map((ep) => episodeEngine(ep, manifest)));
  if (!FLAGS.dryRun && engines.has('supertonic')) checkSupertonic();
  if (!FLAGS.dryRun && engines.has('kokoro')) checkKokoro();

  for (const ep of targets) {
    console.log(`\n--- ${SHOW_ID}/${ep.file} ---`);
    await generateEpisode({ showId: SHOW_ID, episode: ep, manifest });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  log(err.stack || err.message, 'err');
  process.exit(1);
});
