#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { runValidation } from './cli/validate.js';
import renderStorage from '../tools/render-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showsDir = path.join(__dirname, '..', 'shows');
const distDir = path.join(__dirname, 'dist');
const BOLD_SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
const BRACKET_CUE_LINE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s+-\s+FADE OUT)?\]$/i;
const ESTIMATED_WORDS_PER_MINUTE = 145;
// Music-cue lengths come from the synthesizer that renders them (see
// ../tools/cue-music.js) so this estimate can't drift from the real audio.
const ESTIMATED_CUE_SECONDS = {
    'PAUSE': 0.8,
    'LONG PAUSE': 1.8,
    'SFX': 0.7,
    'SOUND': 0.7,
    'AMBIENCE': 1.0,
    'AMBIENT BED': 1.0,
    ...createRequire(import.meta.url)('../tools/cue-music.js').MUSIC_CUE_SECONDS
};

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const audioSrcDir = path.join(__dirname, 'audio');
const audioDistDir = path.join(distDir, 'audio');

// Check the exact files this build will serve, including audio carried over
// from an earlier release. Do not replace any episode until every check passes.
console.log('Validating shows...\n');
const staging = fs.mkdtempSync(path.join(distDir, '.audio-build-'));
try {
    const replacements = [];
    function resolveAudioDir(showId, basename) {
        const src = path.join(audioSrcDir, showId, basename);
        const dest = path.join(audioDistDir, showId, basename);
        if (!fs.existsSync(path.join(src, 'manifest.json'))) return dest;
        const next = path.join(staging, showId, basename);
        const cacheDir = path.join(audioSrcDir, '.render-cache', showId, basename);
        if (fs.existsSync(cacheDir)) renderStorage.withRenderLock(cacheDir, () => stageEpisodeAudio(src, next));
        else stageEpisodeAudio(src, next);
        replacements.push({ next, dest });
        return next;
    }
    const validation = runValidation({ showsDir, resolveAudioDir });
    if (validation.errors) {
        throw new Error(`Validation failed: ${validation.errors} error(s), ${validation.warnings} warning(s).`);
    }
    const installed = [];
    try {
        for (const [index, { next, dest }] of replacements.entries()) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            const backup = path.join(staging, 'previous-' + index);
            renderStorage.replaceDirectory(next, dest, backup);
            installed.push({ next, dest, backup });
        }
    } catch (error) {
        for (const { next, dest, backup } of installed.reverse()) {
            fs.renameSync(dest, next);
            if (fs.existsSync(backup)) fs.renameSync(backup, dest);
        }
        throw error;
    }
    console.log(`✓ Validation passed${validation.warnings ? ` (${validation.warnings} warning(s))` : ''}.\n`);
} finally {
    fs.rmSync(staging, { recursive: true, force: true });
}

console.log('Building PodLearn Multi-Podcast App...\n');

function estimateDurationSeconds(markdown) {
    const explicit = markdown.match(/\*\*Duration:\*\*\s*~?\s*(\d+(?:\.\d+)?)\s*minutes?/i);
    if (explicit) {
        const minutes = parseFloat(explicit[1]);
        if (Number.isFinite(minutes) && minutes > 0) return Math.round(minutes * 60);
    }

    let words = 0;
    let cueSeconds = 0;

    for (const rawLine of markdown.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;

        const cueMatch = line.match(BRACKET_CUE_LINE_RE);
        if (cueMatch) {
            cueSeconds += ESTIMATED_CUE_SECONDS[cueMatch[1].toUpperCase()] || 0.8;
            continue;
        }

        const speakerMatch = line.match(BOLD_SPEAKER_LINE_RE) || line.match(BRACKET_SPEAKER_LINE_RE);
        if (!speakerMatch) continue;
        const text = String(speakerMatch[2] || '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/<\s*[a-zA-Z_]+\s*>/g, ' ')
            .trim();
        if (!text) continue;
        words += text.split(/\s+/).filter(Boolean).length;
    }

    if (words === 0 && cueSeconds === 0) return null;
    return Math.max(60, Math.round((words / ESTIMATED_WORDS_PER_MINUTE) * 60 + cueSeconds));
}

// Transcripts are served as standalone files and fetched when an episode is
// opened, so the catalog that every launch downloads stays small. Wipe the
// previous copy so removed episodes don't linger.
const transcriptsDistDir = path.join(distDir, 'transcripts');
fs.rmSync(transcriptsDistDir, { recursive: true, force: true });

// Short content hash used as a cache key: a transcript URL only changes when
// the script does, so caches stay valid across deploys that don't touch it.
function contentHash(text) {
    return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

// When an episode first landed in the repo. Feeds use it as pubDate. One git
// pass maps every show file to the date it was added (the oldest add wins
// when a file was deleted and re-added). podcast.json can override it with an
// ISO `published` date per episode.
const firstAddedByPath = new Map();
try {
    const result = spawnSync('git', ['log', '--diff-filter=A', '--name-only', '--format=@%aI', '--', '.'], {
        cwd: showsDir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
    });
    const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: showsDir, encoding: 'utf8' });
    if (result.status === 0 && top.status === 0) {
        const repoRoot = top.stdout.trim();
        let date = null;
        for (const line of result.stdout.split('\n')) {
            if (line.startsWith('@')) date = new Date(line.slice(1)).toISOString();
            else if (line.trim() && date) firstAddedByPath.set(path.join(repoRoot, line.trim()), date);
        }
    }
} catch {
    // Not a git checkout: fall back to file mtimes below.
}

