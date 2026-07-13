import test from 'node:test';
import assert from 'node:assert/strict';

import {
    lintEpisodeMarkdown,
    checkShowManifest,
    checkAudioManifest,
    checkManifestAlignment,
    parseEpisodeEvents,
    knownSpeakersFromManifest
} from '../../cli/validate-lib.js';
import { renderEpisodeSkeleton } from '../../cli/episode-template.js';

const SPEAKERS = new Set(['ALEX', 'RILEY']);

const errors = (issues) => issues.filter((i) => i.level === 'error');
const warnings = (issues) => issues.filter((i) => i.level === 'warning');

// --- lintEpisodeMarkdown -----------------------------------------------

test('clean episode markdown produces no issues', () => {
    const md = [
        '# Episode 1: Test',
        '## "Subtitle"',
        '',
        '**Duration:** ~30 minutes',
        '**Hosts:** Alex & Riley',
        '',
        '---',
        '',
        '### INTRO',
        '',
        '[INTRO MUSIC]',
        '',
        '**ALEX:** Welcome to the show.',
        '',
        '[PAUSE]',
        '',
        '**RILEY:** Great to be here.',
        ''
    ].join('\n');
    assert.deepEqual(lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS }), []);
});

test('unknown speaker is an error with the offending line number', () => {
    const md = '**Duration:** ~30 minutes\n\n**ALEX:** Hi.\n\n**BOB:** Who am I?\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 1);
    assert.equal(errors(issues)[0].line, 5);
    assert.match(errors(issues)[0].message, /unknown speaker "BOB"/);
});

test('bracket-format speaker lines are checked against the roster', () => {
    const md = '**Duration:** ~30 minutes\n\n[NARRATOR] It was a dark night.\n';
    const ok = lintEpisodeMarkdown(md, { knownSpeakers: new Set(['NARRATOR']) });
    assert.deepEqual(ok, []);
    const bad = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(bad).length, 1);
    assert.match(errors(bad)[0].message, /unknown speaker "NARRATOR"/);
});

test('speaker checks are skipped when there is no voiceMap roster', () => {
    const md = '**Duration:** ~30 minutes\n\n**ANYONE:** Hello.\n';
    assert.deepEqual(lintEpisodeMarkdown(md, { knownSpeakers: null }), []);
});

test('malformed cue tag near-miss is an error', () => {
    const md = '**Duration:** ~30 minutes\n\n[PAUSE FOR EFFECT]\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 1);
    assert.equal(errors(issues)[0].line, 3);
    assert.match(errors(issues)[0].message, /malformed cue tag/);
});

test('valid cues, including suffixed and lowercase forms, pass', () => {
    const md = [
        '**Duration:** ~30 minutes',
        '',
        '[PAUSE]',
        '[LONG PAUSE]',
        '[MUSIC STING - FADE TO SILENCE]',
        '[pause]',
        '[OUTRO MUSIC]'
    ].join('\n');
    assert.deepEqual(lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS }), []);
});

test('unrecognized all-caps bracket line warns about silent skipping', () => {
    const md = '**Duration:** ~30 minutes\n\n[APPLAUSE]\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 0);
    assert.equal(warnings(issues).length, 1);
    assert.match(warnings(issues)[0].message, /stage direction/);
});

test('unclosed bracket is an error', () => {
    const md = '**Duration:** ~30 minutes\n\n[PAUSE\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /unclosed/);
});

test('colon outside bold markers is an error', () => {
    const md = '**Duration:** ~30 minutes\n\n**ALEX**: Hello there.\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /colon outside the bold markers/);
});

test('plain speaker line missing bold markers is a warning', () => {
    const md = '**Duration:** ~30 minutes\n\nALEX: Forgot my bold.\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 0);
    assert.equal(warnings(issues).length, 1);
    assert.match(warnings(issues)[0].message, /missing bold markers/);
});

test('missing Duration header is a warning, not an error', () => {
    const md = '# Episode 1: Test\n\n**ALEX:** Hi.\n';
    const issues = lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS });
    assert.equal(errors(issues).length, 0);
    assert.equal(warnings(issues).length, 1);
    assert.match(warnings(issues)[0].message, /Duration/);
});

