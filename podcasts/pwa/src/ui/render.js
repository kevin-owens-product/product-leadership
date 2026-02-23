import { escapeHtml, safeColor } from '../security/sanitize.js';

export function setStaticHtml(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

export function renderPodcastCard(card, podcast, epCount, avgProgress) {
  const color = safeColor(podcast.color || '#6366f1');
  card.innerHTML = `
    <div class="podcast-card-header">
      <div class="podcast-icon" style="background: ${color}20; color: ${color}">${escapeHtml(podcast.icon || '🎙️')}</div>
      <div class="podcast-info">
        <div class="podcast-title">${escapeHtml(podcast.title)}</div>
        <div class="podcast-subtitle">${escapeHtml(podcast.subtitle)}</div>
        <div class="podcast-meta">
          <span>${epCount} episodes</span>
          <span>~${epCount * 60} min</span>
        </div>
      </div>
    </div>
    <div class="podcast-progress-bar">
      <div class="podcast-progress-fill" style="width: ${avgProgress}%"></div>
    </div>
  `;
}

export function renderEpisodeCard(card, ep, progress, isComplete, inProgress) {
  card.innerHTML = `
    <div class="ep-progress-bar" style="width: ${progress.percent}%"></div>
    <div class="ep-header">
      <span class="ep-number">EPISODE ${ep.id}</span>
      ${isComplete ? '<span class="ep-status completed">Complete</span>' : inProgress ? `<span class="ep-status in-progress">${progress.percent}%</span>` : ''}
    </div>
    <div class="ep-title">${escapeHtml(ep.title)}</div>
    <div class="ep-subtitle">${escapeHtml(ep.subtitle)}</div>
    <div class="ep-meta">
      <span>~60 min</span>
      ${progress.percent > 0 ? `<span>${Math.round((100 - progress.percent) * 0.6)} min left</span>` : ''}
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
  item.innerHTML = `
    <div class="chapter-number">${idx + 1}</div>
    <div class="chapter-info">
      <div class="chapter-title">${escapeHtml(chap.title)}</div>
      <div class="chapter-time">~${chap.duration} min</div>
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
