// "New" episode tracking. An episode is new when it showed up in the catalog
// after this device first ran the player, nobody has opened it yet, and it
// arrived within the last NEW_WINDOW_DAYS. On the very first run everything
// already in the catalog counts as known, except episodes published in the
// previous FIRST_RUN_GRACE_HOURS, so a fresh install doesn't light up the
// whole library but a show that landed today still gets flagged.

import { safeJSONParse } from './storage.js?v=2.7.2%2B20261121T201527Z';

export const NEW_EPISODES_KEY = 'newEpisodes';
export const NEW_WINDOW_DAYS = 30;
export const FIRST_RUN_GRACE_HOURS = 48;

const DAY_MS = 24 * 60 * 60 * 1000;

function keyOf(podcast, episode) {
    return `${podcast.id}-${episode.id}`;
}

function emptyRecord() {
    return { initialized: false, known: {}, opened: {} };
}

function loadRecord(storage) {
    const parsed = safeJSONParse(storage.getItem(NEW_EPISODES_KEY), null);
    if (!parsed || typeof parsed !== 'object') return emptyRecord();
    return {
        initialized: parsed.initialized === true,
        known: parsed.known && typeof parsed.known === 'object' ? parsed.known : {},
        opened: parsed.opened && typeof parsed.opened === 'object' ? parsed.opened : {}
    };
}

export function createNewEpisodeTracker({
    storage = globalThis.localStorage,
    now = () => Date.now()
} = {}) {
    let record = loadRecord(storage);

    function save() {
        try {
            storage.setItem(NEW_EPISODES_KEY, JSON.stringify(record));
        } catch (err) {
            console.warn('Could not persist new-episode state:', err);
        }
    }

    // Records every episode in the catalog the first time it's seen, stamped
    // with when it arrived on this device.
    function syncCatalog(podcasts) {
        if (!Array.isArray(podcasts) || podcasts.length === 0) return;
        const t = now();
        const firstRun = !record.initialized;
        let changed = firstRun;
        for (const podcast of podcasts) {
            for (const episode of podcast.episodes || []) {
                const key = keyOf(podcast, episode);
                if (record.known[key] != null) continue;
                if (firstRun) {
                    const published = Date.parse(episode.published || '');
                    const recent = Number.isFinite(published) && t - published < FIRST_RUN_GRACE_HOURS * 60 * 60 * 1000;
                    // 0 marks "already here before this device started tracking".
                    record.known[key] = recent ? published : 0;
                } else {
                    record.known[key] = t;
                }
                changed = true;
            }
        }
        record.initialized = true;
        if (changed) save();
    }

    function isNew(podcast, episode, state = {}) {
        const key = keyOf(podcast, episode);
        const arrived = Number(record.known[key]) || 0;
        if (!arrived || record.opened[key]) return false;
        if (now() - arrived > NEW_WINDOW_DAYS * DAY_MS) return false;
        if (state.completedEpisodes?.includes?.(key)) return false;
        if ((Number(state.episodeProgress?.[key]?.percent) || 0) > 0) return false;
        return true;
    }

    function countNew(podcast, state = {}) {
        return (podcast.episodes || []).filter((episode) => isNew(podcast, episode, state)).length;
    }

    function markOpened(podcast, episode) {
        if (!podcast || !episode) return;
        const key = keyOf(podcast, episode);
        if (record.opened[key]) return;
        record.opened[key] = now();
        save();
    }

    return { syncCatalog, isNew, countNew, markOpened };
}