function firstCommitDate(filePath) {
    const known = firstAddedByPath.get(path.resolve(filePath));
    if (known) return known;
    try {
        return fs.statSync(filePath).mtime.toISOString();
    } catch {
        return null;
    }
}

function findAudioFile(showId, basename, fileName) {
    const candidate = path.join(audioDistDir, showId, basename, fileName);
    return fs.existsSync(candidate) ? candidate : null;
}

// Find all podcasts
const podcasts = [];

if (fs.existsSync(showsDir)) {
    const dirs = fs.readdirSync(showsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('_'));

    for (const dir of dirs) {
        const podcastDir = path.join(showsDir, dir.name);
        const manifestPath = path.join(podcastDir, 'podcast.json');

        if (fs.existsSync(manifestPath)) {
            console.log(`\n📻 Processing podcast: ${dir.name}`);

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const podcastData = {
                id: manifest.id,
                title: manifest.title,
                subtitle: manifest.subtitle,
                description: manifest.description,
                author: manifest.author || 'Unknown',
                color: manifest.color || '#6366f1',
                icon: manifest.icon || '🎙️',
                episodes: []
            };
            const coverPath = path.join(podcastDir, 'cover.jpg');
            if (fs.existsSync(coverPath)) {
                const coverDir = path.join(distDir, 'covers');
                fs.mkdirSync(coverDir, { recursive: true });
                const coverName = dir.name + '.jpg';
                fs.copyFileSync(coverPath, path.join(coverDir, coverName));
                podcastData.coverUrl = 'covers/' + encodeURIComponent(coverName);
            }
            if (Array.isArray(manifest.seasons) && manifest.seasons.length > 0) {
                podcastData.seasons = manifest.seasons.map((season) => ({
                    number: season.number,
                    title: season.title,
                    description: season.description || ''
                }));
            }

            // Process each episode
            for (const epMeta of manifest.episodes) {
                const epPath = path.join(podcastDir, epMeta.file);

                if (fs.existsSync(epPath)) {
                    console.log(`   ✓ ${epMeta.file}`);
                    const rawContent = fs.readFileSync(epPath, 'utf8');

                    // Pull total duration (seconds) from the audio manifest if it
                    // exists, so episode cards can show the real length instead
                    // of a hardcoded estimate.
                    const basename = epMeta.file.replace(/\.md$/, '');
                    const audioManifestPath = findAudioFile(manifest.id, basename, 'manifest.json');
                    let durationSeconds = null;
                    if (audioManifestPath) {
                        const items = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
                        const last = items.at(-1);
                        if (Number.isFinite(last?.startTime) && Number.isFinite(last.duration)) {
                            durationSeconds = Math.round(last.startTime + last.duration);
                        }
                    }

                    const transcriptDir = path.join(transcriptsDistDir, manifest.id);
                    fs.mkdirSync(transcriptDir, { recursive: true });
                    fs.writeFileSync(path.join(transcriptDir, epMeta.file), rawContent);

                    const episodeRecord = {
                        id: epMeta.id,
                        file: epMeta.file,
                        title: epMeta.title,
                        subtitle: epMeta.subtitle,
                        transcriptHash: contentHash(rawContent)
                    };
                    const published = typeof epMeta.published === 'string' && !Number.isNaN(Date.parse(epMeta.published))
                        ? new Date(epMeta.published).toISOString()
                        : firstCommitDate(epPath);
                    if (published) episodeRecord.published = published;
                    const combinedPath = findAudioFile(manifest.id, basename, 'combined.mp3');
                    if (combinedPath) episodeRecord.audioBytes = fs.statSync(combinedPath).size;
                    if (Number.isInteger(epMeta.season)) episodeRecord.season = epMeta.season;
                    if (durationSeconds == null) durationSeconds = estimateDurationSeconds(rawContent);
                    if (durationSeconds != null) episodeRecord.durationSeconds = durationSeconds;
                    podcastData.episodes.push(episodeRecord);
                } else {
                    console.log(`   ✗ Missing: ${epMeta.file}`);
                }
            }

            podcasts.push(podcastData);
        }
    }
}

