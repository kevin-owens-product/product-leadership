#!/usr/bin/env node
/**
 * Peak-normalize WAV files (and re-encode sibling MP3s + combined.mp3).
 *
 * Used as an emergency fix when a show ships hard-clipped (max 0 dBFS).
 * Does not recover lost headroom from clipping — re-render with the
 * generator's built-in peak normalize for a true fix.
 *
 * Usage:
 *   node podcasts/tools/normalize-audio-peaks.js --show ap-finance-mastery
 *   node podcasts/tools/normalize-audio-peaks.js --show ap-finance-mastery --target-db -3
 *   node podcasts/tools/normalize-audio-peaks.js --show ap-finance-mastery --dist-only
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const AUDIO_ROOT = path.join(ROOT, 'podcasts/pwa/audio');
const DIST_ROOT = path.join(ROOT, 'podcasts/pwa/dist/audio');

function opt(name, fallback = null) {
  const key = `--${name}`;
  const i = process.argv.indexOf(key);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  return process.argv[i + 1];
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

const SHOW = opt('show');
const TARGET_DB = Number(opt('target-db', '-3'));
const DIST_ONLY = flag('dist-only');
const AUDIO_ONLY = flag('audio-only');
const DRY = flag('dry-run');

if (!SHOW) {
  console.error('Usage: normalize-audio-peaks.js --show <id> [--target-db -3] [--dist-only|--audio-only]');
  process.exit(1);
}
if (!Number.isFinite(TARGET_DB) || TARGET_DB >= 0 || TARGET_DB < -24) {
  console.error('--target-db must be a negative dB value (e.g. -3)');
  process.exit(1);
}

const TARGET_PEAK = Math.floor(32767 * Math.pow(10, TARGET_DB / 20));

function listEpisodeDirs(root) {
  const showDir = path.join(root, SHOW);
  if (!fs.existsSync(showDir)) return [];
  return fs.readdirSync(showDir)
    .map((name) => path.join(showDir, name))
    .filter((p) => fs.statSync(p).isDirectory() && nameLooksLikeEpisode(path.basename(p)));
}

function nameLooksLikeEpisode(name) {
  return name.startsWith('episode-') || name.includes('s0') || name.includes('ep');
}

function readWavPcm16(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`not a RIFF/WAVE file: ${filePath}`);
  }
  let offset = 12;
  let fmt = null;
  let dataOffset = null;
  let dataSize = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!fmt || dataOffset == null) throw new Error(`malformed WAV: ${filePath}`);
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16 || fmt.channels !== 1) {
    throw new Error(`expected mono PCM16, got ${JSON.stringify(fmt)} in ${filePath}`);
  }
  const samples = new Int16Array(dataSize / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = buf.readInt16LE(dataOffset + i * 2);
  }
  return { buf, fmt, dataOffset, samples };
}

function writeWavPcm16(filePath, meta, samples) {
  const out = Buffer.from(meta.buf);
  for (let i = 0; i < samples.length; i++) {
    out.writeInt16LE(samples[i], meta.dataOffset + i * 2);
  }
  fs.writeFileSync(filePath, out);
}

function peakOf(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

function normalizeSamples(samples, targetPeak) {
  const peak = peakOf(samples);
  if (peak <= 0 || peak <= targetPeak) {
    return { samples, peak, scale: 1, changed: false };
  }
  const scale = targetPeak / peak;
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * scale)));
  }
  return { samples: out, peak, scale, changed: true };
}

function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

function wavToMp3(wavPath, mp3Path) {
  const res = spawnSync('ffmpeg', [
    '-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path,
  ], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr || 'ffmpeg wav→mp3 failed');
}

function concatToMp3(wavs, mp3Path) {
  const listFile = path.join(path.dirname(mp3Path), '.normalize-files.txt');
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
  if (res.status !== 0) throw new Error(res.stderr || 'ffmpeg concat failed');
}

function processEpisodeDir(dir) {
  const wavs = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.wav') && /^\d{4}\.wav$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));

  if (wavs.length === 0) {
    console.log(`  skip ${path.relative(ROOT, dir)} (no line wavs)`);
    return { changed: 0, total: 0 };
  }

  let changed = 0;
  let maxPeakBefore = 0;
  for (const wavPath of wavs) {
    const meta = readWavPcm16(wavPath);
    maxPeakBefore = Math.max(maxPeakBefore, peakOf(meta.samples));
    const result = normalizeSamples(meta.samples, TARGET_PEAK);
    if (result.changed) {
      changed += 1;
      if (!DRY) writeWavPcm16(wavPath, meta, result.samples);
    }
  }

  const peakDb = maxPeakBefore > 0 ? (20 * Math.log10(maxPeakBefore / 32768)).toFixed(1) : '-inf';
  console.log(
    `  ${path.basename(dir)}: ${wavs.length} wavs, peak was ${peakDb} dBFS, ` +
    `${changed} scaled to ${TARGET_DB} dBFS`
  );

  if (DRY || !hasFfmpeg()) return { changed, total: wavs.length };

  for (const wavPath of wavs) {
    const mp3Path = wavPath.replace(/\.wav$/, '.mp3');
    try {
      wavToMp3(wavPath, mp3Path);
    } catch (err) {
      console.warn(`    mp3 failed ${path.basename(wavPath)}: ${err.message}`);
    }
  }

  try {
    concatToMp3(wavs, path.join(dir, 'combined.mp3'));
  } catch (err) {
    console.warn(`    combined.mp3 failed: ${err.message}`);
  }

  return { changed, total: wavs.length };
}

function copyAudioToDist() {
  const src = path.join(AUDIO_ROOT, SHOW);
  const dest = path.join(DIST_ROOT, SHOW);
  if (!fs.existsSync(src)) return;
  ensureCopyTree(src, dest);
  console.log(`\nCopied ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
}

function ensureCopyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      ensureCopyTree(s, d);
    } else if (entry.name.endsWith('.mp3') || entry.name.endsWith('.json')) {
      // dist ships mp3 + manifest only (no wav/source)
      fs.copyFileSync(s, d);
    } else if (entry.name === 'manifest.json') {
      fs.copyFileSync(s, d);
    }
  }
}

function main() {
  console.log(`\n=== Peak normalize: ${SHOW} → ${TARGET_DB} dBFS ===\n`);
  if (!hasFfmpeg()) console.warn('ffmpeg not found — will normalize WAVs only\n');

  let dirs = [];
  if (!DIST_ONLY) dirs = dirs.concat(listEpisodeDirs(AUDIO_ROOT).map((d) => ({ d, kind: 'audio' })));
  if (!AUDIO_ONLY) dirs = dirs.concat(listEpisodeDirs(DIST_ROOT).map((d) => ({ d, kind: 'dist' })));

  if (dirs.length === 0) {
    console.error(`No episodes found for ${SHOW}`);
    process.exit(1);
  }

  let totalChanged = 0;
  let totalFiles = 0;
  for (const { d, kind } of dirs) {
    console.log(`[${kind}] ${path.relative(ROOT, d)}`);
    const { changed, total } = processEpisodeDir(d);
    totalChanged += changed;
    totalFiles += total;
  }

  // After audio/ is normalized, refresh dist from audio so they stay in sync
  // (only when we processed audio and not dist-only).
  if (!DRY && !DIST_ONLY && !AUDIO_ONLY && fs.existsSync(path.join(AUDIO_ROOT, SHOW))) {
    // Re-process was done on both; when both roots exist we already normalized
    // each independently. Prefer audio→dist copy of mp3+manifest for consistency.
    copyAudioTreeMp3Only();
  }

  console.log(`\nDone. ${totalChanged}/${totalFiles} wavs needed scaling.${DRY ? ' (dry-run)' : ''}\n`);
}

function copyAudioTreeMp3Only() {
  const srcRoot = path.join(AUDIO_ROOT, SHOW);
  const destRoot = path.join(DIST_ROOT, SHOW);
  if (!fs.existsSync(srcRoot)) return;
  for (const ep of fs.readdirSync(srcRoot)) {
    const src = path.join(srcRoot, ep);
    if (!fs.statSync(src).isDirectory()) continue;
    const dest = path.join(destRoot, ep);
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith('.mp3') || f === 'manifest.json') {
        fs.copyFileSync(path.join(src, f), path.join(dest, f));
      }
    }
  }
  console.log(`Synced mp3+manifest from audio/ → dist/audio/${SHOW}`);
}

main();
