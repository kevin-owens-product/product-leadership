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
} from '../playback/manifest.js?v=2.3.0%2B20260713T101637Z';

// Send a message to the active service worker and wait for its reply via
// MessageChannel. Resolves to null if there's no controller (e.g. SW not yet
// installed) so callers can fall back to a no-op gracefully.
export function sendSwMessage(message) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data);
        try {
            navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
        } catch (err) {
            console.warn('SW message failed:', err);
            resolve(null);
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

    async function download(podcast, episode) {
        const epKey = epKeyOf(podcast, episode);
        if (downloadedEpisodes.has(epKey) || downloadingEpisodes.has(epKey)) return;
        downloadingEpisodes.add(epKey);
        onChange();
        try {
            const episodeFile = episode.file || episode.filename || null;
            const audioManifest = await loadManifest(podcast.id, episodeFile);
            if (!audioManifest) {
                setStatus('Download failed — audio is not available yet');
                toasts.show(`Download failed — audio for "${episode.title}" isn’t available`, {
                    actionLabel: 'Retry',
                    onAction: () => { void download(podcast, episode); }
                });
                return;
            }
            const urls = [
                new URL(withCacheKey(combinedAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString(),
                new URL(withCacheKey(manifestAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString()
            ];
            const reply = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls });
            const allOk = reply && Array.isArray(reply.results) && reply.results.every((r) => r.ok);
            if (!allOk) {
                const failed = reply && reply.results ? reply.results.filter((r) => !r.ok).map((r) => r.url).join(', ') : '(no SW)';
                console.warn('Episode download failed for', failed);
                setStatus('Download failed — try again');
                toasts.show(`Download failed for "${episode.title}"`, {
                    actionLabel: 'Retry',
                    onAction: () => { void download(podcast, episode); }
                });
                return;
            }
            downloadedEpisodes.add(epKey);
            persist();
            setStatus(`Downloaded "${episode.title}"`);
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
        await sendSwMessage({ type: 'DELETE_AUDIO_URLS', urls });
        downloadedEpisodes.delete(epKey);
        persist();
        onChange();
        setStatus(`Removed download "${episode.title}"`);
    }

    // Reconcile our localStorage set against what's actually in the SW cache so
    // the UI doesn't show stale "downloaded" badges after a cache eviction.
    async function reconcile() {
        const reply = await sendSwMessage({ type: 'LIST_OFFLINE_AUDIO' });
        if (!reply || !Array.isArray(reply.urls)) return;
        const haveSet = new Set();
        for (const fullUrl of reply.urls) {
            const m = fullUrl.match(/\/audio\/([^/]+)\/([^/]+)\/combined\.mp3/);
            if (!m) continue;
            const podcastId = m[1];
            const basename = m[2];
            const podcasts = getPodcasts();
            const podcast = podcasts.find((p) => p.id === podcastId);
            if (!podcast) continue;
            const ep = podcast.episodes.find((e) => episodeBasename(e) === basename);
            if (ep) haveSet.add(`${podcastId}-${ep.id}`);
        }
        const before = downloadedEpisodes.size;
        downloadedEpisodes = haveSet;
        persist();
        if (haveSet.size !== before) {
            onChange();
        }
    }

    return { isDownloaded, isDownloading, download, remove, reconcile };
}
