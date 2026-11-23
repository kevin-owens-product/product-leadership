// Episode transcripts load on demand. The catalog (podcasts.js) carries only
// metadata; each script lives at transcripts/<show>/<file>.md and is fetched
// the first time its episode is opened. The URL carries a hash of the script,
// so the service worker can keep it cached until the script itself changes.

export function transcriptUrl(podcastId, episode) {
    const file = episode?.file || episode?.filename;
    if (!podcastId || !file) return null;
    const url = `transcripts/${encodeURIComponent(podcastId)}/${encodeURIComponent(file)}`;
    return episode.transcriptHash ? `${url}?v=${encodeURIComponent(episode.transcriptHash)}` : url;
}

const inflight = new Map();
const fetchedContent = new WeakSet();

// Resolves to the episode's script text, or null when it can't be loaded.
// Episodes that already carry `content` (user-created shows, or an unbuilt
// catalog) resolve immediately.
export async function ensureEpisodeContent(podcastId, episode, { fetchImpl = (...args) => fetch(...args) } = {}) {
    if (!episode) return null;
    // A saved recording may be removed or replaced in another tab. Ask the
    // controlling worker which revision to play on every open, while retaining
    // embedded content and the in-memory fallback in browsers without a worker.
    if (typeof episode.content === 'string' && (!fetchedContent.has(episode) || !globalThis.navigator?.serviceWorker?.controller)) return episode.content;
    const url = transcriptUrl(podcastId, episode);
    if (!url) return null;
    if (inflight.has(url)) return inflight.get(url);
    const request = (async () => {
        try {
            const res = await fetchImpl(url);
            if (!res || !res.ok) return null;
            const text = await res.text();
            episode.content = text;
            fetchedContent.add(episode);
            return text;
        } catch {
            return null;
        } finally {
            inflight.delete(url);
        }
    })();
    inflight.set(url, request);
    return request;
}
