import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Regression net for the modular split: evaluating the full src/main.js
// module graph against the real index.html must succeed and leave the
// expected bootstrapping side effects in the DOM.
test('src/main.js boots against the real index.html DOM', () => {
    const result = spawnSync(
        process.execPath,
        [path.join(__dirname, 'helpers/boot-main.mjs')],
        { encoding: 'utf8', timeout: 30_000 }
    );
    assert.equal(
        result.status,
        0,
        `boot failed\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
    );
    assert.match(result.stdout, /BOOT_OK/);
});
