// Run after adding a show or changing its artwork. The committed 512px covers
// give native media controls ordinary, offline-cacheable image URLs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const showsDir = fileURLToPath(new URL('../../shows/', import.meta.url));
const source = await fs.readFile(new URL('../src/ui/artwork.js', import.meta.url));
const rendererUrl = 'data:text/javascript;base64,' + source.toString('base64');
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    for (const entry of await fs.readdir(showsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
        const showDir = path.join(showsDir, entry.name);
        const { id, title } = JSON.parse(await fs.readFile(path.join(showDir, 'podcast.json'), 'utf8'));
        const jpeg = await page.evaluate(async ({ rendererUrl, id, title }) => {
            const { generatePodcastArtwork } = await import(rendererUrl);
            const image = new Image();
            image.src = generatePodcastArtwork({ id, title });
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 512;
            canvas.getContext('2d').drawImage(image, 0, 0, 512, 512);
            return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
        }, { rendererUrl, id, title });
        await fs.writeFile(path.join(showDir, 'cover.jpg'), Buffer.from(jpeg, 'base64'));
    }
} finally {
    await browser.close();
}
