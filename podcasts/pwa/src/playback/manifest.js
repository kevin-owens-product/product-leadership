// Supertonic audio manifest loading + URL helpers.
//
// Each generated episode ships `audio/<show>/<episode>/manifest.json` with
// per-line MP3s plus a `combined.mp3`. These helpers fetch the manifest,
// derive a stable cache key from its response, attach per-line audio URLs to
// parsed dialogue, and build the line-offset table that continuous
// combined.mp3 playback uses for binary-search line tracking.

export function episodeBasename(episode) {
    const f = episode.file || episode.filename || '';
    return String(f).replace(/\.md$/, '');
}

export function combinedAudioUrl(podcastId, episode) {
    return `audio/${podcastId}/${episodeBasename(episode)}/combined.mp3`;
}

export function manifestAudioUrl(podcastId, episode) {
    return `audio/${podcastId}/${episodeBasename(episode)}/manifest.json`;
}

export function withCacheKey(url, cacheKey) {
    if (!cacheKey) return url;
    return `${url}?v=${encodeURIComponent(cacheKey)}`;
}

export function epKeyOf(podcast, episode) {
    return `${podcast.id}-${episode.id}`;
}

// FNV-1a over the manifest response (etag/last-modified/body) — a compact,
// deterministic cache-buster for the audio URLs.
export function stableCacheKey(input) {
    const text = String(input || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

export async function loadSupertonicAudioManifest(podcastId, episodeFile) {
    if (!podcastId || !episodeFile) return null;
    const basename = episodeFile.replace(/\.md$/, '');
    const base = `audio/${podcastId}/${basename}`;
    const requestKey = Date.now().toString(36);
    try {
        const res = await fetch(`${base}/manifest.json?v=${requestKey}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (!res.ok) return null;
        const raw = await res.text();
        const items = JSON.parse(raw);
        if (!Array.isArray(items) || items.length === 0) return null;
        const cacheKey = stableCacheKey([
            res.headers.get('etag') || '',
            res.headers.get('last-modified') || '',
            raw
        ].join('|'));
        return { base, cacheKey, items };
    } catch {
        return null;
    }
}

export function attachAudioUrls(dialogue, manifest) {
    if (!manifest) return;
    // Prefer matching by rawLine when present (robust to parser differences).
    const byRawLine = new Map();
    let allHaveRawLine = true;
    for (const item of manifest.items) {
        if (typeof item.rawLine === 'number') {
            byRawLine.set(item.rawLine, item);
        } else {
            allHaveRawLine = false;
        }
    }

    let matched = 0;
    if (allHaveRawLine && byRawLine.size === manifest.items.length) {
        for (const line of dialogue) {
            const item = byRawLine.get(line.rawLine);
            if (item) {
                line.audioUrl = `${manifest.base}/${item.file}?v=${manifest.cacheKey}`;
                line.audioStartTime = typeof item.startTime === 'number' ? item.startTime : null;
                line.audioDuration = typeof item.duration === 'number' ? item.duration : null;
                matched++;
            }
        }
    }
    // Fallback: positional match if counts line up exactly.
    if (matched === 0 && manifest.items.length === dialogue.length) {
        for (let i = 0; i < dialogue.length; i++) {
            const item = manifest.items[i];
            dialogue[i].audioUrl = `${manifest.base}/${item.file}?v=${manifest.cacheKey}`;
            dialogue[i].audioStartTime = typeof item.startTime === 'number' ? item.startTime : null;
            dialogue[i].audioDuration = typeof item.duration === 'number' ? item.duration : null;
            matched++;
        }
    }
    return matched;
}

// Build a lineOffsets array aligned with dialogueLines for combined.mp3 playback.
// Returns null if any line is missing duration data (caller should fall back to
// chunked playback in that case).
export function buildLineOffsets(dialogue) {
    if (!dialogue || dialogue.length === 0) return null;
    const offsets = new Array(dialogue.length);
    let cumulative = 0;
    for (let i = 0; i < dialogue.length; i++) {
        const startTime = dialogue[i].audioStartTime;
        const duration = dialogue[i].audioDuration;
        if (typeof startTime !== 'number' || typeof duration !== 'number') return null;
        offsets[i] = startTime;
        cumulative = Math.max(cumulative, startTime + duration);
    }
    return { offsets, totalDuration: cumulative };
}
