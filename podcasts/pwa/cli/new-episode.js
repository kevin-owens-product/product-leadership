#!/usr/bin/env node
// Interactive wizard for scaffolding a new episode (and, if needed, a new
// show). Plain Node readline — no dependencies.
//
//   npm run new-episode
//
// Picks an existing show or scaffolds a new one modeled on shows/_template,
// prompts for the episode number/title/subtitle, writes the Markdown skeleton
// (frontmatter, speaker roster from podcast.json, cue-tag reference comment),
// and appends the episode entry to the show's podcast.json.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import { renderEpisodeSkeleton } from './episode-template.js';
import { lintEpisodeMarkdown, knownSpeakersFromManifest } from './validate-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOWS_DIR = path.join(__dirname, '..', '..', 'shows');
const TEMPLATE_DIR = path.join(SHOWS_DIR, '_template');

const SUGGESTED_VOICES = ['M1', 'F1', 'M2', 'F2'];

const rl = readline.createInterface({ input, output });

// Buffer incoming lines instead of using rl.question() directly: with piped
// stdin (scripted runs, tests) all lines arrive at once and rl.question()
// drops any line emitted while no question is pending.
const bufferedLines = [];
const lineWaiters = [];
let stdinClosed = false;
rl.on('line', (line) => {
    const waiter = lineWaiters.shift();
    if (waiter) waiter(line);
    else bufferedLines.push(line);
});
rl.on('close', () => {
    stdinClosed = true;
    while (lineWaiters.length) lineWaiters.shift()(null);
});

function nextLine(promptText) {
    output.write(promptText);
    if (bufferedLines.length > 0) {
        const line = bufferedLines.shift();
        if (!input.isTTY) output.write(`${line}\n`);
        return Promise.resolve(line);
    }
    if (stdinClosed) return Promise.resolve(null);
    return new Promise((resolve) => lineWaiters.push(resolve));
}

async function ask(question, fallback = '') {
    const suffix = fallback ? ` [${fallback}]` : '';
    const answer = await nextLine(`${question}${suffix}: `);
    if (answer == null) throw new Error('stdin closed before the wizard finished');
    return answer.trim() || fallback;
}

async function askRequired(question, fallback = '') {
    for (;;) {
        const answer = await ask(question, fallback);
        if (answer) return answer;
        console.log('  (required)');
    }
}

function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'untitled';
}

function listShows() {
    if (!fs.existsSync(SHOWS_DIR)) return [];
    return fs.readdirSync(SHOWS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
        .map((d) => d.name)
        .filter((name) => fs.existsSync(path.join(SHOWS_DIR, name, 'podcast.json')))
        .sort();
}

function readManifest(showId) {
    return JSON.parse(fs.readFileSync(path.join(SHOWS_DIR, showId, 'podcast.json'), 'utf8'));
}

function writeManifest(showId, manifest) {
    fs.writeFileSync(
        path.join(SHOWS_DIR, showId, 'podcast.json'),
        JSON.stringify(manifest, null, 2) + '\n'
    );
}

async function pickShow() {
    const shows = listShows();
    console.log('\nShows:');
    shows.forEach((id, i) => {
        let title = id;
        try { title = readManifest(id).title || id; } catch { /* show as id */ }
        console.log(`  ${i + 1}) ${id} — ${title}`);
    });
    console.log(`  ${shows.length + 1}) + Create a new show`);

    for (;;) {
        const answer = await askRequired(`Pick a show (1-${shows.length + 1})`);
        const n = parseInt(answer, 10);
        if (n >= 1 && n <= shows.length) return shows[n - 1];
        if (n === shows.length + 1) return createShow();
        // Allow typing the show id directly.
        if (shows.includes(answer)) return answer;
        console.log('  Not a valid choice.');
    }
}

async function createShow() {
    console.log('\n— New show (scaffolded from shows/_template) —');

    // _template/podcast.json supplies the shape + fallback defaults.
    let template = {};
    try {
        template = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'podcast.json'), 'utf8'));
    } catch { /* template optional */ }

    const title = await askRequired('Show title');
    let id = slugify(await ask('Show id (folder name)', slugify(title)));
    while (fs.existsSync(path.join(SHOWS_DIR, id))) {
        console.log(`  shows/${id} already exists.`);
        id = slugify(await askRequired('Show id (folder name)'));
    }

    const subtitle = await ask('Subtitle', template.subtitle || '');
    const description = await ask('Description', subtitle || template.description || '');
    const icon = await ask('Icon (emoji)', template.icon || '🎙️');
    const color = await ask('Accent color (hex)', template.color || '#6366f1');

    console.log('\nSpeakers (become the **NAME:** labels and the TTS voiceMap).');
    console.log(`Available Supertonic voices: ${SUGGESTED_VOICES.join(', ')}`);
    const voiceMap = {};
    const defaults = ['ALEX', 'SAM'];
    for (let i = 0; ; i++) {
        const fallback = i < defaults.length ? defaults[i] : '';
        const prompt = i < 1
            ? `Speaker ${i + 1} name`
            : `Speaker ${i + 1} name (blank to finish)`;
        const name = (i < 1 ? await askRequired(prompt, fallback) : await ask(prompt, i < 2 ? fallback : ''))
            .toUpperCase().trim();
        if (!name) break;
        if (voiceMap[name]) { console.log('  Already added.'); i--; continue; }
        const voice = await ask(`  Voice for ${name}`, SUGGESTED_VOICES[Object.keys(voiceMap).length % SUGGESTED_VOICES.length]);
        voiceMap[name] = voice.toUpperCase();
    }

    const speakers = Object.keys(voiceMap);
    const manifest = {
        id,
        title,
        subtitle,
        description,
        author: speakers.map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(' & '),
        color,
        icon,
        voiceMap,
        lang: 'en',
        episodes: []
    };

    fs.mkdirSync(path.join(SHOWS_DIR, id), { recursive: true });
    writeManifest(id, manifest);
    console.log(`\n✓ Created shows/${id}/podcast.json`);
    return id;
}

