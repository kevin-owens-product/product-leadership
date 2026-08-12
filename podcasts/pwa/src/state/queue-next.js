// Decide what plays after the current episode: the first playable queue
// entry wins; otherwise fall back to the next sequential episode in the
// current show. Returns { podcast, episode, queueIndex } where queueIndex
// is -1 for the sequential fallback, or null when nothing is up next.

export function findAdjacentEpisode(podcast, currentEpisodeId, offset) {
  const episodes = Array.isArray(podcast?.episodes) ? podcast.episodes : [];
  const currentIndex = episodes.findIndex((episode) => episode.id === currentEpisodeId);
  if (currentIndex < 0) return null;
  return episodes[currentIndex + offset] || null;
}

export function findNextUp({
  queue = [],
  podcasts = [],
  currentPodcastId = null,
  currentEpisodeId = null
} = {}) {
  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    const podcast = podcasts.find((p) => p.id === item.podcastId);
    const episode = podcast?.episodes?.find((e) => e.id === item.episodeNum);
    if (!podcast || !episode) continue;
    // Skip the entry for whatever is already playing so a queued current
    // episode doesn't "advance" to itself.
    if (podcast.id === currentPodcastId && episode.id === currentEpisodeId) continue;
    return { podcast, episode, queueIndex: i };
  }
  if (currentPodcastId === null || currentEpisodeId === null) return null;
  const current = podcasts.find((p) => p.id === currentPodcastId);
  const nextEp = findAdjacentEpisode(current, currentEpisodeId, 1);
  return nextEp ? { podcast: current, episode: nextEp, queueIndex: -1 } : null;
}
