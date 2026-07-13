import test from 'node:test';
import assert from 'node:assert/strict';

import {
    parseMarkdown,
    parseSpeakerVoiceMap,
    cleanText,
    alignChapterLineIndexes,
    isContinuationDialogueLine
} from '../../src/parse/dialogue.js';

test('parseMarkdown extracts speaker lines with alternating voices', () => {
    const md = [
        '# Episode 1',
        '',
        '**ALEX:** Hello there.',
        '**SAM:** Hi back at you.',
        '**ALEX:** Second line.'
    ].join('\n');
    const dialogue = parseMarkdown(md);
    assert.equal(dialogue.length, 3);
    assert.deepEqual(dialogue.map((l) => l.speaker), ['ALEX', 'SAM', 'ALEX']);
    assert.deepEqual(dialogue.map((l) => l.type), ['alex', 'sam', 'alex']);
    assert.equal(dialogue[0].rawLine, 2);
});

test('parseMarkdown honors voice overrides', () => {
    const md = '**HOST:** Welcome.\n**GUEST:** Thanks.';
    const dialogue = parseMarkdown(md, { HOST: 'sam', GUEST: 'alex' });
    assert.deepEqual(dialogue.map((l) => l.type), ['sam', 'alex']);
});

test('parseMarkdown skips cues, headings, and metadata labels', () => {
    const md = [
        '**HOST:** Before the cue.',
        '[PAUSE]',
        '[MUSIC STING - dramatic]',
        '## Section',
        '**Duration:**',
        '**HOST:** After the cue.'
    ].join('\n');
    const dialogue = parseMarkdown(md);
    assert.deepEqual(dialogue.map((l) => l.text), ['Before the cue.', 'After the cue.']);
});

test('parseMarkdown attaches continuation lines to the previous speaker', () => {
    const md = [
        '**HOST:** First sentence.',
        'And a continuation line.',
        '',
        '**GUEST:** New speaker.'
    ].join('\n');
    const dialogue = parseMarkdown(md);
    assert.equal(dialogue.length, 3);
    assert.equal(dialogue[1].speaker, 'HOST');
    assert.equal(dialogue[1].text, 'And a continuation line.');
    assert.equal(dialogue[1].type, dialogue[0].type);
});

test('parseMarkdown supports the bracket audio-drama speaker format', () => {
    const dialogue = parseMarkdown('[NARRATOR] It was a dark night.');
    assert.equal(dialogue.length, 1);
    assert.equal(dialogue[0].speaker, 'NARRATOR');
});

test('parseSpeakerVoiceMap parses assignments in several syntaxes', () => {
    const md = '**Speaker Voices:** HOST=alex; GUEST -> sam, Producer: alex';
    assert.deepEqual(parseSpeakerVoiceMap(md), {
        HOST: 'alex',
        GUEST: 'sam',
        PRODUCER: 'alex'
    });
    assert.deepEqual(parseSpeakerVoiceMap('no map here'), {});
});

test('cleanText strips markdown emphasis, code, and link targets', () => {
    assert.equal(cleanText('**bold** and *italic* and `code`'), 'bold and italic and code');
    assert.equal(cleanText('see [the docs](https://example.com) now'), 'see the docs now');
});

test('cleanText strips TTS expression tags from transcript display', () => {
    assert.equal(cleanText('<laugh> That is wild. <breath> Let me think.'), 'That is wild. Let me think.');
    assert.equal(cleanText('Mid<sigh>sentence tag'), 'Mid sentence tag');
    assert.equal(cleanText('Unknown <mystery_tag> is also hidden'), 'Unknown is also hidden');
});

test('isContinuationDialogueLine rejects structural markdown', () => {
    assert.equal(isContinuationDialogueLine('plain prose'), true);
    for (const line of ['', '# h', '| cell', '- item', '*em', '---']) {
        assert.equal(isContinuationDialogueLine(line), false, JSON.stringify(line));
    }
});

test('alignChapterLineIndexes maps chapters to following dialogue lines, monotonically', () => {
    const chapters = [
        { rawLine: 0, lineIndex: 0 },
        { rawLine: 4, lineIndex: 0 },
        { rawLine: 10, lineIndex: 0 }
    ];
    const lines = [
        { rawLine: 1 },
        { rawLine: 2 },
        { rawLine: 6 },
        { rawLine: 12 }
    ];
    alignChapterLineIndexes(chapters, lines);
    assert.deepEqual(chapters.map((c) => c.lineIndex), [0, 2, 3]);

    // Empty dialogue: everything pins to 0.
    const chapters2 = [{ rawLine: 0, lineIndex: 5 }, { rawLine: 3, lineIndex: 7 }];
    alignChapterLineIndexes(chapters2, []);
    assert.deepEqual(chapters2.map((c) => c.lineIndex), [0, 0]);
});
