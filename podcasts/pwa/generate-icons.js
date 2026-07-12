#!/usr/bin/env node

// Generates the PWA icon PNGs (192/512, plus maskable variants) from icon.svg.
// Rasterizes with the Chromium bundled by @playwright/test — already a
// devDependency for the e2e suite, so this adds no new packages.
//
// Usage: node generate-icons.js
// Output: icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png
// The PNGs are committed; this only needs re-running when icon.svg changes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceSvg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

// Maskable variant: full-bleed square background (no rounded corners — the OS
// applies its own mask) with the artwork scaled into the ~80% safe zone so
// circular/squircle masks never clip it.
function toMaskableSvg(svg) {
    const inner = svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .replace(/<rect width="512" height="512" rx="100" fill="#6366f1"\/>\s*/, '');
    return [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
        '  <rect width="512" height="512" fill="#6366f1"/>',
        `  <g transform="translate(51.2 51.2) scale(0.8)">${inner}</g>`,
        '</svg>'
    ].join('\n');
}

const targets = [
    { file: 'icon-192.png', size: 192, svg: sourceSvg, transparent: true },
    { file: 'icon-512.png', size: 512, svg: sourceSvg, transparent: true },
    { file: 'icon-maskable-192.png', size: 192, svg: toMaskableSvg(sourceSvg), transparent: false },
    { file: 'icon-maskable-512.png', size: 512, svg: toMaskableSvg(sourceSvg), transparent: false }
];

const browser = await chromium.launch();
try {
    for (const target of targets) {
        const page = await browser.newPage({
            viewport: { width: target.size, height: target.size },
            deviceScaleFactor: 1
        });
        await page.setContent(
            `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${target.size}px;height:${target.size}px}</style>${target.svg}`,
            { waitUntil: 'load' }
        );
        const buffer = await page.screenshot({ omitBackground: target.transparent });
        fs.writeFileSync(path.join(__dirname, target.file), buffer);
        console.log(`✓ ${target.file} (${buffer.length} bytes)`);
        await page.close();
    }
} finally {
    await browser.close();
}
