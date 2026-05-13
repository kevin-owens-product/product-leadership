import { loadLegacyBookmarks } from '../state/storage.js';

export function buildBookmarksExport({ state, currentPodcast, currentEpisode, dialogueLines }) {
  const epKey = `${currentPodcast.id}-${currentEpisode.id}`;
  const fromState = state?.bookmarks?.[epKey];
  const bookmarks = Array.isArray(fromState) && fromState.length > 0
    ? fromState
    : loadLegacyBookmarks(currentPodcast.id, currentEpisode.id);

  return {
    podcast: currentPodcast.title,
    episode: currentEpisode.title,
    bookmarks: bookmarks.map((b) => ({
      line: b.lineIndex ?? b.line ?? 0,
      note: b.note || '',
      context: dialogueLines?.[b.lineIndex ?? b.line ?? 0]?.text || ''
    }))
  };
}

export function buildProgressExport(state) {
  return {
    schemaVersion: state?.schemaVersion ?? 2,
    episodeProgress: state?.episodeProgress || {},
    completedEpisodes: state?.completedEpisodes || [],
    currentPodcastId: state?.currentPodcastId,
    currentEpisodeId: state?.currentEpisodeId,
    currentLineIndex: state?.currentLineIndex ?? 0,
    exportedAt: new Date().toISOString()
  };
}

export function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
