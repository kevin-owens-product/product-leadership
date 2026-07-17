// Shared validation + parsing helpers for the episode authoring pipeline.
//
// Pure functions only — no filesystem access — so they can be unit-tested
// with fixture strings. The CLI wrapper (cli/validate.js) wires these up to
// real shows/ and audio/ directories, and build-episodes.js runs the same
// checks at the start of every build.
//
// The regexes here intentionally mirror the parsers in
// ../tools/generate-audio-supertonic.js and build-episodes.js: the point of
// the linter is to flag lines that those parsers would silently drop or
// misread.

import { createRequire } from 'node:module';
import { parseMarkdown } from '../src/parse/dialogue.js';

// The music cues' lengths are owned by the synthesizer that renders them, so
// the estimate here can't drift from the real audio. CommonJS, hence require.
const { MUSIC_CUE_SECONDS } = createRequire(import.meta.url)('../../tools/cue-music.js');

export const BOLD_SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
export const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
export const VALID_CUE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s*[-:]\s*[^\]]+)?\]$/i;
export const DURATION_HEADER_RE = /^\*\*Duration:\*\*\s*~?\s*\d+(?:\.\d+)?\s*minutes?/im;

export const CUE_SECONDS = {
    'PAUSE': 0.8,
    'LONG PAUSE': 1.8,
    'SFX': 0.7,
    'SOUND': 0.7,
    'AMBIENCE': 1.0,
    'AMBIENT BED': 1.0,
    ...MUSIC_CUE_SECONDS
};

// First words of valid cue tags — used to spot near-miss cues like
// [PAUSE FOR EFFECT] or [MUSIC SWELLS] that the pipeline would drop silently.
const CUE_HEAD_WORDS = new Set([
    'PAUSE', 'LONG', 'MUSIC', 'INTRO', 'OUTRO', 'SFX', 'SOUND', 'AMBIENCE', 'AMBIENT'
]);

// Supertonic 3 inline expression tags — must mirror EXPRESSION_TAGS in
// ../../tools/generate-audio-supertonic.js. Unknown <angle> tokens are
// stripped by the generator (never read aloud), but they're almost always
// typos, so lint them.
export const EXPRESSION_TAGS = new Set(['laugh', 'breath', 'sigh']);
const ANGLE_TAG_RE = /<\s*([a-zA-Z_]+)\s*>/g;

