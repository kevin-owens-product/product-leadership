#!/usr/bin/env node
// Lints episode Markdown and checks generated-audio manifests for every show.
//
//   npm run validate                    validate all shows
//   npm run validate -- --show <id>     validate one show
//   npm run validate -- --show <id> --episode <n>
//   npm run validate -- --no-audio      skip audio manifest / drift checks
//
// Also exported as runValidation() so build-episodes.js can gate every build
// on the same checks. Exits 1 if any error-level issue is found; warnings
// never fail the run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
    lintEpisodeMarkdown,
    checkShowManifest,
    checkAudioManifest,
    checkManifestAlignment,
    knownSpeakersFromManifest
} from './validate-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PWA_DIR = path.join(__dirname, '..');
const DEFAULT_SHOWS_DIR = path.join(PWA_DIR, '..', 'shows');
const DEFAULT_AUDIO_ROOT = path.join(PWA_DIR, 'audio');

let ffprobeAvailable = null;
function hasFfprobe() {
    if (ffprobeAvailable == null) {
        ffprobeAvailable = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
    }
    return ffprobeAvailable;
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

function relPath(absPath) {
    const rel = path.relative(process.cwd(), absPath);
    return rel && !rel.startsWith('..') ? rel : absPath;
}

/**
 * Run all validation checks. Prints `file:line level: message` for every
 * issue and returns { errors, warnings }.
 */
export function runValidation({
    showsDir = DEFAULT_SHOWS_DIR,
    audioRoot = DEFAULT_AUDIO_ROOT,
    showFilter = null,
    episodeFilter = null,
    checkAudio = true,
    log = console.log
} = {}) {
    let errors = 0;
    let warnings = 0;

    const report = (file, line, level, message) => {
        if (level === 'error') errors += 1;
        else warnings += 1;
        const location = line != null ? `${relPath(file)}:${line}` : relPath(file);
        log(`${location} ${level}: ${message}`);
    };

    if (!fs.existsSync(showsDir)) {
        report(showsDir, null, 'error', 'shows directory not found');
        return { errors, warnings };
    }

    const showDirs = fs.readdirSync(showsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
        .map((d) => d.name)
        .filter((name) => !showFilter || name === showFilter);

    if (showFilter && showDirs.length === 0) {
        report(path.join(showsDir, showFilter), null, 'error', 'show not found');
        return { errors, warnings };
    }

    for (const showName of showDirs) {
        const showDir = path.join(showsDir, showName);
        const manifestPath = path.join(showDir, 'podcast.json');
        if (!fs.existsSync(manifestPath)) continue; // not a show, same as build

        let manifest;
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (err) {
            report(manifestPath, null, 'error', `invalid JSON: ${err.message}`);
            continue;
        }

        for (const issue of checkShowManifest(manifest, {
            fileExists: (file) => fs.existsSync(path.join(showDir, file))
        })) {
            report(manifestPath, null, issue.level, issue.message);
        }

        const knownSpeakers = knownSpeakersFromManifest(manifest);
        const episodes = Array.isArray(manifest.episodes) ? manifest.episodes : [];
        for (const ep of episodes) {
            if (!ep || typeof ep.file !== 'string') continue;
            if (episodeFilter != null && ep.id !== episodeFilter) continue;
            const epPath = path.join(showDir, ep.file);
            if (!fs.existsSync(epPath)) continue; // already reported by checkShowManifest

            const markdown = fs.readFileSync(epPath, 'utf8');
            for (const issue of lintEpisodeMarkdown(markdown, { knownSpeakers })) {
                report(epPath, issue.line, issue.level, issue.message);
            }

            if (!checkAudio) continue;
            const basename = ep.file.replace(/\.md$/, '');
            const audioDir = path.join(audioRoot, manifest.id || showName, basename);
            if (!fs.existsSync(audioDir)) continue; // audio not generated yet — fine

            const audioManifestPath = path.join(audioDir, 'manifest.json');
            if (!fs.existsSync(audioManifestPath)) {
                report(audioDir, null, 'warning', 'audio directory exists but has no manifest.json — regenerate this episode');
                continue;
            }

            let items;
            try {
                items = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
            } catch (err) {
                report(audioManifestPath, null, 'error', `invalid JSON: ${err.message}`);
                continue;
            }

            const combinedPath = path.join(audioDir, 'combined.mp3');
            let combinedDurationSeconds = null;
            if (fs.existsSync(combinedPath)) {
                if (hasFfprobe()) combinedDurationSeconds = ffprobeDuration(combinedPath);
            } else {
                report(audioDir, null, 'warning', 'combined.mp3 missing — streaming playback will fall back to per-chunk mode');
            }

            for (const issue of checkAudioManifest(items, {
                fileExists: (file) => fs.existsSync(path.join(audioDir, file)),
                combinedDurationSeconds
            })) {
                report(audioManifestPath, null, issue.level, issue.message);
            }

            for (const issue of checkManifestAlignment(markdown, items)) {
                report(audioManifestPath, null, issue.level, issue.message);
            }
        }
    }

    return { errors, warnings };
}

function main() {
    const args = process.argv.slice(2);
    const opt = (name) => {
        const i = args.indexOf(`--${name}`);
        return i !== -1 && i < args.length - 1 ? args[i + 1] : null;
    };

    const showFilter = opt('show');
    const episodeArg = opt('episode');
    const episodeFilter = episodeArg != null ? parseInt(episodeArg, 10) : null;

    console.log('Validating shows...\n');
    const { errors, warnings } = runValidation({
        showFilter,
        episodeFilter: Number.isFinite(episodeFilter) ? episodeFilter : null,
        checkAudio: !args.includes('--no-audio')
    });

    if (errors === 0 && warnings === 0) {
        console.log('✓ Validation passed — no issues.');
    } else if (errors === 0) {
        console.log(`\n✓ Validation passed with ${warnings} warning(s).`);
    } else {
        console.log(`\n✗ Validation failed: ${errors} error(s), ${warnings} warning(s).`);
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