async function main() {
    console.log('=== New Episode Wizard ===');

    const showId = await pickShow();
    const manifest = readManifest(showId);
    const episodes = Array.isArray(manifest.episodes) ? manifest.episodes : [];

    const nextId = episodes.reduce((max, ep) => Math.max(max, Number(ep.id) || 0), 0) + 1;
    const number = parseInt(await ask('Episode number', String(nextId)), 10);
    if (!Number.isFinite(number) || number < 1) {
        console.error('Episode number must be a positive integer.');
        process.exit(1);
    }
    if (episodes.some((ep) => ep.id === number)) {
        console.error(`Episode ${number} already exists in ${showId}/podcast.json.`);
        process.exit(1);
    }

    const title = await askRequired('Episode title');
    const subtitle = await ask('Episode subtitle');

    const fileName = `episode-${String(number).padStart(2, '0')}-${slugify(title)}.md`;
    const filePath = path.join(SHOWS_DIR, showId, fileName);
    if (fs.existsSync(filePath)) {
        console.error(`${fileName} already exists — refusing to overwrite.`);
        process.exit(1);
    }

    const knownSpeakers = knownSpeakersFromManifest(manifest);
    const speakers = knownSpeakers ? [...knownSpeakers] : ['ALEX', 'SAM'];

    const markdown = renderEpisodeSkeleton({
        number,
        title,
        subtitle,
        showTitle: manifest.title || showId,
        speakers
    });
    fs.writeFileSync(filePath, markdown);

    episodes.push({ id: number, file: fileName, title, subtitle });
    episodes.sort((a, b) => (a.id || 0) - (b.id || 0));
    manifest.episodes = episodes;
    writeManifest(showId, manifest);

    // Sanity: the skeleton we just wrote must pass our own linter.
    const problems = lintEpisodeMarkdown(markdown, { knownSpeakers }).filter((i) => i.level === 'error');
    if (problems.length > 0) {
        console.warn(`⚠ Skeleton has lint errors (this is a bug in the wizard): ${problems[0].message}`);
    }

    console.log(`\n✓ Created shows/${showId}/${fileName}`);
    console.log(`✓ Registered episode ${number} in shows/${showId}/podcast.json`);
    console.log('\nNext steps:');
    console.log(`  1. Write the episode:      ../shows/${showId}/${fileName}`);
    console.log('  2. Lint it:                npm run validate');
    console.log(`  3. Generate + build:       npm run publish-episode -- ${showId} ${number}`);
}

main()
    .catch((err) => {
        console.error(err.stack || err.message);
        process.exitCode = 1;
    })
    .finally(() => rl.close());
