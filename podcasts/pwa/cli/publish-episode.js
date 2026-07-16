#!/usr/bin/env node
// One-command episode pipeline: validate → TTS → duration backfill → build.
//
//   npm run publish-episode -- <show-id> <episode-number> [--dry-run] [--force]
//
//   --dry-run   Print the plan (and run the Markdown lint) without executing
//               TTS, backfill, or build.
//   --force     Forward to the TTS generator: re-render lines even if their
//               WAV is already cached.
//
// TTS is slow but resumable: the generator caches one WAV per line, so if a
// run dies partway, re-running this command skips every already-rendered
// line. Progress for the current run is shown per step.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runValidation } from './validate.js';
import { parseEpisodeEvents } from './validate-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PWA_DIR = path.join(__dirname, '..');
const ROOT = path.join(PWA_DIR, '..');
const SHOWS_DIR = path.join(ROOT, 'shows');
const TOOLS_DIR = path.join(ROOT, 'tools');
const AUDIO_ROOT = path.join(PWA_DIR, 'audio');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

const showId = positional[0];
const episodeArg = positional[1];

function usage(message) {
    if (message) console.error(`Error: ${message}\n`);
    console.error('Usage: npm run publish-episode -- <show-id> <episode-number> [--dry-run] [--force]');
    console.error('\nShows:');
    for (const d of fs.readdirSync(SHOWS_DIR, { withFileTypes: true })) {
        if (d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(SHOWS_DIR, d.name, 'podcast.json'))) {
            console.error(`  ${d.name}`);
        }
    }
    process.exit(1);
}

function formatElapsed(startedAt) {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function step(n, total, label) {
    console.log(`\n[${n}/${total}] ${label}`);
}

function runNode(scriptPath, scriptArgs, { env = {}, cwd = PWA_DIR } = {}) {
    const res = spawnSync('node', [scriptPath, ...scriptArgs], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ...env }
    });
    return res.status === 0;
}