test('content inside HTML comments is ignored', () => {
    const md = [
        '**Duration:** ~30 minutes',
        '',
        '<!--',
        '[NOT A CUE',
        '**BOB:** Not real dialogue.',
        '[MUSIC SWELLS]',
        '-->',
        '',
        '**ALEX:** Real line.'
    ].join('\n');
    assert.deepEqual(lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS }), []);
});

// --- episode template ----------------------------------------------------

test('wizard skeleton passes the linter with zero issues', () => {
    const md = renderEpisodeSkeleton({
        number: 3,
        title: 'Testing the Wizard',
        subtitle: 'A subtitle',
        showTitle: 'My Show',
        speakers: ['ALEX', 'RILEY']
    });
    assert.deepEqual(lintEpisodeMarkdown(md, { knownSpeakers: SPEAKERS }), []);
    assert.match(md, /^# Episode 3: Testing the Wizard/);
    assert.match(md, /\*\*Duration:\*\*/);
    assert.match(md, /\*\*ALEX:\*\*/);
    assert.match(md, /\[OUTRO MUSIC\]/);
});

test('wizard skeleton parses into dialogue and cue events', () => {
    const md = renderEpisodeSkeleton({
        number: 1,
        title: 'Parse Me',
        showTitle: 'Show',
        speakers: ['SOLO']
    });
    const events = parseEpisodeEvents(md);
    assert.ok(events.some((e) => e.type === 'dialogue' && e.speaker === 'SOLO'));
    assert.ok(events.some((e) => e.type === 'cue' && e.cue === 'INTRO MUSIC'));
    // The format-reference comment must not leak events into the audio.
    assert.ok(events.every((e) => e.type !== 'dialogue' || e.speaker === 'SOLO'));
});

// --- checkShowManifest ----------------------------------------------------

test('show manifest with missing episode file is an error', () => {
    const manifest = {
        id: 's', title: 'S',
        episodes: [{ id: 1, file: 'missing.md', title: 'Ep' }]
    };
    const issues = checkShowManifest(manifest, { fileExists: () => false });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /"missing\.md" not found/);
});

test('duplicate episode ids and files are errors', () => {
    const manifest = {
        id: 's', title: 'S',
        episodes: [
            { id: 1, file: 'a.md', title: 'A' },
            { id: 1, file: 'a.md', title: 'B' }
        ]
    };
    const issues = checkShowManifest(manifest, { fileExists: () => true });
    assert.equal(errors(issues).length, 2);
});

test('valid show manifest passes', () => {
    const manifest = {
        id: 's', title: 'S',
        episodes: [{ id: 1, file: 'a.md', title: 'A' }]
    };
    assert.deepEqual(checkShowManifest(manifest, { fileExists: () => true }), []);
});

// --- checkAudioManifest -----------------------------------------------------

const timedItems = (durations) => {
    let cum = 0;
    return durations.map((d, i) => {
        const item = { index: i, file: `${String(i).padStart(4, '0')}.mp3`, duration: d, startTime: Number(cum.toFixed(3)) };
        cum += d;
        return item;
    });
};

test('consistent audio manifest passes', () => {
    const items = timedItems([10.5, 3.25, 7.8]);
    const issues = checkAudioManifest(items, { fileExists: () => true, combinedDurationSeconds: 21.6 });
    assert.deepEqual(issues, []);
});

test('missing audio file is an error', () => {
    const items = timedItems([10, 5]);
    const issues = checkAudioManifest(items, { fileExists: (f) => f !== '0001.mp3' });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /"0001\.mp3" is missing/);
});

test('startTime drift beyond tolerance is an error', () => {
    const items = timedItems([10, 5, 8]);
    items[2].startTime += 4; // corrupt the timeline
    const issues = checkAudioManifest(items, { fileExists: () => true });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /startTime drift/);
});

test('combined.mp3 duration drift is an error', () => {
    const items = timedItems([100, 100, 100]);
    const issues = checkAudioManifest(items, { fileExists: () => true, combinedDurationSeconds: 350 });
    assert.equal(errors(issues).length, 1);
    assert.match(errors(issues)[0].message, /combined\.mp3/);
});

