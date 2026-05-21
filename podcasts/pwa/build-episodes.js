#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showsDir = path.join(__dirname, '..', 'shows');
const distDir = path.join(__dirname, 'dist');
const BOLD_SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
const BRACKET_CUE_LINE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s+-\s+FADE OUT)?\]$/i;
const ESTIMATED_WORDS_PER_MINUTE = 145;
const ESTIMATED_CUE_SECONDS = {
    'PAUSE': 0.8,
    'LONG PAUSE': 1.8,
    'MUSIC STING': 1.0,
    'MUSIC FADE': 1.2,
    'MUSIC FADES': 1.2,
    'INTRO MUSIC': 1.5,
    'OUTRO MUSIC': 1.5,
    'SFX': 0.7,
    'SOUND': 0.7,
    'AMBIENCE': 1.0,
    'AMBIENT BED': 1.0
};

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Pre-baked audio (e.g. produced by tools/generate-audio-supertonic.js) lives
// at pwa/audio/<show>/<episode>/. We mirror it into the build output below
// once the rest of the build has produced dist/. Wipe the previous copy first
// so removed episodes don't linger.
function removeDirRecursive(dir) {
    if (!fs.existsSync(dir)) return;
    const result = spawnSync('rm', ['-rf', dir], { stdio: 'ignore' });
    if (result.status !== 0) {
        fs.rmSync(dir, {
            recursive: true,
            force: true,
            maxRetries: 10,
            retryDelay: 200
        });
    }
}

removeDirRecursive(path.join(distDir, 'audio'));

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
            .trim();
        if (!text) continue;
        words += text.split(/\s+/).filter(Boolean).length;
    }

    if (words === 0 && cueSeconds === 0) return null;
    return Math.max(60, Math.round((words / ESTIMATED_WORDS_PER_MINUTE) * 60 + cueSeconds));
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

            // Process each episode
            for (const epMeta of manifest.episodes) {
                const epPath = path.join(podcastDir, epMeta.file);

                if (fs.existsSync(epPath)) {
                    console.log(`   ✓ ${epMeta.file}`);
                    const rawContent = fs.readFileSync(epPath, 'utf8');
                    let content = rawContent;
                    // Escape for template literal
                    content = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

                    // Pull total duration (seconds) from the audio manifest if it
                    // exists, so episode cards can show the real length instead
                    // of a hardcoded estimate.
                    const basename = epMeta.file.replace(/\.md$/, '');
                    const audioManifestPath = path.join(__dirname, 'audio', manifest.id, basename, 'manifest.json');
                    let durationSeconds = null;
                    if (fs.existsSync(audioManifestPath)) {
                        try {
                            const items = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
                            if (Array.isArray(items) && items.length > 0) {
                                const last = items[items.length - 1];
                                if (typeof last.startTime === 'number' && typeof last.duration === 'number') {
                                    durationSeconds = Math.round(last.startTime + last.duration);
                                }
                            }
                        } catch (err) {
                            console.warn(`     ⚠ Could not parse audio manifest for ${epMeta.file}: ${err.message}`);
                        }
                    }

                    const episodeRecord = {
                        id: epMeta.id,
                        file: epMeta.file,
                        title: epMeta.title,
                        subtitle: epMeta.subtitle,
                        content: content
                    };
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

// Generate podcasts.js
const podcastsJs = `// Auto-generated podcast data - ${new Date().toISOString()}
window.PODCASTS = ${JSON.stringify(podcasts, null, 2)};
`;

fs.writeFileSync(path.join(distDir, 'podcasts.js'), podcastsJs);
console.log('\n✓ Generated: podcasts.js');

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
    version: buildVersion,
    baseVersion,
    updated: buildTime.toISOString().slice(0, 10),
    builtAt: buildTime.toISOString()
};
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(generatedVersion, null, 2) + '\n');
console.log(`✓ Generated: version.json (${buildVersion})`);

// Copy static root files. sw.js gets a custom path because we need to
// substitute the build version + app shell list into it after copying.
const filesToCopy = ['index.html', 'manifest.json', 'icon.svg', '_headers'];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied: ${file}`);
    }
});

function copyDirRecursive(src, dest, shouldCopy = () => true) {
    if (!fs.existsSync(src)) return 0;
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    let count = 0;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirRecursive(srcPath, destPath, shouldCopy);
        } else if (shouldCopy(srcPath, entry.name)) {
            fs.copyFileSync(srcPath, destPath);
            count++;
        }
    }
    return count;
}

function copyAudioRecursive(src, dest) {
    return copyDirRecursive(src, dest, (srcPath, fileName) => {
        if (fileName.includes(' 2.')) return false;
        if (fileName === 'manifest.json') return true;
        if (fileName.endsWith('.mp3')) return true;
        return false;
    });
}

function pruneEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return true;
    let isEmpty = true;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (pruneEmptyDirs(child)) {
                fs.rmdirSync(child);
            } else {
                isEmpty = false;
            }
        } else {
            isEmpty = false;
        }
    }
    return isEmpty;
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

// Copy generated audio from tools/generate-audio-supertonic.js
const audioSrcDir = path.join(__dirname, 'audio');
const audioDistDir = path.join(distDir, 'audio');
if (fs.existsSync(audioSrcDir)) {
    const audioCount = copyAudioRecursive(audioSrcDir, audioDistDir);
    pruneEmptyDirs(audioDistDir);
    if (audioCount > 0) {
        console.log(`✓ Copied: ${audioCount} generated Supertonic audio files`);
    }
} else {
    console.warn('⚠️  No generated Supertonic audio found. Run npm run audio:show before building.');
}

// === Service worker template substitution ===
//
// Walk dist/ to enumerate the app shell (everything except audio, the SW
// itself, version.json, and Netlify-only files). Substitute the build version
// + that file list into sw.js so the precache install is atomic — every deploy
// gets a fresh cache name and pre-fetches a self-consistent set of assets.
function listAppShellFiles(dir) {
    const out = [];
    const skipDirs = new Set(['audio']);
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

const indexHtmlDist = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlDist)) {
    const original = fs.readFileSync(indexHtmlDist, 'utf8');
    // Match <script ... src="src/x.js" or "./src/x.js"...>. Preserves attribute order.
    const updated = original.replace(/(<script\b[^>]*\bsrc=)(['"])(\.{0,2}\/?src\/[^'"?]+\.js)(['"])/g, (m, prefix, q1, p, q2) => {
        if (q1 !== q2) return m;
        return `${prefix}${q1}${p}${VERSION_QUERY}${q2}`;
    });
    if (updated !== original) {
        fs.writeFileSync(indexHtmlDist, updated);
        console.log(`✓ Cache-busted entry <script src="…"> tags in dist/index.html`);
    }
}

const swSrcPath = path.join(__dirname, 'sw.js');
const swDestPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swSrcPath)) {
    const appShell = listAppShellFiles(distDir);
    const swSource = fs.readFileSync(swSrcPath, 'utf8');
    const populated = swSource
        .replaceAll('__BUILD_VERSION__', buildVersion)
        .replaceAll('__APP_SHELL__', JSON.stringify(appShell));
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
