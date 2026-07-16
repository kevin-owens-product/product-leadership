import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { isMusicCue, renderCueWav, themeForShow, MUSIC_CUE_SECONDS } = require(
    path.join(__dirname, '../../../tools/cue-music.js')
);
const { CUE_SECONDS } = await import('../../cli/validate-lib.js');

// Music cues must land in the same WAV framing as the TTS and silence clips —
// ffmpeg's concat demuxer joins them without re-encoding, so a mismatched
// sample rate or channel count would corrupt combined.mp3.
const SAMPLE_RATE = 44100;

function readWavHeader(file) {
    const buf = fs.readFileSync(file);
    return {
        riff: buf.toString('ascii', 0, 4),
        wave: buf.toString('ascii', 8, 12),
        audioFormat: buf.readUInt16LE(20),
        channels: buf.readUInt16LE(22),
        sampleRate: buf.readUInt32LE(24),
        bitsPerSample: buf.readUInt16LE(34),
        dataSize: buf.readUInt32LE(40),
        declaredSize: buf.readUInt32LE(4),
        byteLength: buf.length,
    };
}

function tmpWav(name) {
    return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-music-')), name);
}

test('isMusicCue matches only the musical cues', () => {
    for (const cue of ['INTRO MUSIC', 'OUTRO MUSIC', 'MUSIC STING', 'MUSIC FADE', 'MUSIC FADES']) {
        assert.equal(isMusicCue(cue), true, `${cue} should be musical`);
    }
    // Lowercase reaches here from the case-insensitive cue regex.
    assert.equal(isMusicCue('intro music'), true);
    for (const cue of ['PAUSE', 'LONG PAUSE', 'SFX', 'SOUND', 'AMBIENCE', 'AMBIENT BED']) {
        assert.equal(isMusicCue(cue), false, `${cue} should stay silent`);
    }
});

test('rendered cues are mono 16-bit 44.1kHz PCM with a consistent header', () => {
    for (const cue of ['INTRO MUSIC', 'OUTRO MUSIC', 'MUSIC STING', 'MUSIC FADES']) {
        const out = tmpWav(`${cue.replace(/\s+/g, '-')}.wav`);
        renderCueWav(out, cue, 'the-influence-brief');
        const h = readWavHeader(out);
        assert.equal(h.riff, 'RIFF');
        assert.equal(h.wave, 'WAVE');
        assert.equal(h.audioFormat, 1, 'must be uncompressed PCM');
        assert.equal(h.channels, 1);
        assert.equal(h.sampleRate, SAMPLE_RATE);
        assert.equal(h.bitsPerSample, 16);
        assert.equal(h.dataSize, h.byteLength - 44, 'data chunk size must match payload');
        assert.equal(h.declaredSize, h.byteLength - 8, 'RIFF size must match payload');
    }
});

test('cue lengths are plausible and ordered intro < outro, sting shortest', () => {
    const seconds = (cue) => {
        const out = tmpWav('len.wav');
        renderCueWav(out, cue, 'the-decision-room');
        const h = readWavHeader(out);
        return h.dataSize / 2 / SAMPLE_RATE;
    };
    const sting = seconds('MUSIC STING');
    const intro = seconds('INTRO MUSIC');
    const outro = seconds('OUTRO MUSIC');
    assert.ok(sting > 0.5 && sting < 3, `sting ${sting}s out of range`);
    assert.ok(intro > 2 && intro < 8, `intro ${intro}s out of range`);
    assert.ok(outro > 2 && outro < 10, `outro ${outro}s out of range`);
    assert.ok(sting < intro, 'sting should be shorter than intro');
    assert.ok(intro < outro, 'outro should ring out longest');
});