const BOLD_COLON_OUTSIDE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*)\*\*\s*:/;
const PLAIN_SPEAKER_RE = /^([A-Z][A-Z0-9 '&()./-]*):\s+\S/;
const BARE_BRACKET_LINE_RE = /^\[([^\]]*)\]$/;

function issue(line, level, message) {
    return { line, level, message };
}

/**
 * Lint one episode Markdown document.
 *
 * @param {string} markdown
 * @param {object} [opts]
 * @param {Set<string>|null} [opts.knownSpeakers] Uppercased speaker labels
 *   from the show's podcast.json voiceMap. When null/empty, speaker-identity
 *   checks are skipped (shows without a voiceMap use voice fallback).
 * @returns {{line:number, level:'error'|'warning', message:string}[]}
 */
export function lintEpisodeMarkdown(markdown, { knownSpeakers = null } = {}) {
    const issues = [];
    const speakers = knownSpeakers && knownSpeakers.size > 0
        ? new Set([...knownSpeakers].map((s) => s.toUpperCase()))
        : null;
    const lines = String(markdown).split('\n');
    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
        const lineNo = i + 1;
        let trimmed = lines[i].trim();
        if (!trimmed) continue;

        // Skip HTML comments (the wizard emits a cue-reference comment).
        if (inComment) {
            if (trimmed.includes('-->')) inComment = false;
            continue;
        }
        if (trimmed.startsWith('<!--')) {
            if (!trimmed.includes('-->')) inComment = true;
            continue;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue;

        // Unclosed bracket tag — parser would misread or drop the line.
        if (trimmed.startsWith('[') && !trimmed.includes(']')) {
            issues.push(issue(lineNo, 'error', `unclosed "[" — cue or speaker tag is never closed`));
            continue;
        }

        // Expression tags: <laugh>/<breath>/<sigh> pass through to the TTS;
        // anything else in <angle> brackets is stripped by the generator, so
        // an unknown tag is almost certainly a typo that silently disappears.
        for (const tagMatch of trimmed.matchAll(ANGLE_TAG_RE)) {
            const tag = tagMatch[1];
            if (!EXPRESSION_TAGS.has(tag.toLowerCase())) {
                issues.push(issue(lineNo, 'error',
                    `unknown expression tag "<${tag}>" — valid tags: ${[...EXPRESSION_TAGS].map((t) => `<${t}>`).join(' ')} (unknown tags are stripped from the audio)`));
            } else if (tag !== tag.toLowerCase()) {
                issues.push(issue(lineNo, 'warning',
                    `expression tag "<${tag}>" should be lowercase "<${tag.toLowerCase()}>" (the generator normalizes it, but keep sources consistent)`));
            }
        }

        // Bare bracket-only line: either a timed cue or a (skipped) stage direction.
        const bare = trimmed.match(BARE_BRACKET_LINE_RE);
        if (bare) {
            if (VALID_CUE_RE.test(trimmed)) continue;
            const inner = bare[1].trim();
            const head = inner.split(/\s+/)[0].toUpperCase();
            if (inner && inner === inner.toUpperCase() && CUE_HEAD_WORDS.has(head)) {
                issues.push(issue(lineNo, 'error',
                    `malformed cue tag "[${inner}]" — not a recognized cue (valid: ${Object.keys(CUE_SECONDS).map((c) => `[${c}]`).join(' ')})`));
            } else if (inner && inner === inner.toUpperCase()) {
                issues.push(issue(lineNo, 'warning',
                    `"[${inner}]" is not a recognized cue — it will be skipped as a stage direction (no pause in the audio)`));
            }
            continue;
        }

        // **NAME**: text — colon outside the bold markers, silently dropped by TTS.
        const colonOutside = trimmed.match(BOLD_COLON_OUTSIDE_RE);
        if (colonOutside && !BOLD_SPEAKER_LINE_RE.test(trimmed)) {
            issues.push(issue(lineNo, 'error',
                `speaker label "**${colonOutside[1]}**:" has the colon outside the bold markers — write "**${colonOutside[1]}:**"`));
            continue;
        }

        const speakerMatch = trimmed.match(BOLD_SPEAKER_LINE_RE) || trimmed.match(BRACKET_SPEAKER_LINE_RE);
        if (speakerMatch) {
            const name = speakerMatch[1].trim().toUpperCase();
            if (speakers && !speakers.has(name)) {
                issues.push(issue(lineNo, 'error',
                    `unknown speaker "${speakerMatch[1].trim()}" — not in podcast.json voiceMap (known: ${[...speakers].join(', ')})`));
            }
            continue;
        }

        // ALEX: text — plain speaker label missing the bold markers.
        const plain = trimmed.match(PLAIN_SPEAKER_RE);
        if (plain && speakers && speakers.has(plain[1].trim().toUpperCase())) {
            issues.push(issue(lineNo, 'warning',
                `speaker line for "${plain[1].trim()}" is missing bold markers — write "**${plain[1].trim()}:** …"`));
        }
    }

    if (!DURATION_HEADER_RE.test(markdown)) {
        issues.push(issue(1, 'warning',
            'missing "**Duration:** ~NN minutes" header — episode length will be estimated from word count until audio is generated'));
    }

    // No voiceMap means the generator falls back to alternating M1/F1 by order
    // of first appearance (see pickVoice in ../tools/generate-audio-supertonic.js),
    // which silently hands speakers 1 and 3 the same voice. Two-hander shows —
    // most of the catalog — are unaffected, so only warn once it actually bites.
    if (!speakers) {
        const seen = [];
        for (const line of String(markdown).split('\n')) {
            const m = line.match(BOLD_SPEAKER_LINE_RE) || line.match(BRACKET_SPEAKER_LINE_RE);
            const name = m && m[1].toUpperCase();
            if (name && !seen.includes(name)) seen.push(name);
        }
        if (seen.length > 2) {
            const collisions = seen
                .map((name, i) => ({ name, voice: i % 2 === 0 ? 'M1' : 'F1' }))
                .filter((_, i) => i >= 2)
                .map(({ name, voice }) => `${name} reuses ${voice}`);
            issues.push(issue(1, 'warning',
                `${seen.length} speakers but no voiceMap in podcast.json — voices alternate M1/F1 by order of appearance, so ${collisions.join(', ')}; add a voiceMap to give each speaker a distinct voice`));
        }
    }

    return issues;
}

/**
 * Check a show's podcast.json for internal consistency.
 *
 * @param {object} manifest Parsed podcast.json.
 * @param {object} opts
 * @param {(file:string)=>boolean} opts.fileExists Existence check for episode
 *   files, relative to the show directory.
 * @returns {{level:'error'|'warning', message:string}[]}
 */
export function checkShowManifest(manifest, { fileExists }) {
    const issues = [];
    if (!manifest || typeof manifest !== 'object') {
        return [{ level: 'error', message: 'podcast.json is not an object' }];
    }
    if (!manifest.id || typeof manifest.id !== 'string') {
        issues.push({ level: 'error', message: 'missing "id" field' });
    }
    if (!manifest.title || typeof manifest.title !== 'string') {
        issues.push({ level: 'error', message: 'missing "title" field' });
    }
    if (!Array.isArray(manifest.episodes)) {
        issues.push({ level: 'error', message: 'missing "episodes" array' });
        return issues;
    }

    const seenIds = new Set();
    const seenFiles = new Set();
    for (const ep of manifest.episodes) {
        const label = `episode ${ep && ep.id != null ? ep.id : '?'}`;
        if (!ep || typeof ep !== 'object') {
            issues.push({ level: 'error', message: 'episodes[] contains a non-object entry' });
            continue;
        }
        if (typeof ep.id !== 'number') {
            issues.push({ level: 'error', message: `${label}: missing numeric "id"` });
        } else if (seenIds.has(ep.id)) {
            issues.push({ level: 'error', message: `duplicate episode id ${ep.id}` });
        } else {
            seenIds.add(ep.id);
        }
        if (!ep.file || typeof ep.file !== 'string') {
            issues.push({ level: 'error', message: `${label}: missing "file"` });
            continue;
        }
        if (seenFiles.has(ep.file)) {
            issues.push({ level: 'error', message: `duplicate episode file "${ep.file}"` });
        } else {
            seenFiles.add(ep.file);
        }
        if (!fileExists(ep.file)) {
            issues.push({ level: 'error', message: `${label}: file "${ep.file}" not found in show directory` });
        }
        if (!ep.title) {
            issues.push({ level: 'warning', message: `${label}: missing "title"` });
        }
    }
    issues.push(...checkVoiceMap(manifest.voiceMap));
    return issues;
}

/**
 * Two speakers sharing a voice makes them indistinguishable in the audio, and
 * nothing downstream complains: the generator happily renders both, so the
 * first sign is a listener unable to tell who is talking.
 */
function checkVoiceMap(voiceMap) {
    if (!voiceMap || typeof voiceMap !== 'object') return [];
    const byVoice = new Map();
    for (const [speaker, voice] of Object.entries(voiceMap)) {
        if (!voice) continue;
        const key = String(voice).toUpperCase();
        if (!byVoice.has(key)) byVoice.set(key, []);
        byVoice.get(key).push(speaker.toUpperCase());
    }
    const issues = [];
    for (const [voice, speakers] of byVoice) {
        if (speakers.length > 1) {
            issues.push({
                level: 'warning',
                message: `voiceMap gives ${speakers.join(' and ')} the same voice (${voice}) — they will be indistinguishable in the audio; assign distinct voices unless that is deliberate`
            });
        }
    }
    return issues;
}

// startTime is written from an unrounded cumulative sum while each stored
// duration is rounded to 3 decimals, so a recomputed timeline can drift a few
// ms per line. Anything beyond this is real corruption (edited manifest,
// re-rendered lines without a backfill, mixed wav/mp3 probes).
const START_TIME_TOLERANCE_SECONDS = 0.5;

/**
 * Check one generated audio manifest (audio/<show>/<episode>/manifest.json)
 * against the audio files that sit next to it.
 *
 * @param {Array} items Parsed manifest.json contents.
 * @param {object} opts
 * @param {(file:string)=>boolean} opts.fileExists Existence check relative to
 *   the episode audio directory.
 * @param {number|null} [opts.combinedDurationSeconds] ffprobe'd duration of
 *   combined.mp3, when available, for drift detection.
 * @returns {{level:'error'|'warning', message:string}[]}
 */
export function checkAudioManifest(items, { fileExists, combinedDurationSeconds = null } = {}) {
    if (!Array.isArray(items) || items.length === 0) {
        return [{ level: 'error', message: 'audio manifest is empty or not an array' }];
    }
    const issues = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object' || !item.file) {
            issues.push({ level: 'error', message: `item ${i}: missing "file" field` });
            continue;
        }
        if (!fileExists(item.file)) {
            issues.push({ level: 'error', message: `item ${i}: audio file "${item.file}" is missing` });
        }
    }

    const timed = items.filter((it) => typeof it.duration === 'number' && typeof it.startTime === 'number');
    if (timed.length < items.length) {
        issues.push({
            level: 'warning',
            message: `${items.length - timed.length} of ${items.length} item(s) missing duration/startTime — run tools/backfill-manifest-durations.js (or npm run publish-episode)`
        });
    } else {
        let cumulative = 0;
        for (let i = 0; i < items.length; i++) {
            const drift = Math.abs(items[i].startTime - cumulative);
            if (drift > START_TIME_TOLERANCE_SECONDS) {
                issues.push({
                    level: 'error',
                    message: `item ${i}: startTime drift of ${drift.toFixed(2)}s (manifest says ${items[i].startTime}s, cumulative durations say ${cumulative.toFixed(3)}s) — re-run the duration backfill`
                });
                break;
            }
            cumulative += items[i].duration;
        }

        if (combinedDurationSeconds != null) {
            const last = items[items.length - 1];
            const total = last.startTime + last.duration;
            const tolerance = Math.max(3, total * 0.02);
            const drift = Math.abs(combinedDurationSeconds - total);
            if (drift > tolerance) {
                issues.push({
                    level: 'error',
                    message: `combined.mp3 is ${combinedDurationSeconds.toFixed(1)}s but the manifest timeline totals ${total.toFixed(1)}s (drift ${drift.toFixed(1)}s) — regenerate audio or re-run the backfill`
                });
            }
        }
    }

    return issues;
}