if (podcasts.length === 0) {
    console.log('\n⚠️  No podcasts found. Create shows/<name>/podcast.json to add podcasts.');
}

// === Podcast feeds ===
//
// One RSS feed per show so episodes can be followed in Apple Podcasts,
// Overcast, Pocket Casts or CarPlay. Each enclosure is the episode's existing
// combined.mp3. itunes:block keeps the feeds out of public directories: they
// work for anyone with the link, but nobody finds them by searching.
const SITE_URL = (process.env.SITE_URL || 'https://productleader.netlify.app').replace(/\/+$/, '');
const feedsDistDir = path.join(distDir, 'feeds');
fs.rmSync(feedsDistDir, { recursive: true, force: true });
fs.mkdirSync(feedsDistDir, { recursive: true });

function xmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function itunesDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

let feedCount = 0;
for (const podcast of podcasts) {
    const items = podcast.episodes
        .filter((ep) => Number.isFinite(ep.audioBytes) && ep.audioBytes > 0)
        .map((ep) => {
            const basename = ep.file.replace(/\.md$/, '');
            const audioUrl = `${SITE_URL}/audio/${encodeURIComponent(podcast.id)}/${encodeURIComponent(basename)}/combined.mp3`;
            const link = `${SITE_URL}/?podcast=${encodeURIComponent(podcast.id)}&episode=${encodeURIComponent(ep.id)}`;
            const season = Number.isInteger(ep.season) ? `\n      <itunes:season>${ep.season}</itunes:season>` : '';
            const pubDate = ep.published ? new Date(ep.published).toUTCString() : new Date().toUTCString();
            return `    <item>
      <title>${xmlEscape(ep.title)}</title>
      <description>${xmlEscape(ep.subtitle || ep.title)}</description>
      <itunes:subtitle>${xmlEscape(ep.subtitle || '')}</itunes:subtitle>
      <guid isPermaLink="false">${xmlEscape(`${podcast.id}/${basename}`)}</guid>
      <link>${xmlEscape(link)}</link>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${xmlEscape(audioUrl)}" length="${ep.audioBytes}" type="audio/mpeg"/>${Number.isFinite(ep.durationSeconds) ? `\n      <itunes:duration>${itunesDuration(ep.durationSeconds)}</itunes:duration>` : ''}${season}
      <itunes:episode>${ep.id}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`;
        });
    if (items.length === 0) continue;
    const showLink = `${SITE_URL}/?podcast=${encodeURIComponent(podcast.id)}`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(podcast.title)}</title>
    <link>${xmlEscape(showLink)}</link>
    <atom:link href="${xmlEscape(`${SITE_URL}/feeds/${podcast.id}.xml`)}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <description>${xmlEscape(podcast.description || podcast.subtitle || podcast.title)}</description>
    <itunes:subtitle>${xmlEscape(podcast.subtitle || '')}</itunes:subtitle>
    <itunes:author>${xmlEscape(podcast.author)}</itunes:author>
    <itunes:summary>${xmlEscape(podcast.description || podcast.subtitle || '')}</itunes:summary>
    <itunes:image href="${SITE_URL}/icon-512.png"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>${podcast.seasons ? 'serial' : 'episodic'}</itunes:type>
    <itunes:block>yes</itunes:block>
${items.join('\n')}
  </channel>
