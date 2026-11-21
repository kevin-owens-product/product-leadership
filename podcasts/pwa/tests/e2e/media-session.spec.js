import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test('native playback publishes the playing track to system media controls', async ({ page }) => {
    await page.addInitScript(() => {
        const NativeAudio = window.Audio;
        window.Audio = function (...args) {
            const element = new NativeAudio(...args);
            window.testPlayer ??= element;
            return element;
        };
        window.Audio.prototype = NativeAudio.prototype;
        const register = MediaSession.prototype.setActionHandler;
        window.mediaActions = {};
        MediaSession.prototype.setActionHandler = function (name, callback) {
            window.mediaActions[name] = callback;
            return register.call(this, name, callback);
        };
    });
    await page.goto('/?podcast=agentic-coding-frontier&episode=4');
    await expect(page.locator('#player-view')).toHaveClass(/active/);
    const firstTitle = await page.locator('#player-episode-title').textContent();
    const show = 'Agentic Coding Frontier';
    const systemMetadata = () => page.evaluate(() => {
        const { title, artist, album, artwork } = navigator.mediaSession.metadata;
        return { title, artist, album, cover: artwork[0].src };
    });

    await page.locator('#play-btn').click();
    await expect.poll(() => page.evaluate(() => window.testPlayer.currentTime)).toBeGreaterThan(0.1);
    const metadata = await systemMetadata();
    expect(metadata).toMatchObject({ title: firstTitle, artist: show, album: show + ' · Season 1' });
    expect(metadata.cover).toBe(new URL('/covers/agentic-coding-frontier.jpg', page.url()).href);
    expect((await page.request.get(metadata.cover)).headers()['content-type']).toContain('image/jpeg');
    expect(await page.evaluate(() => window.testPlayer.title)).toContain(firstTitle);
    await expect(page).toHaveTitle(firstTitle + ' — ' + show);

    await page.evaluate(() => window.mediaActions.pause({ action: 'pause' }));
    await expect.poll(() => page.evaluate(() => navigator.mediaSession.playbackState)).toBe('paused');
    await page.evaluate(() => window.mediaActions.seekto({ action: 'seekto', seekTime: 300 }));
    await expect(page.locator('#current-pos')).toHaveText('5:00');
    await expect.poll(() => page.evaluate(() =>
        JSON.parse(localStorage.getItem('tlu_podcast_state')).episodeProgress['agentic-coding-frontier-4'].line
    )).toBeGreaterThan(0);
    await page.evaluate(() => window.mediaActions.play({ action: 'play' }));
    await expect.poll(() => page.evaluate(() => window.testPlayer.currentTime)).toBeGreaterThan(300);

    // The dashboard keeps showing the playing show while the phone browses another.
    await page.locator('#back-to-list').click();
    await page.locator('#back-to-podcasts').click();
    await page.locator('[data-podcast-id="deadwater"]').click();
    expect(await systemMetadata()).toEqual(metadata);

    // Simulate the system dropping metadata and resuming the native element.
    // This skips the app Play button and exercises the actual 'playing' event.
    await page.evaluate(async () => {
        window.testPlayer.pause();
        navigator.mediaSession.metadata = null;
        await window.testPlayer.play();
    });
    await expect.poll(systemMetadata).toEqual(metadata);
    await page.evaluate(() => window.mediaActions.nexttrack({ action: 'nexttrack' }));
    await expect.poll(async () => (await systemMetadata()).title).toBe('Memory, Context, and Long-Horizon Execution');
    expect((await systemMetadata()).artist).toBe(show);
    await expect.poll(() => page.evaluate(() => navigator.mediaSession.playbackState)).toBe('playing');
});