test('audio stays below full scale and is not silent', () => {
    const out = tmpWav('level.wav');
    renderCueWav(out, 'INTRO MUSIC', 'the-influence-brief');
    const buf = fs.readFileSync(out);
    let peak = 0;
    let energy = 0;
    for (let i = 44; i + 1 < buf.length; i += 2) {
        const s = Math.abs(buf.readInt16LE(i)) / 32767;
        peak = Math.max(peak, s);
        energy += s;
    }
    assert.ok(peak > 0.05, 'cue must not be silence');
    // Normalized to 0.3 peak so music sits under speech; never clips.
    assert.ok(peak < 0.95, `peak ${peak} too hot`);
    assert.ok(energy / ((buf.length - 44) / 2) > 0.001, 'cue must carry sustained signal');
});

test('themes are deterministic per show', () => {
    const a1 = themeForShow('the-influence-brief');
    const a2 = themeForShow('the-influence-brief');
    assert.deepEqual(a1, a2, 'same show must regenerate an identical theme');

    // Identical bytes on re-render — regeneration must not churn git history.
    const first = tmpWav('a.wav');
    const second = tmpWav('b.wav');
    renderCueWav(first, 'MUSIC STING', 'the-harness');
    renderCueWav(second, 'MUSIC STING', 'the-harness');
    assert.deepEqual(fs.readFileSync(first), fs.readFileSync(second));
});

test('shows sharing a hashed root still render distinct cues', () => {
    // Only 5 roots exist, so collisions are normal — the cue itself must still
    // differ. Seeding the pluck bursts off rootHz alone made these identical.
    const a = themeForShow('ap-finance-mastery');
    const b = themeForShow('claude-code-mastery');
    assert.equal(a.rootHz, b.rootHz, 'fixture assumes these two collide on root');

    const wavA = tmpWav('collide-a.wav');
    const wavB = tmpWav('collide-b.wav');
    renderCueWav(wavA, 'INTRO MUSIC', 'ap-finance-mastery');
    renderCueWav(wavB, 'INTRO MUSIC', 'claude-code-mastery');
    assert.notDeepEqual(
        fs.readFileSync(wavA),
        fs.readFileSync(wavB),
        'two shows on the same root must not share an identical cue'
    );
});

test('declared cue lengths match what actually renders', () => {
    // The linter's pre-audio estimate and the generator's cue table both read
    // MUSIC_CUE_SECONDS. If a cue's layout changes without updating it, the
    // estimate silently lies about every episode that uses the cue.
    for (const [cue, declared] of Object.entries(MUSIC_CUE_SECONDS)) {
        const out = tmpWav('declared.wav');
        renderCueWav(out, cue, 'the-influence-brief');
        const actual = readWavHeader(out).dataSize / 2 / SAMPLE_RATE;
        assert.ok(
            Math.abs(actual - declared) < 0.01,
            `${cue}: declared ${declared}s but rendered ${actual.toFixed(3)}s`
        );
    }
});

test('the linter estimate inherits the rendered music lengths', () => {
    for (const [cue, seconds] of Object.entries(MUSIC_CUE_SECONDS)) {
        assert.equal(CUE_SECONDS[cue], seconds, `${cue} must not drift from the synth`);
    }
    // Silence cues stay owned by the linter.
    assert.equal(CUE_SECONDS['PAUSE'], 0.8);
    assert.equal(CUE_SECONDS['LONG PAUSE'], 1.8);
});

test('an unknown show still gets a usable theme', () => {
    const theme = themeForShow('a-show-that-does-not-exist-yet');
    assert.ok(theme.rootHz > 100 && theme.rootHz < 500, 'root should be a sane bass/mid pitch');
    assert.ok(Array.isArray(theme.motif) && theme.motif.length >= 3, 'needs a motif');
    assert.equal(theme.motif[0], 0, 'motif should start on the root');
    const out = tmpWav('unknown.wav');
    renderCueWav(out, 'INTRO MUSIC', 'a-show-that-does-not-exist-yet');
    assert.ok(readWavHeader(out).dataSize > 0);
});
