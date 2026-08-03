import { escapeHtml } from '../security/sanitize.js?v=2.3.0%2B20260803T182016Z';
import { generatePodcastArtwork, getShowIdentity } from './artwork.js?v=2.3.0%2B20260803T182016Z';

// Hand-drawn inline SVG glyphs (1.8px round strokes — the shared .icon
// language from player.css). No emoji glyphs in list chrome.
const ICON_DOWNLOAD = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4.5v10"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/></svg>';
const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5.5 12.5 4.5 4.5 8.5-9.5"/></svg>';
const ICON_CHECK_SMALL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 5 5 9-10"/></svg>';

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
  // Generated cover art (identity engine, DESIGN.md §5); falls back to the
  // emoji tile only if canvas is unavailable.
  const artUrl = generatePodcastArtwork(podcast);
  const artTile = artUrl
    ? `<img class="podcast-icon" src="${artUrl}" alt="" loading="lazy">`
    : `<div class="podcast-icon">${escapeHtml(podcast.icon || '🎙️')}</div>`;
  // The card carries its show hue (the artwork's seed) so CSS can derive
  // the corner tint and progress ink by formula — DESIGN.md §3.
  if (card?.style?.setProperty) {
    card.style.setProperty('--card-hue', String(getShowIdentity(podcast).hue));
  }
  const started = Number.isFinite(avgProgress) && avgProgress > 0;
  card.innerHTML = `
    <div class="podcast-card-header">
      ${artTile}
      <div class="podcast-info">
        <div class="podcast-title">${escapeHtml(podcast.title)}</div>
        <div class="podcast-subtitle">${escapeHtml(podcast.subtitle)}</div>
        <div class="podcast-meta">
          <span>${epCount} episodes</span>
          <span aria-hidden="true">·</span>
          <span>${totalLabel}</span>
          ${started ? `<span class="podcast-progress-pct">${avgProgress}%</span>` : ''}
        </div>
      </div>
    </div>
    <div class="podcast-progress-bar${started ? '' : ' empty'}" aria-hidden="true">
      <div class="podcast-progress-fill" style="width: ${avgProgress}%"></div>
    </div>
  `;
}

export function renderEpisodeCard(card, ep, progress, isComplete, inProgress, downloadState) {
  const state = downloadState || 'none';
  const downloadGlyph = state === 'downloaded' ? ICON_CHECK : ICON_DOWNLOAD;
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
  // Played / in-progress state chips; the mini progress meter renders
  // (hidden when idle) so sorting by progress can always read the width.
  const statusChip = isComplete
    ? `<span class="ep-status completed">${ICON_CHECK_SMALL}Played</span>`
    : inProgress
    ? `<span class="ep-status in-progress">${progress.percent}%</span>`
    : '';
  card.innerHTML = `
    <div class="ep-header">
      <span class="ep-number">Episode ${ep.id}</span>
      ${statusChip}
      <button class="ep-download-btn ${state}" type="button" data-action="download" data-ep-id="${ep.id}" title="${downloadTitle}" aria-label="${downloadTitle}">${downloadGlyph}</button>
    </div>
    <div class="ep-title">${escapeHtml(ep.title)}</div>
    <div class="ep-subtitle">${escapeHtml(ep.subtitle)}</div>
    <div class="ep-meta">
      <span>${totalLabel}</span>
      <span class="ep-mini-progress"${inProgress ? '' : ' hidden'} aria-hidden="true"><span class="ep-progress-bar" style="width: ${progress.percent}%"></span></span>
      ${remainingLabel ? `<span class="ep-remaining">${remainingLabel}</span>` : ''}
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
    <div class="queue-item ${isPlaying ? 'playing' : ''}" data-index="${index}" role="button" tabindex="0" aria-label="Play from queue: ${escapeHtml(episode.title)}">
      <div class="queue-number" aria-hidden="true">${index + 1}</div>
      <div class="queue-info">
        <div class="queue-title">${escapeHtml(episode.title)}</div>
        <div class="queue-subtitle">${escapeHtml(podcast.title)}</div>
      </div>
      <button class="queue-remove" data-index="${index}" aria-label="Remove ${escapeHtml(episode.title)} from queue">×</button>
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
    <div class="bookmark-content" role="button" tabindex="0" aria-label="Jump to bookmark at line ${bm.lineIndex + 1}: ${escapeHtml(bm.note || 'Bookmark')}">
      <div class="bookmark-position">Line ${bm.lineIndex + 1}</div>
      <div class="bookmark-note">${escapeHtml(bm.note || 'Bookmark')}</div>
      <div class="bookmark-preview">${escapeHtml(preview)}</div>
    </div>
    <button class="bookmark-delete" data-ts="${bm.timestamp}" aria-label="Delete bookmark at line ${bm.lineIndex + 1}">×</button>
  `;
}