test('items missing durations produce a backfill warning, not an error', () => {
    const items = [{ index: 0, file: '0000.mp3' }, { index: 1, file: '0001.mp3', duration: 2, startTime: 0 }];
    const issues = checkAudioManifest(items, { fileExists: () => true });
    assert.equal(errors(issues).length, 0);
    assert.equal(warnings(issues).length, 1);
    assert.match(warnings(issues)[0].message, /backfill/);
});

test('empty manifest is an error', () => {
    const issues = checkAudioManifest([], { fileExists: () => true });
    assert.equal(errors(issues).length, 1);
});

// --- parseEpisodeEvents / knownSpeakersFromManifest -----------------------

test('parseEpisodeEvents mirrors the TTS parser event stream', () => {
    const md = [
        '# Episode 1: T',
        '',
        '### INTRO (5 minutes)',
        '',
        '**ALEX:** First line.',
        '',
        '[PAUSE]',
        '',
        '**[STAGE DIRECTION]**',
        '',
        '[RILEY] Bracket-format line.',
        ''
    ].join('\n');
    const events = parseEpisodeEvents(md);
    assert.equal(events.length, 3);
    assert.deepEqual(events.map((e) => e.type), ['dialogue', 'cue', 'dialogue']);
    assert.equal(events[0].chapter, 'INTRO (5 minutes)');
    assert.equal(events[1].cue, 'PAUSE');
    assert.equal(events[2].speaker, 'RILEY');
});

test('expression tags: known pass, unknown error, wrong case warns', () => {
    const md = [
        '**Duration:** ~10 minutes',
        '',
        '**ALEX:** <laugh> That is wild. <breath> Let me think.',
        '',
        '**RILEY:** <luagh> Typo tag here.',
        '',
        '**ALEX:** <Sigh> Wrong case.',
        ''
    ].join('\n');
    const issues = lintEpisodeMarkdown(md, { speakers: SPEAKERS });
    const errs = errors(issues);
    const warns = warnings(issues);
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /unknown expression tag "<luagh>"/);
    assert.equal(warns.length, 1);
    assert.match(warns[0].message, /"<Sigh>" should be lowercase/);
});

test('checkManifestAlignment mirrors the player matching rules', () => {
    const md = [
        '**ALEX:** Line one.',
        '',
        '**RILEY:** Line two.',
        '',
        '**ALEX:** Line three.',
        ''
    ].join('\n');
    // rawLines of the three dialogue lines above are 0, 2, 4.

    // Perfect rawLine match — silent.
    assert.deepEqual(checkManifestAlignment(md, [
        { rawLine: 0, file: '0000.mp3' }, { rawLine: 2, file: '0001.mp3' }, { rawLine: 4, file: '0002.mp3' }
    ]), []);

    // No rawLines but counts align — positional fallback warning only.
    const positional = checkManifestAlignment(md, [
        { file: '0000.mp3' }, { file: '0001.mp3' }, { file: '0002.mp3' }
    ]);
    assert.equal(positional.length, 1);
    assert.match(positional[0].message, /positional fallback works today/);

    // Stale fragment manifest — zero matches, counts differ: will not play.
    const stale = checkManifestAlignment(md, [{ rawLine: 99, file: '0000.mp3' }]);
    assert.equal(stale.length, 1);
    assert.match(stale[0].message, /AUDIO WILL NOT PLAY/);

    // Partial drift — some lines matched, the rest skipped.
    const drift = checkManifestAlignment(md, [
        { rawLine: 0, file: '0000.mp3' }, { rawLine: 99, file: '0001.mp3' }
    ]);
    assert.equal(drift.length, 1);
    assert.match(drift[0].message, /2 of 3 dialogue lines have no matching audio/);
});

test('knownSpeakersFromManifest uppercases voiceMap keys and handles absence', () => {
    assert.equal(knownSpeakersFromManifest({}), null);
    assert.equal(knownSpeakersFromManifest({ voiceMap: {} }), null);
    const set = knownSpeakersFromManifest({ voiceMap: { Alex: 'M1', RILEY: 'F2' } });
    assert.deepEqual([...set].sort(), ['ALEX', 'RILEY']);
});
