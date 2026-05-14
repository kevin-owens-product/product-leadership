#!/usr/bin/env node
/**
 * Audio Generation Script for PodLearn — Supertonic backend.
 *
 * Renders each dialogue line to a WAV file using a local Supertonic checkout
 * (https://github.com/supertone-inc/supertonic), then optionally concatenates
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
 *
 * Env:
 *   SUPERTONIC_DIR    Path to your local supertonic repo checkout. Required.
 *                     Must contain nodejs/example_onnx.js and assets/voice_styles/*.json.
 *
 * Voice mapping:
 *   Reads `voiceMap` from podcasts/shows/<id>/podcast.json, e.g.
 *     "voiceMap": { "ALEX": "M1", "RILEY": "F2", "SAM": "F1" }
 *   Keys are matched case-insensitively against the **NAME:** label in each
 *   episode markdown. Falls back to alternating M1/F1 if the map is missing.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOWS_DIR = path.join(ROOT, 'shows');
const OUTPUT_ROOT = path.join(ROOT, 'pwa', 'audio');

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
    die(`Could not find ${exampleScript}. Did you clone https://github.com/supertone-inc/supertonic to SUPERTONIC_DIR?`);
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

function pickVoice(speakerName, voiceMap, fallbackIndex) {
  const key = String(speakerName || '').toUpperCase();
  if (voiceMap && voiceMap[key]) return voiceMap[key];
  // Case-insensitive lookup
  if (voiceMap) {
    for (const k of Object.keys(voiceMap)) {
      if (k.toUpperCase() === key) return voiceMap[k];
    }
  }
  // Fallback: alternate M1 / F1 by order of appearance
  return fallbackIndex % 2 === 0 ? 'M1' : 'F1';
}

function cleanText(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, 'code block')
    .trim();
}

function parseEpisode(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const dialogue = [];
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
    if (/^\*?\*?\[.+\]\*?\*?$/.test(trimmed)) continue; // stage directions

    const m = trimmed.match(/^\*\*([A-Z][A-Z0-9 _\-']{0,30}):\*\*\s*(.*)$/);
    if (m) {
      const speaker = m[1].trim();
      const text = cleanText(m[2] || '');
      if (!text) {
        lastSpeaker = speaker;
        lastSpeakerLine = i;
        continue;
      }
      dialogue.push({ speaker, text, chapter, rawLine: i });
      lastSpeaker = speaker;
      lastSpeakerLine = i;
      continue;
    }

    // Continuation line (no speaker label, but immediately follows one)
    if (lastSpeaker && i - lastSpeakerLine <= 4) {
      const text = cleanText(trimmed);
      if (text && !/^\*?\*?\[/.test(trimmed)) {
        dialogue.push({ speaker: lastSpeaker, text, chapter, rawLine: i });
        lastSpeakerLine = i;
      }
    }
  }
  return dialogue;
}

function findEpisodes(showManifest, showDir) {
  return showManifest.episodes.map((ep) => ({
    id: ep.id,
    title: ep.title,
    file: ep.file,
    basename: path.basename(ep.file, '.md'),
    path: path.join(showDir, ep.file),
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

function safeRename(src, dest) {
  if (path.resolve(src) === path.resolve(dest)) return;
  if (fs.existsSync(dest)) fs.rmSync(dest);
  fs.renameSync(src, dest);
}

function runSupertonicLine({ exampleScript, voiceName, text, outDir, lang }) {
  // Supertonic writes WAVs to --save-dir. We scan that dir afterwards because
  // the upstream filename convention is not officially documented.
  ensureDir(outDir);
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.wav')) fs.rmSync(path.join(outDir, f));
  }

  const voiceStylePath = resolveVoiceStyle(voiceName);
  // Use absolute paths so cwd doesn't matter. Supertonic example resolves
  // its `--onnx-dir` default relative to its own location, so we explicitly
  // pass an absolute path to be safe.
  const onnxDir = path.join(SUPERTONIC_DIR, 'assets', 'onnx');

  const result = spawnSync(
    'node',
    [
      exampleScript,
      '--onnx-dir', onnxDir,
      '--voice-style', voiceStylePath,
      '--text', text,
      '--lang', lang || 'en',
      '--save-dir', outDir,
      '--total-step', TOTAL_STEP,
      '--speed', SPEED,
      '--n-test', '1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
  );

  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`Supertonic exited with status ${result.status}`);
  }

  const wavs = fs.readdirSync(outDir).filter((f) => f.endsWith('.wav')).sort();
  if (wavs.length === 0) {
    throw new Error('Supertonic finished but no .wav file was produced');
  }
  // The example may produce one or more WAVs (e.g. long-form chunked). Concat
  // them in name order so each dialogue line yields a single audio file.
  if (wavs.length === 1) {
    return path.join(outDir, wavs[0]);
  }
  const concatPath = path.join(outDir, 'concat.wav');
  concatWavs(wavs.map((w) => path.join(outDir, w)), concatPath);
  return concatPath;
}

function runSupertonicBatch({ exampleScript, lines, outDir, lang }) {
  ensureDir(outDir);
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.wav')) fs.rmSync(path.join(outDir, f));
  }

  const workerPath = path.join(__dirname, 'supertonic-episode-worker.mjs');
  const jobPath = path.join(outDir, 'job.json');
  const job = {
    supertonicDir: SUPERTONIC_DIR,
    totalStep: Number(TOTAL_STEP),
    speed: Number(SPEED),
    lang: lang || 'en',
    lines: lines.map((line, idx) => ({
      index: line.index,
      text: line.text,
      voiceStylePath: resolveVoiceStyle(line.voice),
      outputPath: path.join(outDir, `${String(idx).padStart(4, '0')}.wav`),
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

  const saved = job.lines.map((line) => line.outputPath);

  return saved;
}

// Minimal WAV concatenator. Assumes all inputs share the same 16-bit PCM
// format that Supertonic produces. Reads PCM data following the `data` chunk
// header and rewrites a fresh header for the combined file.
function concatWavs(inputs, outputPath) {
  const pcmChunks = [];
  let fmtHeader = null;
  let sampleRate = 0;
  let numChannels = 0;
  let bitsPerSample = 0;

  for (const inputPath of inputs) {
    const buf = fs.readFileSync(inputPath);
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error(`Not a RIFF/WAVE file: ${inputPath}`);
    }
    let offset = 12;
    while (offset < buf.length) {
      const id = buf.toString('ascii', offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      if (id === 'fmt ') {
        if (!fmtHeader) {
          fmtHeader = buf.slice(dataStart, dataStart + size);
          numChannels = buf.readUInt16LE(dataStart + 2);
          sampleRate = buf.readUInt32LE(dataStart + 4);
          bitsPerSample = buf.readUInt16LE(dataStart + 14);
        }
      } else if (id === 'data') {
        pcmChunks.push(buf.slice(dataStart, dataStart + size));
      }
      offset = dataStart + size + (size % 2);
    }
  }

  if (!fmtHeader) throw new Error('No fmt chunk found in input WAVs');

  const pcm = Buffer.concat(pcmChunks);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  fs.writeFileSync(outputPath, Buffer.concat([header, pcm]));
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

async function generateEpisode({ exampleScript, showId, episode, manifest }) {
  const dialogue = parseEpisode(episode.path);
  log(`${episode.basename}: ${dialogue.length} dialogue lines`);

  if (FLAGS.dryRun) {
    dialogue.slice(0, 6).forEach((d, i) => {
      console.log(`  ${String(i).padStart(4, '0')} [${d.speaker}] ${d.text.slice(0, 80)}${d.text.length > 80 ? '…' : ''}`);
    });
    if (dialogue.length > 6) console.log(`  … and ${dialogue.length - 6} more`);
    return;
  }

  const outDir = path.join(OUTPUT_ROOT, showId, episode.basename);
  ensureDir(outDir);

  const voiceMap = manifest.voiceMap || {};
  const speakerOrder = new Map();
  const items = [];
  const wavs = [];
  const pending = [];

  for (let i = 0; i < dialogue.length; i++) {
    const line = dialogue[i];
    if (!speakerOrder.has(line.speaker)) speakerOrder.set(line.speaker, speakerOrder.size);
    const voice = pickVoice(line.speaker, voiceMap, speakerOrder.get(line.speaker));

    const wavName = `${String(i).padStart(4, '0')}.wav`;
    const wavPath = path.join(outDir, wavName);

    if (fs.existsSync(wavPath) && !FLAGS.force) {
      process.stdout.write(`\r  line ${i + 1}/${dialogue.length} (cached)        `);
    } else {
      pending.push({ ...line, index: i, voice, wavPath });
    }

    wavs.push(wavPath);
    items.push({
      index: i,
      rawLine: line.rawLine,
      speaker: line.speaker,
      voice,
      text: line.text,
      chapter: line.chapter,
      file: wavName,
    });
  }

  if (pending.length > 0) {
    console.log(`\n  rendering ${pending.length}/${dialogue.length} uncached lines with one Supertonic worker`);
    const tmpDir = path.join(outDir, '.tmp', 'batch');
    try {
      const produced = runSupertonicBatch({
        exampleScript,
        lines: pending,
        outDir: tmpDir,
        lang: manifest.lang || 'en',
      });
      produced.forEach((producedPath, idx) => {
        safeRename(producedPath, pending[idx].wavPath);
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  fs.rmSync(path.join(outDir, '.tmp'), { recursive: true, force: true });
  console.log('');

  if (items.length !== dialogue.length) {
    throw new Error(`Generated ${items.length}/${dialogue.length} lines for ${episode.basename}; refusing to write partial manifest.`);
  }

  // Per-line MP3 (smaller, what the PWA prefers)
  if (!FLAGS.noMp3 && hasFfmpeg()) {
    for (const item of items) {
      const wav = path.join(outDir, item.file);
      const mp3 = wav.replace(/\.wav$/, '.mp3');
      if (!fs.existsSync(mp3) || FLAGS.force) {
        try {
          wavToMp3(wav, mp3);
        } catch (err) {
          log(`MP3 encode failed for ${item.file}: ${err.message}`, 'warn');
          continue;
        }
      }
      item.file = path.basename(mp3);
    }
    // Combined episode MP3 (handy for download / scrubbing)
    try {
      const combined = path.join(outDir, 'combined.mp3');
      concatToMp3(wavs, combined);
      log(`Wrote ${path.relative(ROOT, combined)}`, 'ok');
    } catch (err) {
      log(`Combined MP3 failed: ${err.message}`, 'warn');
    }
  } else if (!FLAGS.noMp3) {
    log('ffmpeg not found on PATH; leaving WAV files in place. Install ffmpeg for MP3 output.', 'warn');
  }

  // Per-line durations + cumulative startTime so the player can use combined.mp3
  // as a single <audio> source and still highlight the correct line. We probe the
  // per-line file (whichever extension survived the MP3 step).
  let cumulative = 0;
  for (const item of items) {
    const filePath = path.join(outDir, item.file);
    const dur = fs.existsSync(filePath) ? ffprobeDuration(filePath) : null;
    if (dur != null) {
      item.duration = Number(dur.toFixed(3));
      item.startTime = Number(cumulative.toFixed(3));
      cumulative += dur;
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2) + '\n');
  log(`Wrote ${path.relative(ROOT, manifestPath)}`, 'ok');
}

async function main() {
  console.log('\n=== PodLearn Audio Generator (Supertonic) ===\n');

  const { showDir, manifest } = loadShow(SHOW_ID);
  const episodes = findEpisodes(manifest, showDir);

  if (FLAGS.list) {
    log(`Show: ${manifest.title} (${SHOW_ID})`);
    episodes.forEach((e) => console.log(`  ${e.id}. ${e.file}`));
    return;
  }

  const exampleScript = FLAGS.dryRun ? null : checkSupertonic();

  let targets;
  if (FLAGS.all) {
    targets = episodes;
  } else if (EPISODE_ARG) {
    targets = pickEpisode(episodes, EPISODE_ARG);
  } else {
    die('Specify --episode <n> or --all');
  }

  for (const ep of targets) {
    console.log(`\n--- ${SHOW_ID}/${ep.file} ---`);
    await generateEpisode({ exampleScript, showId: SHOW_ID, episode: ep, manifest });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  log(err.stack || err.message, 'err');
  process.exit(1);
});
