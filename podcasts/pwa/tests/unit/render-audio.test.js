import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('republishing reuses matching speech, re-encodes edited lines and resumes a failed batch', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podlearn-render-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const realTools = fileURLToPath(new URL('../../../tools/', import.meta.url));
    const tools = path.join(root, 'tools');
    fs.mkdirSync(tools);
    for (const name of ['generate-audio-supertonic.js', 'supertonic-episode-worker.mjs', 'cue-music.js', 'render-storage.js']) {
        fs.copyFileSync(path.join(realTools, name), path.join(tools, name));
    }

    function write(file, content) {
        const dest = path.join(root, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
        return dest;
    }
    const load = file => fs.readFileSync(path.join(root, file), 'utf8');
    const model = path.join(root, 'model');
    const calls = write('speech.log', '');
    const encodes = write('encoder.log', '');
    const manifest = { id: 'demo', title: 'Demo', episodes: [{ id: 1, file: 'one.md', title: 'One' }] };
    write('shows/demo/podcast.json', JSON.stringify(manifest));
    const script = (...lines) => write('shows/demo/one.md', lines.map(text => '**ALEX:** ' + text).join('\n'));
    const output = 'pwa/audio/demo/one/';
    write(output + '0000.wav', 'old render with no input fingerprint');
    write('model/nodejs/package.json', '{"type":"module"}');
    write('model/nodejs/example_onnx.js', '');
    write('model/assets/onnx/model.onnx', 'test model');
    write('model/assets/voice_styles/M1.json', 'first voice style');
    write('model/nodejs/helper.js', `
        import fs from 'node:fs';
        export function loadTextToSpeech() { return {
            sampleRate: 8000,
            call(text, lang, voice, steps, speed) {
                fs.appendFileSync(process.env.SPEECH_LOG, text + '\\n');
                if (text === process.env.FAIL_LINE) throw Error('interrupted');
                const inputs = [text, lang, voice, steps, speed].join('|');
                return { wav: [...Buffer.from(inputs)].map(byte => byte / 256) };
            }
        }; }
        export const loadVoiceStyle = ([file]) => fs.readFileSync(file, 'utf8');
        export function writeWavFile(file, samples) {
            const data = Buffer.alloc(44 + samples.length * 2);
            data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
            data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
            data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28);
            data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36);
            data.writeUInt32LE(samples.length * 2, 40);
            samples.forEach((n, i) => data.writeInt16LE(Math.round(n * 8192), 44 + i * 2));
            fs.writeFileSync(file, data);
        }
    `);
    // Exercise the normal encoder commands without requiring a model or codecs.
    const encoder = write('bin/ffmpeg', `#!${process.execPath}
        const fs = require('node:fs');
        const path = require('node:path');
        const args = process.argv.slice(2);
        if (args[0] === '-version') process.exit(0);
        const input = args[args.indexOf('-i') + 1];
        const out = args.at(-1);
        if (args.includes('concat')) {
            const lines = fs.readFileSync(input, 'utf8').split('\\n');
            fs.writeFileSync(out, Buffer.concat(lines.map(line => fs.readFileSync(path.join(path.dirname(input), line.slice(6, -1))))));
        } else {
            fs.appendFileSync(process.env.ENCODE_LOG, path.basename(input) + '\\n');
            fs.copyFileSync(input, out);
        }
    `);
    fs.chmodSync(encoder, 0o755);
    fs.chmodSync(write('bin/ffprobe', '#!/bin/sh\necho 1\n'), 0o755);
    function run(flags = [], env = {}) {
        return spawnSync(process.execPath, [path.join(tools, 'generate-audio-supertonic.js'), '--show', 'demo', '--episode', '1', ...flags], {
            encoding: 'utf8', env: { ...process.env, PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH,
                SUPERTONIC_DIR: model, SPEECH_LOG: calls, ENCODE_LOG: encodes, ...env }
        });
    }
    function render(flags) {
        const result = run(flags);
        assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const bytes = file => fs.readFileSync(path.join(root, output, file));

    script('Revenue doubled.', 'Same line.');
    render();
    const active = write('pwa/audio/.render-cache/demo/one/.owner-' + process.pid + '-test', '');
    const blocked = run();
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stdout, /Another process is using the render/);
    fs.unlinkSync(active);
    const first = bytes('0000.mp3');
    const same = bytes('0001.mp3');
    const combined = bytes('combined.mp3');
    render();
    assert.equal(load('speech.log'), 'Revenue doubled.\nSame line.\n');
    assert.equal(load('encoder.log'), '0000.wav\n0001.wav\n');

    script('Same line.', 'Revenue declined.');
    render();
    assert.equal(load('speech.log'), 'Revenue doubled.\nSame line.\nRevenue declined.\n');
    assert.equal(load('encoder.log'), '0000.wav\n0001.wav\n0001.wav\n');
    assert.deepEqual(bytes('0000.mp3'), same);
    assert.notDeepEqual(bytes('0001.mp3'), first);
    assert.notDeepEqual(bytes('combined.mp3'), combined);

    const previous = bytes('manifest.json');
    script('First new line.', 'Interrupt me.');
    assert.notEqual(run([], { FAIL_LINE: 'Interrupt me.' }).status, 0);
    assert.deepEqual(bytes('manifest.json'), previous);
    render();
    assert.equal(load('speech.log').split('First new line.\n').length - 1, 1, 'resume the successful line');
    const beforeSpeed = bytes('0000.mp3');
    render(['--speed', '1.5']);
    assert.notDeepEqual(bytes('0000.mp3'), beforeSpeed);
    const beforeVoice = bytes('0000.mp3');
    write('model/assets/voice_styles/M1.json', 'updated voice style');
    render(['--speed', '1.5']);
    assert.notDeepEqual(bytes('0000.mp3'), beforeVoice);
    render(['--speed', '1.5', '--no-mp3']);
    assert.equal(JSON.parse(bytes('manifest.json'))[0].file, '0000.wav');
    assert.equal(fs.existsSync(path.join(root, output, 'combined.mp3')), false);
});
