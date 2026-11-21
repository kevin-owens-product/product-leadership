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

function inspectCachedEpisodes(podcasts, reply) {
    const urls = new Set(reply.urls);
    // The worker can serve an older script with the same path when offline.
    const paths = new Set([...urls, ...(reply.transcriptUrls || [])].map((url) => url.split('?')[0]));
    const playable = new Set();
    const missingScripts = new Set();
    for (const url of urls) {
        const audio = url.match(/\/audio\/([^/]+)\/([^/]+)\/combined\.mp3(?:\?|$)/);
        if (!audio || !urls.has(url.replace(/\/combined\.mp3(?=\?|$)/, '/manifest.json'))) continue;
        const podcast = podcasts.find((p) => p.id === audio[1]);
        const episode = podcast?.episodes.find((ep) => episodeBasename(ep) === audio[2]);
        if (!episode) continue;
        const script = episode.transcriptHash && new URL(transcriptUrl(podcast.id, episode), location.href).href;
        if (script && !paths.has(script.split('?')[0])) missingScripts.add(script);
        else playable.add(epKeyOf(podcast, episode));
    }
    return { playable, missingScripts };
}

export function createDownloadsManager({ toasts, setStatus, getPodcasts, loadManifest, onChange }) {
    // epKey strings (`${podcast.id}-${episode.id}`) the user has downloaded
    // or is currently downloading.
    let downloadedEpisodes = new Set(JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]'));
    const downloadingEpisodes = new Set();
    let verified = false;
    let revision = 0;
    let reconciliation = null;

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
            const allOk = reply?.results?.length === urls.length && reply.results.every((r) => r.ok);
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
            revision++;
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
        revision++;
        persist();
        onChange();
        setStatus(`Removed download "${episode.title}"`);
    }

    // Whole-season (or whole-show) downloads run one episode at a time so a
    // phone on cellular isn't asked to pull several 40 MB files at once.
    // `onProgress(done, total)` fires after each episode.
    let batchRunning = false;
    async function downloadMany(podcast, episodes, { onProgress = () => {} } = {}) {
        if (batchRunning) return { ok: 0, failed: 0, failedEpisodes: [], busy: true };
        batchRunning = true;
        const pending = episodes.filter((episode) => !isDownloaded(podcast, episode));
        let ok = 0;
        const failedEpisodes = [];
        try {
            for (const episode of pending) {
                const saved = await download(podcast, episode, { quiet: true }).catch((err) => {
                    console.warn('Episode download failed:', episode.title, err);
                    return false;
                });
                if (saved) ok += 1;
                else failedEpisodes.push(episode);
                onProgress(ok + failedEpisodes.length, pending.length);
            }
        } finally {
            batchRunning = false;
        }
        return { ok, failed: failedEpisodes.length, failedEpisodes, busy: false };
    }

    async function removeMany(podcast, episodes) {
        for (const episode of episodes) {
            if (isDownloaded(podcast, episode)) await remove(podcast, episode);
        }
    }

    async function verifyDownloads() {
        // A download or removal may finish while the cache snapshot or a
        // legacy transcript request is in flight. Repeat against fresh keys.
        const attemptedScripts = new Set();
        while (true) {
            const snapshotRevision = revision;
            const reply = await sendSwMessage({ type: 'LIST_OFFLINE_AUDIO' });
            const podcasts = getPodcasts();
            if (!Array.isArray(reply?.urls) || !podcasts.length) {
                if (verified) {
                    verified = false;
                    onChange();
                }
                return;
            }
            if (revision !== snapshotRevision) continue;
            const { playable, missingScripts } = inspectCachedEpisodes(podcasts, reply);
            const changed = !verified || downloadedEpisodes.size !== playable.size
                || [...playable].some((key) => !downloadedEpisodes.has(key));
            verified = true;
            downloadedEpisodes = playable;
            persist();
            if (changed) onChange();

            // Publish verified downloads immediately. An older download only
            // joins the list once a fresh snapshot verifies all its files.
            let repaired = false;
            for (const script of missingScripts) {
                if (navigator.onLine === false || revision !== snapshotRevision) break;
                if (attemptedScripts.has(script)) continue;
                attemptedScripts.add(script);
                const saved = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls: [script] });
                if (saved?.results?.length === 1 && saved.results[0].ok) repaired = true;
            }
            if (!repaired && revision === snapshotRevision) return;
        }
    }

    function reconcile() {
        if (!reconciliation) {
            reconciliation = verifyDownloads().finally(() => { reconciliation = null; });
        }
        return reconciliation;
    }

    return {
        isDownloaded,
        hasVerifiedDownloads: () => verified && Boolean(navigator.serviceWorker?.controller),
        isDownloading,
        isBatchRunning: () => batchRunning,
        download,
        downloadMany,
        remove,
        removeMany,
        reconcile
    };
}
