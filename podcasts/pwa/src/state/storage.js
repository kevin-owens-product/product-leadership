export const STORAGE_KEY = 'tlu_podcast_state';
export const STATE_SCHEMA_VERSION = 2;

const LISTENING_STATS_DEFAULT = {
  totalTime: 0,
  episodesCompleted: 0,
  lastListenDate: null,
  currentStreak: 0,
  speedSum: 0,
  speedCount: 0
};

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function safeJSONParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadJSON(key, fallback) {
  return safeJSONParse(localStorage.getItem(key), fallback);
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadQueue() {
  const parsed = loadJSON('playQueue', []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveQueue(queue) {
  saveJSON('playQueue', Array.isArray(queue) ? queue : []);
}

export function loadListeningStats() {
  const parsed = loadJSON('listeningStats', LISTENING_STATS_DEFAULT);
  if (!isObject(parsed)) return { ...LISTENING_STATS_DEFAULT };
  return {
    totalTime: Number(parsed.totalTime) || 0,
    episodesCompleted: Number(parsed.episodesCompleted) || 0,
    lastListenDate: parsed.lastListenDate || null,
    currentStreak: Number(parsed.currentStreak) || 0,
    speedSum: Number(parsed.speedSum) || 0,
    speedCount: Number(parsed.speedCount) || 0
  };
}

export function saveListeningStats(stats) {
  saveJSON('listeningStats', stats);
}

export function migrateState(state) {
  const input = isObject(state) ? state : {};
  const migrated = {
    schemaVersion: STATE_SCHEMA_VERSION,
    episodeProgress: isObject(input.episodeProgress) ? input.episodeProgress : {},
    completedEpisodes: Array.isArray(input.completedEpisodes) ? input.completedEpisodes : [],
    bookmarks: isObject(input.bookmarks) ? input.bookmarks : {},
    speechRate: typeof input.speechRate === 'number' ? input.speechRate : undefined,
    autoPlayNext: typeof input.autoPlayNext === 'boolean' ? input.autoPlayNext : undefined,
    alexVoiceIndex: input.alexVoiceIndex,
    samVoiceIndex: input.samVoiceIndex,
    currentPodcastId: input.currentPodcastId,
    currentEpisodeId: input.currentEpisodeId,
    currentLineIndex: Number.isInteger(input.currentLineIndex) ? input.currentLineIndex : undefined
  };

  return migrated;
}

export function loadAppState() {
  return migrateState(loadJSON(STORAGE_KEY, {}));
}

export function saveAppState(state) {
  saveJSON(STORAGE_KEY, migrateState(state));
}

export function loadLegacyBookmarks(podcastId, episodeId) {
  if (!podcastId || !episodeId) return [];
  const key = `bookmarks-${podcastId}-${episodeId}`;
  const parsed = loadJSON(key, []);
  return Array.isArray(parsed) ? parsed : [];
}

export const defaults = {
  LISTENING_STATS_DEFAULT
};