function main() {
    if (!showId || !episodeArg) usage();

    const manifestPath = path.join(SHOWS_DIR, showId, 'podcast.json');
    if (!fs.existsSync(manifestPath)) usage(`show "${showId}" not found`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const episodeNum = parseInt(episodeArg, 10);
    const episode = (manifest.episodes || []).find((ep) => ep.id === episodeNum);
    if (!episode) usage(`episode ${episodeArg} not found in ${showId}/podcast.json`);

    const episodePath = path.join(SHOWS_DIR, showId, episode.file);
    const basename = episode.file.replace(/\.md$/, '');
    const audioDir = path.join(AUDIO_ROOT, showId, basename);
    const supertonicDir = process.env.SUPERTONIC_DIR || path.join(os.homedir(), 'code', 'supertonic');

    // Resume estimate: one WAV per parsed event, cached by the generator.
    let totalEvents = 0;
    let cachedWavs = 0;
    if (fs.existsSync(episodePath)) {
        totalEvents = parseEpisodeEvents(fs.readFileSync(episodePath, 'utf8')).length;
    }
    if (fs.existsSync(audioDir)) {
        cachedWavs = fs.readdirSync(audioDir).filter((f) => /^\d{4}\.wav$/.test(f)).length;
    }
    const cached = Math.min(cachedWavs, totalEvents);

    console.log(`=== Publish ${showId} episode ${episodeNum}: ${episode.title || basename} ===`);
    console.log(`  markdown:  ../shows/${showId}/${episode.file} (${totalEvents} renderable lines/cues)`);
    console.log(`  audio out: audio/${showId}/${basename}/`);
    if (FORCE) {
        console.log('  cache:     --force, all lines will be re-rendered');
    } else if (cached > 0) {
        console.log(`  cache:     ${cached}/${totalEvents} lines already rendered — TTS will resume and skip them`);
    } else {
        console.log('  cache:     no cached lines — full render');
    }

    const ttsArgs = ['--show', showId, '--episode', String(episodeNum), ...(FORCE ? ['--force'] : [])];
    const plan = [
        `validate   node cli/validate.js --show ${showId} --episode ${episodeNum}`,
        `tts        SUPERTONIC_DIR=${supertonicDir} node ../tools/generate-audio-supertonic.js ${ttsArgs.join(' ')}`,
        `backfill   node ../tools/backfill-manifest-durations.js --show ${showId}`,
        `headers    node ../tools/sync-duration-headers.js --show ${showId}`,
        'build      node build-episodes.js'
    ];
    console.log('\nPlan:');
    plan.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

    const totalSteps = 5;
    const startedAt = Date.now();

    // Step 1 — validate (Markdown + show manifest only; audio manifests are
    // about to be regenerated, and the post-build validation covers them).
    step(1, totalSteps, `Validating ${showId} episode ${episodeNum}…`);
    const { errors, warnings } = runValidation({
        showFilter: showId,
        episodeFilter: episodeNum,
        checkAudio: false
    });
    if (errors > 0) {
        console.error(`\n✗ Validation failed (${errors} error(s)). Fix the issues above, then re-run.`);
        process.exit(1);
    }
    console.log(`✓ Validation passed${warnings ? ` (${warnings} warning(s))` : ''}.`);

    if (DRY_RUN) {
        console.log('\n--dry-run: stopping before TTS. The plan above is what a real run executes.');
        return;
    }

    // Step 2 — TTS.
    step(2, totalSteps, `Generating TTS audio (resumable — re-run this command if it is interrupted)…`);
    if (!fs.existsSync(supertonicDir)) {
        console.error(`✗ SUPERTONIC_DIR not found at ${supertonicDir}. Set SUPERTONIC_DIR or clone Supertonic there (see ../tools/SUPERTONIC_SETUP.md).`);
        process.exit(1);
    }
    if (!runNode(path.join(TOOLS_DIR, 'generate-audio-supertonic.js'), ttsArgs, {
        env: { SUPERTONIC_DIR: supertonicDir }
    })) {
        const nowCached = fs.existsSync(audioDir)
            ? fs.readdirSync(audioDir).filter((f) => /^\d{4}\.wav$/.test(f)).length
            : 0;
        console.error(`\n✗ TTS failed after ${formatElapsed(startedAt)}. ${nowCached}/${totalEvents} lines are cached — re-run to resume from there.`);
        process.exit(1);
    }
    console.log(`✓ TTS complete (${formatElapsed(startedAt)} elapsed).`);

    // Step 3 — duration backfill (idempotent; generator usually fills these).
    step(3, totalSteps, 'Backfilling manifest durations…');
    if (!runNode(path.join(TOOLS_DIR, 'backfill-manifest-durations.js'), ['--show', showId])) {
        console.error('\n✗ Duration backfill failed. Re-run this command to retry (TTS output is preserved).');
        process.exit(1);
    }

    // Step 4 — sync the markdown Duration header to the freshly rendered
    // length, so the episode list stops advertising the author's estimate.
    // Scoped to this show: publishing one episode must never rewrite (and
    // line-shift) scripts elsewhere in the catalog.
    step(4, totalSteps, 'Syncing duration headers…');
    if (!runNode(path.join(TOOLS_DIR, 'sync-duration-headers.js'), ['--show', showId])) {
        console.error('\n✗ Duration header sync failed. Re-run this command to retry (TTS output is preserved).');
        process.exit(1);
    }

    // Step 5 — build (re-validates everything, including the new audio).
    step(5, totalSteps, 'Building dist/…');
    if (!runNode(path.join(PWA_DIR, 'build-episodes.js'), [])) {
        console.error('\n✗ Build failed. Fix the errors above, then re-run (TTS output is preserved).');
        process.exit(1);
    }

    console.log(`\n✓ Published ${showId} episode ${episodeNum} in ${formatElapsed(startedAt)}. Deploy dist/ when ready.`);
}

main();
