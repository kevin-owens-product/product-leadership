// The service worker owns the files. Keep the user's download selections
// separately from the index of episodes last verified as playable.

import {
    epKeyOf,
    combinedAudioUrl,
    manifestAudioUrl,
    withCacheKey
} from '../playback/manifest.js';
import { transcriptUrl } from '../app/transcripts.js';

const SELECTIONS = 'downloadSelections';
const PLAYABLE = 'downloadedEpisodes';

function readKeys(key) {
    try {
        const list = JSON.parse(localStorage.getItem(key));
        return Array.isArray(list) ? new Set(list.filter(value => typeof value === 'string')) : null;
    } catch {
        return null;
    }
}

function sameKeys(a, b) {
    return a === b || Boolean(a && b && a.size === b.size && [...a].every(key => b.has(key)));
}

function writeKeys(key, values) {
    if (sameKeys(readKeys(key), values)) return true;
    try {
        localStorage.setItem(key, JSON.stringify([...values]));
        return true;
    } catch (err) {
        console.warn('Could not persist', key, err);
        return false;
    }
}

// Send a message to the active service worker and wait for its reply via
// MessageChannel. Resolves to null if there's no controller (e.g. SW not yet
// installed) so callers can fall back to a no-op gracefully.
export function sendSwMessage(message, { timeout = 0 } = {}) {
    const workers = navigator.serviceWorker;
    const controller = workers?.controller;
    if (!controller) return Promise.resolve(null);
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        let timer;
        const finish = (data) => {
            clearTimeout(timer);
            workers.removeEventListener?.('controllerchange', controllerChanged);
            channel.port1.close();
            resolve(data);
        };
        const controllerChanged = () => {
            if (controller !== workers.controller) finish(null);
        };
        workers.addEventListener?.('controllerchange', controllerChanged);
        if (timeout) timer = setTimeout(() => finish(null), timeout);
        channel.port1.onmessage = (event) => finish(event.data);
        channel.port1.onmessageerror = () => finish(null);
        try {
            controller.postMessage(message, [channel.port2]);
        } catch (err) {
            console.warn('SW message failed:', err);
            finish(null);
        }
    });
}

async function readInventory() {
    const reply = await sendSwMessage({ type: 'LIST_OFFLINE_AUDIO' }, { timeout: 10000 });
    const isUrlList = list => Array.isArray(list) && list.every(url => typeof url === 'string');
    if (reply?.error || !isUrlList(reply?.urls)) return null;
    if (reply.recoverableTranscriptUrls !== undefined && !isUrlList(reply.recoverableTranscriptUrls)) return null;
    if (reply.transcriptUrls !== undefined) return isUrlList(reply.transcriptUrls) ? reply : null;

    // Earlier workers list only the explicit download cache. They can also
    // serve scripts from the shared transcript cache without including it in
    // their reply. A storage error is inconclusive, not an empty inventory.
    try {
        const cache = await caches.open('podlearn-transcripts-v1');
        return { ...reply, transcriptUrls: (await cache.keys()).map(key => key.url) };
    } catch {
        return null;
    }
}

function inspectCachedEpisodes(podcasts, reply) {
    const pinnedVersions = new Map();
    for (const url of reply.urls) {
        const path = url.split('?')[0];
        if (!pinnedVersions.has(path)) pinnedVersions.set(path, new Set());
        pinnedVersions.get(path).add(url.slice(path.length));
    }
    const scripts = new Set(reply.transcriptUrls.map(url => url.split('?')[0]));
    const recoverableScripts = new Set((reply.recoverableTranscriptUrls || []).map(url => url.split('?')[0]));
    const catalogKeys = new Set();
    const pinned = new Set();
    const playable = new Set();
    const missingScripts = new Set();
    for (const podcast of podcasts) {
        for (const episode of podcast.episodes) {
            const key = epKeyOf(podcast, episode);
            catalogKeys.add(key);
            const audio = pinnedVersions.get(new URL(combinedAudioUrl(podcast.id, episode), location.href).href);
            const manifest = pinnedVersions.get(new URL(manifestAudioUrl(podcast.id, episode), location.href).href);
            if (audio || manifest) pinned.add(key);
            if (!audio || !manifest || ![...audio].some(version => manifest.has(version))) continue;
            if (episode.transcriptHash) {
                const script = new URL(transcriptUrl(podcast.id, episode), location.href).href;
                const path = script.split('?')[0];
                if (!scripts.has(path) && !pinnedVersions.has(path)) {
                    missingScripts.add(script);
                    if (!recoverableScripts.has(path)) continue;
                }
            }
            playable.add(key);
        }
    }
    return { catalogKeys, pinned, playable, missingScripts };
}

