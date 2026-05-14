#!/usr/bin/env node
/**
 * Backfill `duration` (seconds) and `startTime` (cumulative seconds) onto each
 * item in every existing podcasts/pwa/audio/<show>/<episode>/manifest.json.
 *
 * Lets the PWA play combined.mp3 as a single <audio> element while still
 * mapping currentTime back to the correct dialogue line.
 *
 * Idempotent — items that already have `duration` are left alone unless
 * --force is passed. Skips manifests with no .mp3/.wav siblings on disk.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const AUDIO_ROOT = path.resolve(__dirname, '..', 'pwa', 'audio');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SHOW_FILTER = (() => {
  const i = args.indexOf('--show');
  return i >= 0 && i < args.length - 1 ? args[i + 1] : null;
})();

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

function listManifests() {
  if (!fs.existsSync(AUDIO_ROOT)) return [];
  const out = [];
  for (const show of fs.readdirSync(AUDIO_ROOT)) {
    if (SHOW_FILTER && show !== SHOW_FILTER) continue;
    const showDir = path.join(AUDIO_ROOT, show);
    if (!fs.statSync(showDir).isDirectory()) continue;
    for (const ep of fs.readdirSync(showDir)) {
      const epDir = path.join(showDir, ep);
      if (!fs.statSync(epDir).isDirectory()) continue;
      const manifest = path.join(epDir, 'manifest.json');
      if (fs.existsSync(manifest)) out.push({ show, ep, dir: epDir, manifest });
    }
  }
  return out;
}

function backfill(epDir, manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    return { skipped: true, reason: `parse error: ${err.message}` };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { skipped: true, reason: 'empty or non-array manifest' };
  }
  const allHaveDuration = items.every((it) => typeof it.duration === 'number' && typeof it.startTime === 'number');
  if (allHaveDuration && !FORCE) {
    return { skipped: true, reason: 'already has durations' };
  }

  let cumulative = 0;
  let probed = 0;
  let missing = 0;
  for (const item of items) {
    const file = item.file || `${String(item.index).padStart(4, '0')}.mp3`;
    const candidates = [file, file.replace(/\.mp3$/, '.wav')];
    let dur = null;
    for (const cand of candidates) {
      const p = path.join(epDir, cand);
      if (fs.existsSync(p)) {
        dur = ffprobeDuration(p);
        if (dur != null) break;
      }
    }
    if (dur == null) {
      missing += 1;
      continue;
    }
    item.duration = Number(dur.toFixed(3));
    item.startTime = Number(cumulative.toFixed(3));
    cumulative += dur;
    probed += 1;
  }

  if (probed === 0) {
    return { skipped: true, reason: `no audio files found alongside manifest (missing=${missing})` };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2) + '\n');
  return { skipped: false, probed, missing, totalDuration: cumulative };
}

function main() {
  const manifests = listManifests();
  if (manifests.length === 0) {
    console.error(`No manifests found under ${AUDIO_ROOT}${SHOW_FILTER ? ` for show '${SHOW_FILTER}'` : ''}.`);
    process.exit(1);
  }

  console.log(`Backfilling ${manifests.length} manifest(s) ${FORCE ? '(force)' : '(skip already-done)'}\n`);
  let updated = 0;
  let skipped = 0;
  for (const m of manifests) {
    const result = backfill(m.dir, m.manifest);
    const label = `${m.show}/${m.ep}`;
    if (result.skipped) {
      skipped += 1;
      console.log(`  - ${label}: skipped (${result.reason})`);
    } else {
      updated += 1;
      console.log(`  ✓ ${label}: ${result.probed} lines probed, total ${result.totalDuration.toFixed(1)}s${result.missing ? `, ${result.missing} missing` : ''}`);
    }
  }
  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main();
