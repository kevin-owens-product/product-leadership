function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function episodeKey(podcastId, episodeId) {
  return `${podcastId}-${episodeId}`;
}

export function getPodcastSeasons(podcast) {
  if (!podcast || !Array.isArray(podcast.seasons) || podcast.seasons.length < 2) return [];
  const episodes = Array.isArray(podcast.episodes) ? podcast.episodes : [];
  return podcast.seasons
    .filter((season) => Number.isInteger(season?.number))
    .map((season) => ({
      number: season.number,
      title: season.title || `Season ${season.number}`,
      description: season.description || '',
      episodes: episodes.filter((episode) => episode.season === season.number)
    }))
    .filter((season) => season.episodes.length > 0)
    .sort((a, b) => a.number - b.number);
}

export function seasonNumberForEpisode(podcast, episodeOrId) {
  const episodeId = typeof episodeOrId === 'object' ? episodeOrId?.id : episodeOrId;
  const episode = podcast?.episodes?.find((candidate) => candidate.id === episodeId);
  return Number.isInteger(episode?.season) ? episode.season : null;
}

export function isEpisodeComplete(state, podcastId, episode) {
  const key = episodeKey(podcastId, episode.id);
  return state?.completedEpisodes?.includes(key)
    || clampPercent(state?.episodeProgress?.[key]?.percent) >= 98;
}

function episodeProgress(state, podcastId, episode) {
  const key = episodeKey(podcastId, episode.id);
  const progress = state?.episodeProgress?.[key] || {};
  return {
    percent: isEpisodeComplete(state, podcastId, episode) ? 100 : clampPercent(progress.percent),
    timestamp: Number(progress.timestamp) || 0
  };
}

export function getSeasonStats(podcastId, episodes, state) {
  const safeEpisodes = Array.isArray(episodes) ? episodes : [];
  let completed = 0;
  let progressTotal = 0;
  let durationSeconds = 0;

  for (const episode of safeEpisodes) {
    const progress = episodeProgress(state, podcastId, episode);
    if (progress.percent >= 98) completed += 1;
    progressTotal += progress.percent;
    if (Number.isFinite(episode.durationSeconds)) durationSeconds += episode.durationSeconds;
  }

  return {
    total: safeEpisodes.length,
    completed,
    percent: safeEpisodes.length ? Math.round(progressTotal / safeEpisodes.length) : 0,
    durationSeconds
  };
}

export function resolveSeasonNumber({
  podcast,
  state = {},
  playback = null,
  preferredSeason = null
} = {}) {
  const seasons = getPodcastSeasons(podcast);
  if (seasons.length === 0) return null;
  const validNumbers = new Set(seasons.map((season) => season.number));
  const valid = (number) => Number.isInteger(number) && validNumbers.has(number);

  if (valid(preferredSeason)) return preferredSeason;

  if (playback?.podcastId === podcast.id) {
    const playbackSeason = seasonNumberForEpisode(podcast, playback.episodeId);
    if (valid(playbackSeason)) return playbackSeason;
  }

  const remembered = Number(state.seasonSelections?.[podcast.id]);
  if (valid(remembered)) return remembered;

  if (state.currentPodcastId === podcast.id) {
    const currentSeason = seasonNumberForEpisode(podcast, state.currentEpisodeId);
    if (valid(currentSeason)) return currentSeason;
  }

  let latestInProgress = null;
  for (const episode of podcast.episodes || []) {
    const progress = episodeProgress(state, podcast.id, episode);
    if (progress.percent <= 0 || progress.percent >= 98) continue;
    if (!latestInProgress || progress.timestamp > latestInProgress.timestamp) {
      latestInProgress = { season: episode.season, timestamp: progress.timestamp };
    }
  }
  if (valid(latestInProgress?.season)) return latestInProgress.season;

  const firstIncomplete = seasons.find((season) =>
    season.episodes.some((episode) => !isEpisodeComplete(state, podcast.id, episode))
  );
  return firstIncomplete?.number ?? seasons.at(-1).number;
}

function preferredEpisode(podcastId, episodes, state) {
  const inProgress = episodes
    .map((episode) => ({ episode, ...episodeProgress(state, podcastId, episode) }))
    .filter((item) => item.percent > 0 && item.percent < 98)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (inProgress.length > 0) return { kind: 'continue', episode: inProgress[0].episode };

  const firstUnplayed = episodes.find((episode) => !isEpisodeComplete(state, podcastId, episode));
  if (!firstUnplayed) return null;
  const anyComplete = episodes.some((episode) => isEpisodeComplete(state, podcastId, episode));
  return { kind: anyComplete ? 'play' : 'start', episode: firstUnplayed };
}

export function getSeasonListeningAction({ podcast, seasons, selectedSeason, state = {} } = {}) {
  if (!podcast || !Array.isArray(seasons)) return { kind: 'complete', episode: null, season: null };
  const selectedIndex = seasons.findIndex((season) => season.number === selectedSeason);
  if (selectedIndex === -1) return { kind: 'complete', episode: null, season: null };

  const selected = seasons[selectedIndex];
  const action = preferredEpisode(podcast.id, selected.episodes, state);
  if (action) return { ...action, season: selected };

  for (const laterSeason of seasons.slice(selectedIndex + 1)) {
    const laterAction = preferredEpisode(podcast.id, laterSeason.episodes, state);
    if (laterAction) return { ...laterAction, season: laterSeason };
  }

  const seriesComplete = seasons.every((season) =>
    season.episodes.every((episode) => isEpisodeComplete(state, podcast.id, episode))
  );
  if (seriesComplete) return { kind: 'series-complete', episode: null, season: selected };

  return { kind: 'complete', episode: null, season: selected };
}