</rss>
`;
    fs.writeFileSync(path.join(feedsDistDir, `${podcast.id}.xml`), xml);
    podcast.feedUrl = `feeds/${podcast.id}.xml`;
    feedCount += 1;
}
// Generate podcasts.js (compact: it is the one file every launch downloads).
fs.writeFileSync(path.join(distDir, 'podcasts.js'), `// Auto-generated podcast data - ${new Date().toISOString()}
window.PODCASTS = ${JSON.stringify(podcasts)};
`);
console.log('\n✓ Generated: podcasts.js');
console.log(`✓ Generated: ${feedCount} podcast feeds in feeds/`);

// Generate build version metadata for deploy artifacts.
const sourceVersionPath = path.join(__dirname, 'version.json');
let baseVersion = '0.0.0';
if (fs.existsSync(sourceVersionPath)) {
    try {
        const sourceVersion = JSON.parse(fs.readFileSync(sourceVersionPath, 'utf8'));
        if (typeof sourceVersion.version === 'string' && sourceVersion.version.trim()) {
            baseVersion = sourceVersion.version.trim();
        }
    } catch (err) {
        console.warn('Could not parse source version.json, using fallback 0.0.0:', err.message);
    }
}

const buildTime = new Date();
const buildStamp = buildTime
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
const buildVersion = `${baseVersion}+${buildStamp}`;
const generatedVersion = {
    // Older clients clear all offline audio when the old 'version' field
    // changes. They can upgrade through service worker registration instead.
    buildVersion,
    baseVersion,
    updated: buildTime.toISOString().slice(0, 10),
    builtAt: buildTime.toISOString()
};
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(generatedVersion, null, 2) + '\n');
console.log(`✓ Generated: version.json (${buildVersion})`);

// Copy static root files. sw.js gets a custom path because we need to
// substitute the build version + app shell list into it after copying.
const filesToCopy = [
    'index.html',
    'manifest.json',
    'icon.svg',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    '_headers'
];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        if (copyFileResilient(src, dest)) console.log(`✓ Copied: ${file}`);
    }
});

// iCloud Drive can evict/materialize files mid-build, so copies and directory
// scans occasionally hit transient ENOENT on paths that exist again moments
// later. Retry once, then skip with a warning (the next build heals) rather
// than failing the whole build.
function copyFileResilient(src, dest) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            fs.copyFileSync(src, dest);
            return true;
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
    }
    console.warn(`⚠ Skipped (file vanished during copy): ${src}`);
    return false;
}

function readdirSafe(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
}

function copyDirRecursive(src, dest, shouldCopy = () => true) {
    const entries = readdirSafe(src);
    if (!entries) return 0;
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    let count = 0;
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirRecursive(srcPath, destPath, shouldCopy);
        } else if (shouldCopy(srcPath, entry.name)) {
            if (copyFileResilient(srcPath, destPath)) count++;
        }
    }
    return count;
}

// Include only the declared chunks and enclosure. In particular, a WAV-only
// render keeps its WAVs and an MP3 render leaves its source PCM behind.
function stageEpisodeAudio(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const manifest = path.join(dest, 'manifest.json');
    fs.copyFileSync(path.join(src, 'manifest.json'), manifest);
    let items;
    try {
        items = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    } catch (cause) {
        throw new Error('Invalid audio manifest at ' + path.join(src, 'manifest.json'), { cause });
    }
    const files = new Set(['combined.mp3']);
    if (Array.isArray(items)) {
        for (const item of items) {
            if (typeof item?.file === 'string' && item.file === path.basename(item.file) && /\.(mp3|wav)$/i.test(item.file)) {
                files.add(item.file);
            }
        }
    }
    for (const file of files) {
        const source = path.join(src, file);
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dest, file), fs.constants.COPYFILE_FICLONE);
    }
}

function pruneAudioDirs(directory, keep) {
    for (const entry of readdirSafe(directory) || []) {
        if (entry.isDirectory() && !keep.has(entry.name)) {
            fs.rmSync(path.join(directory, entry.name), { recursive: true, force: true });
        }
    }
}

// Copy ES module source files used by index.html
const srcModulesDir = path.join(__dirname, 'src');
const srcModulesDistDir = path.join(distDir, 'src');
if (fs.existsSync(srcModulesDir)) {
    const sourceCount = copyDirRecursive(srcModulesDir, srcModulesDistDir);
    if (sourceCount > 0) {
        console.log(`✓ Copied: ${sourceCount} source module files`);
    }
}

// Copy stylesheets linked from index.html. They land in dist/styles/, so the
// app-shell walker below automatically precaches them — offline installs keep
// working with the CSS split out of index.html.
const stylesDir = path.join(__dirname, 'styles');
const stylesDistDir = path.join(distDir, 'styles');
if (fs.existsSync(stylesDir)) {
    const styleCount = copyDirRecursive(stylesDir, stylesDistDir, (srcPath, fileName) => fileName.endsWith('.css'));
    if (styleCount > 0) {
        console.log(`✓ Copied: ${styleCount} stylesheet files`);
    }
}

for (const podcast of podcasts) {
    const showDir = path.join(audioDistDir, podcast.id);
    const basenames = new Set(podcast.episodes.map((episode) => episode.file.replace(/\.md$/, '')));
    pruneAudioDirs(showDir, basenames);
}
if (podcasts.length) pruneAudioDirs(audioDistDir, new Set(podcasts.map((podcast) => podcast.id)));

// === Service worker template substitution ===
//
// Walk dist/ to enumerate the app shell (everything except audio, the SW
// itself, version.json, and Netlify-only files). Substitute the build version
// + that file list into sw.js so the precache install is atomic — every deploy
// gets a fresh cache name and pre-fetches a self-consistent set of assets.
function listAppShellFiles(dir) {
    const out = [];
    const skipDirs = new Set(['audio', 'transcripts', 'feeds']);
    const skipFiles = new Set(['sw.js', 'version.json', '_headers', 'netlify.toml', 'README.md', '.DS_Store']);
    function walk(absolute, relative) {
        for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
            if (entry.name.includes(' 2.') || entry.name.endsWith(' 2')) continue;
            const childAbs = path.join(absolute, entry.name);
            const childRel = relative ? `${relative}/${entry.name}` : `/${entry.name}`;
            if (entry.isDirectory()) {
                if (skipDirs.has(entry.name)) continue;
                walk(childAbs, childRel);
            } else if (!skipFiles.has(entry.name)) {
                out.push(childRel);
            }
        }
    }
    walk(dir, '');
    return out.sort();
}

// === URL-versioning of every JS asset ===
//
// Belt-and-suspenders for the SW. Even if a user is stuck on a broken old
// service worker that does cache-first for /src/*, a deploy bumps the query
// string on every JS URL — so those URLs are guaranteed cache misses and
// fetched fresh from network. The new SW's shellFetch uses ignoreSearch:true,
// so the precache still hits for the same path regardless of query.
//
// Two passes:
//   1. Rewrite relative `from "./x.js"` and `import("./x.js")` inside every
//      dist/src/*.js so module-graph imports get the version too. (Otherwise
//      only the entry point would be busted.)
//   2. Rewrite the entry script tag(s) in dist/index.html.
const VERSION_QUERY = `?v=${encodeURIComponent(buildVersion)}`;
const RELATIVE_JS_RE = /(['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g;
function bustJsImportsInFile(filePath) {
    const before = fs.readFileSync(filePath, 'utf8');
    let touched = 0;
    const after = before.replace(RELATIVE_JS_RE, (match, openQ, p, closeQ) => {
        if (openQ !== closeQ) return match;
        touched += 1;
        return `${openQ}${p}${VERSION_QUERY}${closeQ}`;
    });
    if (touched > 0) fs.writeFileSync(filePath, after);
    return touched;
}
function bustJsImportsInDir(dir) {
    if (!fs.existsSync(dir)) return { files: 0, edits: 0 };
    let files = 0;
    let edits = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const sub = bustJsImportsInDir(child);
            files += sub.files; edits += sub.edits;
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const t = bustJsImportsInFile(child);
            if (t > 0) { files += 1; edits += t; }
        }
    }
    return { files, edits };
}
const distSrcDir = path.join(distDir, 'src');
const importBust = bustJsImportsInDir(distSrcDir);
console.log(`✓ Cache-busted ${importBust.edits} import(s) across ${importBust.files} module file(s)`);

// Substitute the build version into copied source modules (same mechanism as
// sw.js below) — e.g. main.js pins its podcasts.js cache-buster to the build.
function stampBuildVersionInDir(dir) {
    if (!fs.existsSync(dir)) return 0;
    let stamped = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            stamped += stampBuildVersionInDir(child);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const before = fs.readFileSync(child, 'utf8');
            if (before.includes('__BUILD_VERSION__')) {
                fs.writeFileSync(child, before.replaceAll('__BUILD_VERSION__', buildVersion));
                stamped++;
            }
        }
    }
    return stamped;
}
const versionStamped = stampBuildVersionInDir(distSrcDir);
console.log(`✓ Stamped build version into ${versionStamped} module file(s)`);

const indexHtmlDist = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlDist)) {
    const original = fs.readFileSync(indexHtmlDist, 'utf8');
    // Match <script ... src="src/x.js" or "./src/x.js"...>. Preserves attribute order.
    const updated = original.replace(/(<script\b[^>]*\bsrc=)(['"])(\.{0,2}\/?src\/[^'"?]+\.js)(['"])/g, (m, prefix, q1, p, q2) => {
        if (q1 !== q2) return m;
        return `${prefix}${q1}${p}${VERSION_QUERY}${q2}`;
    });
    // Same belt-and-suspenders treatment for the stylesheet links.
    const withCss = updated.replace(/(<link\b[^>]*\bhref=)(['"])(\.{0,2}\/?styles\/[^'"?]+\.css)(['"])/g, (m, prefix, q1, p, q2) => {
        if (q1 !== q2) return m;
        return `${prefix}${q1}${p}${VERSION_QUERY}${q2}`;
    });
    if (withCss !== original) {
        fs.writeFileSync(indexHtmlDist, withCss);
        console.log(`✓ Cache-busted entry <script src="…"> and <link href="…"> tags in dist/index.html`);
    }
}

const swSrcPath = path.join(__dirname, 'sw.js');
const swDestPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swSrcPath)) {
    const appShell = listAppShellFiles(distDir);
    const swSource = fs.readFileSync(swSrcPath, 'utf8');
    // The classic worker must compare legacy downloads with exactly the same
    // dialogue parser as the player, including when the origin is offline.
    const dialogueParser = fs.readFileSync(path.join(__dirname, 'src/parse/dialogue.js'), 'utf8').replace(/^export /gm, '');
    const populated = swSource
        .replaceAll('__BUILD_VERSION__', buildVersion)
        .replaceAll('__APP_SHELL__', JSON.stringify(appShell))
        .replace('/*__DIALOGUE_PARSER__*/', () => dialogueParser);
    fs.writeFileSync(swDestPath, populated);
    console.log(`✓ Generated: sw.js (precache version=${buildVersion}, files=${appShell.length})`);
}

// Create README
const readmeContent = `# PodLearn - Custom Podcast Player

