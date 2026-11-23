import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const pwa = fileURLToPath(new URL('../../', import.meta.url));

function buildFixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podlearn-build-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const work = path.join(root, 'pwa');
    fs.mkdirSync(work);
    for (const file of ['package.json', 'build-episodes.js', 'cli', 'src/parse']) {
        fs.cpSync(path.join(pwa, file), path.join(work, file), { recursive: true });
    }
    fs.symlinkSync(path.join(pwa, '../tools'), path.join(root, 'tools'), 'dir');

    function write(file, contents) {
        const dest = path.join(root, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, contents);
    }

    function build() {
        return execFileSync(process.execPath, ['build-episodes.js'], { cwd: work, stdio: 'pipe' });
    }
    return { root, work, write, build };
}

const frame = Buffer.alloc(417);
frame.set([0xff, 0xfb, 0x90, 0xc4]); // MPEG-1 Layer III, 128 kbps, 44.1 kHz mono
const recording = Buffer.concat(Array(6).fill(frame));
const chunk = { file: '0000.mp3', type: 'dialogue', text: 'Hello.', speaker: 'ALEX', rawLine: 0, startTime: 0, duration: 0.156 };

test('publishing one local render preserves other shipped episodes', (t) => {
    const { work, write, build } = buildFixture(t);
    const episodes = ['one','two'].map((name, i) => ({ id: i + 1, title: name, file: name + '.md' }));
    write('shows/show/podcast.json', JSON.stringify({ id: 'show', title: 'Show', episodes }));
    for (const ep of episodes) write('shows/show/' + ep.file, '**ALEX:** Hello.\n');
    write('pwa/audio/show/one/manifest.json', JSON.stringify([chunk]));
    write('pwa/audio/show/one/0000.mp3', recording);
    write('pwa/dist/audio/show/one/0001.mp3', 'superseded chunk');
    write('pwa/dist/audio/show/one/combined.mp3', 'superseded enclosure');
    write('pwa/dist/audio/show/two/manifest.json', JSON.stringify([chunk]));
    write('pwa/dist/audio/show/two/combined.mp3', recording);
    write('pwa/dist/audio/show/retired/combined.mp3', 'removed from the catalog');

    build();
    const dist = path.join(work, 'dist');
    assert.deepEqual(fs.readFileSync(path.join(dist, 'audio/show/one/0000.mp3')), recording);
    assert.equal(fs.existsSync(path.join(dist, 'audio/show/one/0001.mp3')), false);
    assert.deepEqual(fs.readFileSync(path.join(dist, 'audio/show/two/combined.mp3')), recording);
    assert.equal(fs.existsSync(path.join(dist, 'audio/show/retired')), false);

    const library = {};
    new Function('window', fs.readFileSync(path.join(dist, 'podcasts.js'), 'utf8'))(library);
    const [show] = library.PODCASTS;
    const [first, second] = show.episodes;
    assert.equal(first.content, undefined);
    assert.ok(first.transcriptHash);
    assert.equal(fs.readFileSync(path.join(dist, 'transcripts/show/one.md'), 'utf8'), '**ALEX:** Hello.\n');
    assert.equal(first.audioBytes, undefined, 'a chunk-only render must not retain an old enclosure');
    assert.equal(second.audioBytes, recording.length);
    const feed = fs.readFileSync(path.join(dist, show.feedUrl), 'utf8');
    assert.match(feed, /audio\/show\/two\/combined\.mp3/);
    assert.doesNotMatch(feed, /audio\/show\/one\/combined\.mp3/);

    // The previous release compares data.version to its stored version and
    // deletes all caches on a mismatch. Keep that upgrade path non-destructive.
    const metadata = JSON.parse(fs.readFileSync(path.join(dist, 'version.json')));
    assert.ok(metadata.buildVersion);
    const lastSeen = '2.3.0+old';
    const seenByLegacyClient = typeof metadata.version === 'string' && metadata.version.trim()
        ? metadata.version.trim() : lastSeen;
    assert.equal(seenByLegacyClient, lastSeen);
});


test('a WAV-only render ships its declared clips and a bad retained release blocks replacement', t => {
    const { work, write, build } = buildFixture(t);
    const episodes = ['wav', 'retained', 'script-only'].map((name, i) => ({ id: i + 1, title: name, file: name + '.md' }));
    write('shows/show/podcast.json', JSON.stringify({ id: 'show', title: 'Show', episodes }));
    for (const ep of episodes) write('shows/show/' + ep.file, '**ALEX:** Hello.\n');
    write('pwa/dist/audio/show/wav/combined.mp3', recording);
    const retained = 'pwa/dist/audio/show/retained/';
    write(retained + 'manifest.json', '{malformed');
    const local = 'pwa/audio/show/wav/';
    write(local + 'manifest.json', JSON.stringify([{ ...chunk, file: '0000.wav' }]));
    const wav = Buffer.alloc(44 + 1600);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(1600, 40);
    write(local + '0000.wav', wav);
    write(local + '0002.mp3', 'stale unreferenced clip');

    const output = path.join(work, 'dist/audio/show/wav');
    assert.throws(build, /Validation failed/);
    assert.deepEqual(fs.readFileSync(path.join(output, 'combined.mp3')), recording);
    write(retained + 'manifest.json', JSON.stringify([chunk]));
    assert.throws(build, /Validation failed/, 'a retained chunk-only release needs playable chunks');
    write(retained + '0000.mp3', recording);
    build();
    assert.deepEqual(fs.readdirSync(output).sort(), ['0000.wav', 'manifest.json']);
    assert.deepEqual(fs.readFileSync(path.join(output, '0000.wav')), wav);
});