export function createDownloadsManager({ toasts, setStatus, getPodcasts, loadManifest, onChange }) {
    // epKey strings (`${podcast.id}-${episode.id}`) the user has downloaded
    // or is currently downloading.
    let downloadedEpisodes = readKeys(PLAYABLE) || new Set();
    let selections = readKeys(SELECTIONS) || new Set(downloadedEpisodes);
    writeKeys(SELECTIONS, selections);
    const downloadingEpisodes = new Set();
    let verified = false;
    let revision = 0;
    let reconciliation = null;

    function recordSelection(key, saved) {
        // Another tab may have changed other episodes during the transfer.
        selections = readKeys(SELECTIONS) || selections;
        downloadedEpisodes = readKeys(PLAYABLE) || downloadedEpisodes;
        for (const keys of [selections, downloadedEpisodes]) {
            if (saved) keys.add(key);
            else keys.delete(key);
        }
        if (writeKeys(SELECTIONS, selections)) writeKeys(PLAYABLE, downloadedEpisodes);
        revision++;
    }

    function isDownloaded(podcast, episode) {
        return downloadedEpisodes.has(epKeyOf(podcast, episode));
    }

    function isRecoverable(podcast, episode) {
        const key = epKeyOf(podcast, episode);
        return verified && selections.has(key) && !downloadedEpisodes.has(key);
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
            recordSelection(epKey, true);
            setStatus(`Downloaded "${episode.title}"`);
            return true;
        } finally {
            downloadingEpisodes.delete(epKey);
            onChange();
        }
    }

    async function remove(podcast, episode) {
        const epKey = epKeyOf(podcast, episode);
        if (!selections.has(epKey) && !downloadedEpisodes.has(epKey)) return;
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
        recordSelection(epKey, false);
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
            await remove(podcast, episode);
        }
    }

    async function verifyDownloads() {
        // A download or removal may finish while the cache snapshot or a
        // legacy transcript request is in flight. Repeat against fresh keys.
        const attemptedScripts = new Set();
        while (true) {
            const snapshotRevision = revision;
            const controller = navigator.serviceWorker?.controller;
            const storedSelections = readKeys(SELECTIONS);
            const storedPlayable = readKeys(PLAYABLE);
            const reply = await readInventory();
            const podcasts = getPodcasts();
            if (controller !== navigator.serviceWorker?.controller || revision !== snapshotRevision
                || !sameKeys(storedSelections, readKeys(SELECTIONS))
                || !sameKeys(storedPlayable, readKeys(PLAYABLE))) continue;
            if (!reply || !podcasts.length) return;
            const { catalogKeys, pinned, playable, missingScripts } = inspectCachedEpisodes(podcasts, reply);
            const nextSelections = new Set(storedSelections || selections);
            for (const key of pinned) nextSelections.add(key);
            // Mixed-version tabs may have different catalogs. Only update
            // the playable index for episodes this catalog can identify.
            for (const key of storedPlayable || downloadedEpisodes) {
                if (!catalogKeys.has(key) && nextSelections.has(key)) playable.add(key);
            }
            const changed = !verified || !sameKeys(downloadedEpisodes, playable) || !sameKeys(selections, nextSelections);
            verified = true;
            downloadedEpisodes = playable;
            selections = nextSelections;
            // Keep the old receipt if a full storage area prevented migration.
            if (writeKeys(SELECTIONS, selections)) writeKeys(PLAYABLE, downloadedEpisodes);
            if (changed) onChange();

            // Publish verified downloads immediately. An older download only
            // joins the list once a fresh snapshot verifies all its files.
            let repaired = false;
            for (const script of missingScripts) {
                if (navigator.onLine === false || revision !== snapshotRevision) break;
                if (attemptedScripts.has(script)) continue;
                attemptedScripts.add(script);
                const saved = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls: [script] }, { timeout: 15000 });
                if (saved?.results?.length === 1 && saved.results[0].ok) repaired = true;
            }
            if (!repaired && revision === snapshotRevision && controller === navigator.serviceWorker?.controller) return;
        }
    }

    function reconcile() {
        if (!reconciliation) {
            reconciliation = verifyDownloads().finally(() => { reconciliation = null; });
        }
        return reconciliation;
    }

    globalThis.window?.addEventListener?.('storage', (event) => {
        if (event.key !== SELECTIONS && event.key !== PLAYABLE && event.key !== null) return;
        revision++;
        if (event.newValue === null && !readKeys(SELECTIONS)) {
            // Another tab explicitly cleared local data, including our intent
            // key. Its formerly selected episodes must not be written back.
            selections = new Set();
            downloadedEpisodes = readKeys(PLAYABLE) || new Set();
            verified = false;
            onChange();
        }
        void reconcile();
    });

    return {
        isDownloaded,
        isRecoverable,
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