/**
 * Parse an episode Markdown document into the same dialogue/cue event stream
 * that ../tools/generate-audio-supertonic.js renders. Used by
 * publish-episode to report how many lines are already cached.
 */
export function parseEpisodeEvents(markdown) {
    const lines = String(markdown).split('\n');
    const events = [];
    let chapter = 'INTRO';
    let lastSpeaker = null;
    let lastSpeakerLine = -2;

    const cleanText = (text) => text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('### ')) {
            chapter = trimmed.replace(/^###\s+/, '').trim();
            continue;
        }
        if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue;
        if (VALID_CUE_RE.test(trimmed)) {
            const cue = trimmed.match(VALID_CUE_RE)[1].toUpperCase();
            events.push({ type: 'cue', cue, duration: CUE_SECONDS[cue] || 0.8, chapter, rawLine: i });
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

/** Uppercased speaker labels from a show manifest's voiceMap, or null. */
export function knownSpeakersFromManifest(manifest) {
    if (!manifest || !manifest.voiceMap || typeof manifest.voiceMap !== 'object') return null;
    const keys = Object.keys(manifest.voiceMap);
    if (keys.length === 0) return null;
    return new Set(keys.map((k) => k.toUpperCase()));
}

/**
 * Mirror of the player's audio-attachment logic (src/playback/manifest.js):
 * dialogue lines match manifest entries by rawLine, with a positional
 * fallback when nothing matches by rawLine but the counts line up. When
 * neither works, the affected lines play NO audio — the usual cause is a
 * manifest generated from an older draft of the markdown.
 */
// Normalize for comparison only. The manifest stores the raw script text while
// the player's parser strips expression tags and markdown syntax, so the two
// legitimately differ on characters that never reach the ear.
function comparableText(text) {
    return String(text || '')
        .replace(/<(?:laugh|breath|sigh)>/gi, '')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .slice(0, 40);
}

// Every line matching *something* is not the same as matching the RIGHT thing.
// Insert a line into the markdown of an already-rendered episode and, because
// dialogue sits on an even line grid, each line still resolves — to its
// neighbour's audio. Lookups all succeed, so a presence-only check reports a
// clean bill of health while the whole episode plays one line out of step.
function checkMatchedTextAgrees(dialogue, byRaw) {
    let wrong = 0;
    let example = null;
    for (const line of dialogue) {
        const item = byRaw.get(line.rawLine);
        if (!item || !item.text || !line.text) continue;
        const want = comparableText(line.text);
        const got = comparableText(item.text);
        if (!want || !got || want === got) continue;
        wrong += 1;
        if (!example) example = { want: line.text.slice(0, 45), got: item.text.slice(0, 45) };
    }
    if (wrong === 0) return [];
    return [{
        level: 'error',
        message: `AUDIO PLAYS THE WRONG LINE: ${wrong} of ${dialogue.length} dialogue lines resolve to a manifest entry whose text differs — the markdown was edited after the audio was generated, shifting line numbers. Transcript "${example.want}…" would play "${example.got}…". Regenerate this episode's audio (or undo the line shift).`
    }];
}

export function checkManifestAlignment(markdown, items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    // Playability is decided by the PLAYER's parser (src/parse/dialogue.js),
    // not the generator-mirror parser used elsewhere in this file — the two
    // can disagree by a line on older scripts, and the player is the truth
    // for whether audio attaches.
    const dialogue = parseMarkdown(markdown);
    if (dialogue.length === 0) return [];

    const byRaw = new Map(
        items.filter((it) => typeof it.rawLine === 'number').map((it) => [it.rawLine, it])
    );
    const matched = dialogue.filter((l) => byRaw.has(l.rawLine)).length;
    if (matched === dialogue.length) return checkMatchedTextAgrees(dialogue, byRaw);

    const nonCue = items.filter((it) => it.type !== 'cue').length;
    const positionalOk = matched === 0 &&
        (nonCue === dialogue.length || items.length === dialogue.length);
    if (positionalOk) {
        return [{
            level: 'warning',
            message: `manifest predates rawLine matching but counts align (${dialogue.length} lines) — positional fallback works today, but any markdown edit will silently break it; regenerate to future-proof`
        }];
    }
    if (matched === 0) {
        return [{
            level: 'warning',
            message: `AUDIO WILL NOT PLAY: 0 of ${dialogue.length} dialogue lines match the manifest (${items.length} entries) and counts differ, so the positional fallback is unavailable — the manifest was generated from an older draft; regenerate this episode's audio`
        }];
    }
    return [{
        level: 'warning',
        message: `${dialogue.length - matched} of ${dialogue.length} dialogue lines have no matching audio and will be skipped during playback — markdown and manifest have drifted; regenerate this episode's audio`
    }];
}
