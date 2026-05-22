import { escapeHtml, safeColor } from '../security/sanitize.js?v=2.3.0%2B20260522T150546Z';

function formatClockFromMinutes(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;
  const totalSeconds = Math.round(safeMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Compact human-readable label for a duration in seconds: "47 min", "1h 12m".
// Returns null when no duration is available so callers can fall back.
export function formatDurationLabel(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function setStaticHtml(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

export function renderPodcastCard(card, podcast, epCount, avgProgress) {
  const color = safeColor(podcast.color || '#6366f1');
  let totalSeconds = 0;
  let haveDurations = false;
  if (Array.isArray(podcast.episodes)) {
    for (const ep of podcast.episodes) {
      if (Number.isFinite(ep.durationSeconds)) {
        totalSeconds += ep.durationSeconds;
        haveDurations = true;
      }
    }
  }
  const totalLabel = haveDurations ? formatDurationLabel(totalSeconds) : `~${epCount * 60} min`;
  card.innerHTML = `
    <div class="podcast-card-header">
      <div class="podcast-icon" style="background: ${color}20; color: ${color}">${escapeHtml(podcast.icon || '🎙️')}</div>
      <div class="podcast-info">
        <div class="podcast-title">${escapeHtml(podcast.title)}</div>
        <div class="podcast-subtitle">${escapeHtml(podcast.subtitle)}</div>
        <div class="podcast-meta">
          <span>${epCount} episodes</span>
          <span>${totalLabel}</span>
        </div>
      </div>
    </div>
    <div class="podcast-progress-bar">
      <div class="podcast-progress-fill" style="width: ${avgProgress}%"></div>
    </div>
  `;
}

export function renderEpisodeCard(card, ep, progress, isComplete, inProgress, downloadState) {
  const state = downloadState || 'none';
  const downloadLabel = state === 'downloaded' ? '✓' : state === 'downloading' ? '…' : '⬇';
  const downloadTitle = state === 'downloaded'
    ? 'Downloaded — tap to remove'
    : state === 'downloading'
    ? 'Downloading…'
    : 'Download for offline';
  const totalLabel = formatDurationLabel(ep.durationSeconds) || '—';
  let remainingLabel = '';
  if (Number.isFinite(ep.durationSeconds) && progress.percent > 0 && progress.percent < 100) {
    const remainSec = Math.round(ep.durationSeconds * (100 - progress.percent) / 100);
    const r = formatDurationLabel(remainSec);
    if (r) remainingLabel = `${r} left`;
  }
  card.innerHTML = `
    <div class="ep-progress-bar" style="width: ${progress.percent}%"></div>
    <div class="ep-header">
      <span class="ep-number">EPISODE ${ep.id}</span>
      ${isComplete ? '<span class="ep-status completed">Complete</span>' : inProgress ? `<span class="ep-status in-progress">${progress.percent}%</span>` : ''}
      <button class="ep-download-btn ${state}" type="button" data-action="download" data-ep-id="${ep.id}" title="${downloadTitle}" aria-label="${downloadTitle}">${downloadLabel}</button>
    </div>
    <div class="ep-title">${escapeHtml(ep.title)}</div>
    <div class="ep-subtitle">${escapeHtml(ep.subtitle)}</div>
    <div class="ep-meta">
      <span>${totalLabel}</span>
      ${remainingLabel ? `<span>${remainingLabel}</span>` : ''}
    </div>
  `;
}

export function renderTranscriptLine(div, line) {
  if (line.type === 'direction') {
    div.innerHTML = `<div class="text">${escapeHtml(line.text)}</div>`;
  } else {
    div.innerHTML = `<div class="speaker">${escapeHtml(line.speaker)}</div><div class="text">${escapeHtml(line.text)}</div>`;
  }
}

export function renderQueueItem(item, episode, podcast, isPlaying, index) {
  return `
    <div class="queue-item ${isPlaying ? 'playing' : ''}" data-index="${index}">
      <div class="queue-number">${index + 1}</div>
      <div class="queue-info">
        <div class="queue-title">${escapeHtml(episode.title)}</div>
        <div class="queue-subtitle">${escapeHtml(podcast.title)}</div>
      </div>
      <button class="queue-remove" data-index="${index}">×</button>
    </div>
  `;
}

export function renderChapterItem(item, chap, idx) {
  const startTime = formatClockFromMinutes(chap.startMinute);
  const durationLabel = `${chap.duration} min`;
  item.innerHTML = `
    <div class="chapter-number">${idx + 1}</div>
    <div class="chapter-info">
      <div class="chapter-title">${escapeHtml(chap.title)}</div>
      <div class="chapter-time">${startTime} · ${durationLabel}</div>
    </div>
  `;
}

export function renderBookmarkItem(item, bm, preview) {
  item.innerHTML = `
    <div class="bookmark-content">
      <div class="bookmark-position">Line ${bm.lineIndex + 1}</div>
      <div class="bookmark-note">${escapeHtml(bm.note || 'Bookmark')}</div>
      <div class="bookmark-preview">${escapeHtml(preview)}</div>
    </div>
    <button class="bookmark-delete" data-ts="${bm.timestamp}">×</button>
  `;
}
