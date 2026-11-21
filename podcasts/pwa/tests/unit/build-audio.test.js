import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const pwa = fileURLToPath(new URL('../../', import.meta.url));

test('publishing one local render preserves other shipped episodes', (t) => {
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

    const episodes = ['one','two'].map((name, i) => ({ id: i + 1, title: name, file: name + '.md' }));
    write('shows/show/podcast.json', JSON.stringify({ id: 'show', title: 'Show', episodes }));
    for (const ep of episodes) write('shows/show/' + ep.file, '**ALEX:** Hello.\n');
    write('pwa/audio/show/one/manifest.json', JSON.stringify([
        { file: '0000.mp3', type: 'dialogue', text: 'Hello.', speaker: 'ALEX', rawLine: 0, startTime: 0, duration: 1 }
    ]));
    write('pwa/audio/show/one/0000.mp3', 'new first episode');
    write('pwa/dist/audio/show/one/0001.mp3', 'superseded chunk');
    write('pwa/dist/audio/show/one/combined.mp3', 'superseded enclosure');
    write('pwa/dist/audio/show/two/combined.mp3', 'previously shipped second episode');
    write('pwa/dist/audio/show/retired/combined.mp3', 'removed from the catalog');

    execFileSync(process.execPath, ['build-episodes.js'], { cwd: work, stdio: 'pipe' });
    const dist = path.join(work, 'dist');
    assert.equal(fs.readFileSync(path.join(dist, 'audio/show/one/0000.mp3'), 'utf8'), 'new first episode');
    assert.equal(fs.existsSync(path.join(dist, 'audio/show/one/0001.mp3')), false);
    assert.equal(fs.readFileSync(path.join(dist, 'audio/show/two/combined.mp3'), 'utf8'), 'previously shipped second episode');
    assert.equal(fs.existsSync(path.join(dist, 'audio/show/retired')), false);

    const library = {};
    new Function('window', fs.readFileSync(path.join(dist, 'podcasts.js'), 'utf8'))(library);
    const [show] = library.PODCASTS;
    const [first, second] = show.episodes;
    assert.equal(first.content, undefined);
    assert.ok(first.transcriptHash);
    assert.equal(fs.readFileSync(path.join(dist, 'transcripts/show/one.md'), 'utf8'), '**ALEX:** Hello.\n');
    assert.equal(first.audioBytes, undefined, 'a chunk-only render must not retain an old enclosure');
    assert.equal(second.audioBytes, Buffer.byteLength('previously shipped second episode'));
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
