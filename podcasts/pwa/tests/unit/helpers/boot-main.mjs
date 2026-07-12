// Boots the real src/main.js module graph against the real index.html in
// jsdom, then exits 0. Run as a child process (the app starts intervals that
// would otherwise keep the test runner alive). Any throw during module
// evaluation — a missing element, a bad import, a TDZ bug — exits nonzero.

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });

const define = (name, value) => {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
};

define('window', dom.window);
define('document', dom.window.document);
define('localStorage', dom.window.localStorage);
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
define('location', dom.window.location);
define('MutationObserver', dom.window.MutationObserver);
define('Audio', dom.window.Audio);
define('HTMLElement', dom.window.HTMLElement);
define('Element', dom.window.Element);
define('CustomEvent', dom.window.CustomEvent);
define('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
define('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));

try {
    await import(path.join(root, 'src/main.js'));

    // Give boot-time async work (failed version.json fetch, etc.) a beat to
    // settle so unhandled rejections would surface.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Sanity: bootstrapping side effects landed in the DOM.
    const assert = (cond, msg) => {
        if (!cond) {
            console.error('BOOT ASSERTION FAILED:', msg);
            process.exit(1);
        }
    };
    assert(
        document.querySelector('.panel-header')?.getAttribute('role') === 'button',
        'collapsible panel headers should be upgraded to role="button"'
    );
    assert(
        (document.getElementById('version-badge')?.textContent || '').startsWith('v'),
        'version badge should be populated'
    );
    assert(
        document.getElementById('podcast-count')?.textContent === 'Loading...',
        'podcasts list should render its loading state'
    );
    assert(
        document.getElementById('queue-list')?.innerHTML.includes('Queue is empty'),
        'queue panel should render its empty state'
    );
    assert(
        (document.getElementById('prev-btn')?.textContent || '').includes('30'),
        'skip buttons should be labeled with configured intervals'
    );

    console.log('BOOT_OK');
    process.exit(0);
} catch (err) {
    console.error('BOOT FAILED:', err && err.stack || err);
    process.exit(1);
}