## Deployment

### Quick Deploy to Netlify
1. Connect your GitHub repo to Netlify
2. Set build command to: \`cd podcasts/pwa && node build-episodes.js\`
3. Set publish directory to: \`podcasts/pwa/dist\`

### Manual Deploy
1. Run \`node build-episodes.js\` in this directory
2. Deploy the \`dist/\` folder

## Creating Your Own Podcasts

1. Create a new folder in \`shows/\` (e.g., \`shows/my-podcast/\`)

2. Add a \`podcast.json\` file:
\`\`\`json
{
  "id": "my-podcast",
  "title": "My Podcast Title",
  "subtitle": "A great podcast",
  "description": "What this podcast is about",
  "author": "Your Name",
  "color": "#6366f1",
  "icon": "🎙️",
  "episodes": [
    {
      "id": 1,
      "file": "episode-01.md",
      "title": "Episode Title",
      "subtitle": "Episode subtitle"
    }
  ]
}
\`\`\`

3. Add episode markdown files with dialogue format:
\`\`\`markdown
# Episode 1: Title

### INTRO

**ALEX:** Welcome to the show!

**SAM:** Great to be here.

### SEGMENT 1: Topic Name

**ALEX:** Let's talk about...
\`\`\`

4. Run \`node build-episodes.js\` to rebuild

## Files

- \`index.html\` - Main app
- \`podcasts.js\` - All podcasts and episodes (auto-generated)
- \`manifest.json\` - PWA manifest
- \`sw.js\` - Service worker for offline
- \`icon.svg\` - App icon
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('✓ Created: README.md');

console.log(`\n✓ Build complete! ${podcasts.length} podcast(s) with ${podcasts.reduce((sum, p) => sum + p.episodes.length, 0)} total episodes.`);
console.log('Deploy the dist/ folder to Netlify.\n');
