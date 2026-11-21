// Per-episode offline downloads, backed by the service worker's
// offline-audio cache. The downloaded set is persisted in localStorage;
// downloading is transient so a refresh-mid-download just shows the episode
// as undownloaded.

import {
    epKeyOf,
    episodeBasename,
    combinedAudioUrl,
    manifestAudioUrl,
    withCacheKey
} from '../playback/manifest.js';
import { transcriptUrl } from '../app/transcripts.js';

// Send a message to the active service worker and wait for its reply via
// MessageChannel. Resolves to null if there's no controller (e.g. SW not yet
// installed) so callers can fall back to a no-op gracefully.
export function sendSwMessage(message) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        const finish = (data) => {
            channel.port1.close();
            resolve(data);
        };
        channel.port1.onmessage = (event) => finish(event.data);
        channel.port1.onmessageerror = () => finish(null);
        try {
            navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
        } catch (err) {
            console.warn('SW message failed:', err);
            finish(null);
        }
    });
}

export function createDownloadsManager({ toasts, setStatus, getPodcasts, loadManifest, onChange }) {
    // epKey strings (`${podcast.id}-${episode.id}`) the user has downloaded
    // or is currently downloading.
    let downloadedEpisodes = new Set(JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]'));
    const downloadingEpisodes = new Set();

    function persist() {
        try {
            localStorage.setItem('downloadedEpisodes', JSON.stringify([...downloadedEpisodes]));
        } catch (err) {
            console.warn('Could not persist downloadedEpisodes:', err);
        }
    }

    function isDownloaded(podcast, episode) {
        return downloadedEpisodes.has(epKeyOf(podcast, episode));
    }

    function isDownloading(podcast, episode) {
        return downloadingEpisodes.has(epKeyOf(podcast, episode));
    }

    async function download(podcast, episode, { quiet = false } = {}) {
        const epKey = epKeyOf(podcast, episode);
        if (downloadedEpisodes.has(epKey)) return true;
        if (downloadingEpisodes.has(epKey)) return false;
        downloadingEpisodes.add(epKey);
        onChange();
        try {
            const episodeFile = episode.file || episode.filename || null;
            const audioManifest = await loadManifest(podcast.id, episodeFile);
            if (!audioManifest) {
                setStatus('Download failed — audio is not available yet');
                if (!quiet) {
                    toasts.show(`Download failed — audio for "${episode.title}" isn’t available`, {
                        actionLabel: 'Retry',
                        onAction: () => { void download(podcast, episode); }
                    });
                }
                return false;
            }
            const urls = [
                new URL(withCacheKey(combinedAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString(),
                new URL(withCacheKey(manifestAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString()
            ];
            // The script loads separately from the catalog, so an offline
            // episode needs its transcript cached alongside the audio.
            const scriptUrl = transcriptUrl(podcast.id, episode);
            if (scriptUrl && episode.transcriptHash) {
                urls.push(new URL(scriptUrl, location.href).toString());
            }
            const reply = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls });
            const allOk = reply && Array.isArray(reply.results) && reply.results.every((r) => r.ok);
            if (!allOk) {
                const failed = reply && reply.results ? reply.results.filter((r) => !r.ok).map((r) => r.url).join(', ') : '(no SW)';
                console.warn('Episode download failed for', failed);
                setStatus('Download failed — try again');
                if (!quiet) {
                    toasts.show(`Download failed for "${episode.title}"`, {
                        actionLabel: 'Retry',
                        onAction: () => { void download(podcast, episode); }
                    });
                }
                return false;
            }
            downloadedEpisodes.add(epKey);
            persist();
            setStatus(`Downloaded "${episode.title}"`);
            return true;
        } finally {
            downloadingEpisodes.delete(epKey);
            onChange();
        }
    }

    async function remove(podcast, episode) {
        const epKey = epKeyOf(podcast, episode);
        if (!downloadedEpisodes.has(epKey)) return;
        const urls = [
            new URL(combinedAudioUrl(podcast.id, episode), location.href).toString(),
            new URL(manifestAudioUrl(podcast.id, episode), location.href).toString()
        ];
        const scriptUrl = transcriptUrl(podcast.id, episode);
        if (scriptUrl && episode.transcriptHash) urls.push(new URL(scriptUrl, location.href).toString());
        const reply = await sendSwMessage({ type: 'DELETE_AUDIO_URLS', urls });
        if (typeof reply?.removed !== 'number') {
            setStatus('Could not remove download — try again');
            return;
        }
        downloadedEpisodes.delete(epKey);
        persist();
        onChange();
        setStatus(`Removed download "${episode.title}"`);
    }

    // Whole-season (or whole-show) downloads run one episode at a time so a
    // phone on cellular isn't asked to pull several 40 MB files at once.
    // `onProgress(done, total)` fires after each episode.
    let batchRunning = false;
    async function downloadMany(podcast, episodes, { onProgress = () => {} } = {}) {
        if (batchRunning) return { ok: 0, failed: 0, busy: true };
        batchRunning = true;
        const pending = episodes.filter((episode) => !isDownloaded(podcast, episode));
        let ok = 0;
        let failed = 0;
        try {
            for (const episode of pending) {
                if (await download(podcast, episode, { quiet: true })) ok += 1;
                else failed += 1;
                onProgress(ok + failed, pending.length);
            }
        } finally {
            batchRunning = false;
        }
        return { ok, failed, busy: false };
    }

    async function removeMany(podcast, episodes) {
        for (const episode of episodes) {
            if (isDownloaded(podcast, episode)) await remove(podcast, episode);
        }
    }

    // Reconcile our localStorage set against what's actually in the SW cache so
    // the UI doesn't show stale "downloaded" badges after a cache eviction.
    async function reconcile() {
        const reply = await sendSwMessage({ type: 'LIST_OFFLINE_AUDIO' });
        if (!reply || !Array.isArray(reply.urls)) return;
        // Every cached URL is resolved against the loaded library below, so
        // running before the library exists resolves nothing and the result is
        // indistinguishable from "the cache is empty" — except it then gets
        // persisted, destroying the record of every download. Reconciling is
        // only meaningful once there is something to reconcile against.
        if (getPodcasts().length === 0) return;
        const haveSet = new Set();
        const cachedUrls = new Set(reply.urls);
        for (const fullUrl of cachedUrls) {
            const m = fullUrl.match(/\/audio\/([^/]+)\/([^/]+)\/combined\.mp3(?:\?|$)/);
            if (!m) continue;
            const manifestUrl = fullUrl.replace(/\/combined\.mp3(?=\?|$)/, '/manifest.json');
            if (!cachedUrls.has(manifestUrl)) continue;
            const podcastId = m[1];
            const basename = m[2];
            const podcasts = getPodcasts();
            const podcast = podcasts.find((p) => p.id === podcastId);
            if (!podcast) continue;
            const ep = podcast.episodes.find((e) => episodeBasename(e) === basename);
            if (ep) haveSet.add(`${podcastId}-${ep.id}`);
        }
        const changed = downloadedEpisodes.size !== haveSet.size
            || [...haveSet].some((key) => !downloadedEpisodes.has(key));
        downloadedEpisodes = haveSet;
        persist();
        if (changed) onChange();
        await backfillTranscripts(reply.urls);
    }

    // Episodes downloaded before transcripts moved out of the catalog have
    // audio cached but no script. Fetch the missing scripts while online so
    // those downloads keep working offline.
    async function backfillTranscripts(cachedUrls) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        const cachedPaths = new Set(cachedUrls.map((u) => {
            try { return new URL(u).pathname; } catch { return u; }
        }));
        const missing = [];
        for (const podcast of getPodcasts()) {
            for (const episode of podcast.episodes || []) {
                if (!episode.transcriptHash || !downloadedEpisodes.has(epKeyOf(podcast, episode))) continue;
                const url = new URL(transcriptUrl(podcast.id, episode), location.href);
                if (!cachedPaths.has(url.pathname)) missing.push(url.toString());
            }
        }
        for (const url of missing) {
            await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls: [url] });
        }
    }

    return {
        isDownloaded,
        isDownloading,
        isBatchRunning: () => batchRunning,
        download,
        downloadMany,
        remove,
        removeMany,
        reconcile
    };
}
