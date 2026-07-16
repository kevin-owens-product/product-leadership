#!/usr/bin/env node
/**
 * sync-duration-headers.js — sync every episode's "**Duration:** ~NN minutes"
 * markdown header with the real rendered length from its audio manifest.
 *
 * The header is only an estimate used before audio exists, but a stale one
 * (or a missing one, which the linter warns about) misleads the episode list.
 * This reads pwa/audio/<show>/<episode>/manifest.json, computes the timeline
 * length, and rewrites or inserts the header.
 *
 * Inserting a header shifts every line below it, and the audio manifest points
 * at dialogue by markdown line number (`rawLine`). A naive insert therefore
 * silently repoints every line at its neighbour's audio — which is worse than
 * the stale header it fixes, and the linter does not catch it because the
 * lookups still succeed. So an insert also shifts the manifest's rawLines by
 * the same delta, exactly as a re-render would, keeping audio aligned without
 * paying for TTS again.
 *
 * Not to be confused with backfill-manifest-durations.js, which runs the other
 * direction: it writes duration/startTime into the manifests from the audio
 * files themselves. Run that one first; this one consumes its output.
 *
 * Usage: node podcasts/tools/sync-duration-headers.js [--show <id>] [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOWS_DIR = path.join(ROOT, 'shows');
const AUDIO_ROOT = path.join(ROOT, 'pwa', 'audio');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const SHOW_FILTER = (() => {
  const i = argv.indexOf('--show');
  return i >= 0 && i < argv.length - 1 ? argv[i + 1] : null;
})();

// Deliberately mirrors DURATION_HEADER_RE in pwa/cli/validate-lib.js: a header
// this misses but the linter accepts would get a duplicate inserted above it,
// and build-episodes.js reads the *first* header in the file — so the episode
// card would keep showing the stale number forever. Matching stops at
// "minutes" rather than running to end-of-line: a trailing `\s*$` is greedy
// enough to swallow the newline, and replacing over it would pull the
// following blank line out and turn a `---` rule into a setext heading.
const DURATION_RE = /^\*\*Duration:\*\*\s*~?\s*\d+(?:\.\d+)?\s*minutes?/im;

function readManifest(manifestPath) {
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items = Array.isArray(data) ? data : data.lines || data.items || [];
  return { data, items };
}

function manifestMinutes(items) {
  let end = 0;
  for (const it of items) {
    end = Math.max(end, (Number(it.startTime) || 0) + (Number(it.duration) || 0));
  }
  return end > 0 ? Math.max(1, Math.round(end / 60)) : null;
}

const lineIndexAt = (text, offset) => {
  let n = 0;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') n += 1;
  return n;
};

/** Insert the header, returning the new markdown plus the line shift it caused. */
function insertHeader(md, header) {
  // Prefer the header block's `---` rule, but only when it sits in the header
  // block: an unanchored search would find a mid-script scene break and inject
  // the header into the middle of the dialogue.
  const sepMatch = md.match(/^---$/m);
  const titleMatch = md.match(/^# .+$/m);
  const sepIdx = sepMatch ? md.indexOf(sepMatch[0], titleMatch ? md.indexOf(titleMatch[0]) : 0) - 1 : -1;
  const titleEnd = titleMatch ? md.indexOf(titleMatch[0]) + titleMatch[0].length : -1;

  if (sepIdx > 0 && (titleEnd === -1 || sepIdx > titleEnd) && lineIndexAt(md, sepIdx) <= 12) {
    const next = `${md.slice(0, sepIdx)}\n${header}\n${md.slice(sepIdx)}`;
    return { next, at: lineIndexAt(md, sepIdx), delta: 2 };
  }
  if (titleEnd !== -1) {
    const next = `${md.slice(0, titleEnd)}\n\n${header}${md.slice(titleEnd)}`;
    return { next, at: lineIndexAt(md, titleEnd) + 1, delta: 2 };
  }
  return null;
}

/** Shift rawLines at/after `at` by `delta` so the manifest still points true. */
function shiftManifestRawLines({ data, items }, at, delta) {
  let shifted = 0;
  for (const it of items) {
    if (typeof it.rawLine === 'number' && it.rawLine >= at) {
      it.rawLine += delta;
      shifted += 1;
    }
  }
  return { json: JSON.stringify(data, null, 2) + '\n', shifted };
}

let changed = 0;
let inserted = 0;
const shows = fs.readdirSync(SHOWS_DIR).filter((id) => {
  if (id === '_template') return false; // scaffold, not a real show
  return SHOW_FILTER ? id === SHOW_FILTER : true;
});
if (SHOW_FILTER && shows.length === 0) {
  console.error(`No show named ${SHOW_FILTER} under ${SHOWS_DIR}`);
  process.exit(1);
}

for (const showId of shows) {
  const showJson = path.join(SHOWS_DIR, showId, 'podcast.json');
  if (!fs.existsSync(showJson)) continue;
  const show = JSON.parse(fs.readFileSync(showJson, 'utf8'));
  for (const ep of show.episodes || []) {
    const mdPath = path.join(SHOWS_DIR, showId, ep.file);
    const basename = ep.file.replace(/\.md$/, '');
    const manifestPath = path.join(AUDIO_ROOT, showId, basename, 'manifest.json');
    if (!fs.existsSync(mdPath) || !fs.existsSync(manifestPath)) continue;

    const manifest = readManifest(manifestPath);
    const minutes = manifestMinutes(manifest.items);
    if (minutes == null) continue;
    const header = `**Duration:** ~${minutes} minutes`;
    const md = fs.readFileSync(mdPath, 'utf8');
    const existing = md.match(DURATION_RE);

    if (existing) {
      if (existing[0] === header) continue;
      changed += 1;
      console.log(`${showId}/${ep.file}: ${existing[0]} → ${header}`);
      if (!DRY_RUN) fs.writeFileSync(mdPath, md.replace(DURATION_RE, header));
      continue;
    }

    const insert = insertHeader(md, header);
    if (!insert) {
      console.warn(`skip ${showId}/${ep.file}: nowhere to insert a header`);
      continue;
    }
    const { json, shifted } = shiftManifestRawLines(manifest, insert.at, insert.delta);
    changed += 1;
    inserted += 1;
    console.log(`${showId}/${ep.file}: + ${header} (shifted ${shifted} manifest rawLine(s) by ${insert.delta})`);
    if (!DRY_RUN) {
      fs.writeFileSync(mdPath, insert.next);
      fs.writeFileSync(manifestPath, json);
    }
  }
}
console.log(
  `${DRY_RUN ? '[dry-run] would update' : 'updated'} ${changed} episode header(s)` +
  (inserted ? `, ${inserted} inserted (manifests realigned)` : '')
);
