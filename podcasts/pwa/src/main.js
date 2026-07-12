import { safeColor } from './security/sanitize.js';
import { applyLiteralHighlight, includesQuery } from './search/transcript-search.js';
import {
    STORAGE_KEY,
    STATE_SCHEMA_VERSION,
    loadAppState,
    saveAppState,
    loadQueue,
    saveQueue,
    loadListeningStats,
    saveListeningStats
} from './state/storage.js';
import { buildBookmarksExport, buildProgressExport, downloadJSON } from './share-export/export.js';
import { bindNavTabs } from './ui/tabs.js';
import { registerServiceWorker } from './sw/register-sw.js';
import { createPlaybackSessionController } from './playback/controller.js';
import { createSpeechPlayers } from './playback/audio.js';
import { parseChaptersFromContent, extractEpisodeDurationMinutes } from './playback/chapters.js';
import {
    renderPodcastCard,
    renderEpisodeCard,
    renderTranscriptLine,
    renderQueueItem,
    renderChapterItem,
    renderBookmarkItem
} from './ui/render.js';
import { createScrubber, bufferedEndFraction } from './ui/scrubber.js';
import { createRepeatSkipper } from './ui/long-press.js';
import { getShowSpeed, setShowSpeed, clampSpeed, SPEED_PREFS_KEY } from './state/speed-prefs.js';
import { transitionViews, spawnRipple, showSkipFlyout, prefersReducedMotion } from './ui/motion.js';
import { createNowPlayingVisualizer } from './playback/visualizer.js';
import { createTranscriptFollow } from './ui/transcript-follow.js';
import { sleepFadeVolume, sleepRemainingSeconds } from './playback/sleep-timer.js';
import { findNextUp } from './state/queue-next.js';
import { createToastManager } from './ui/toast.js';

// Queue-able notifications with retry actions — the user-visible surface for
// audio load failures, offline-download failures, and app updates.
const toasts = createToastManager({ container: document.getElementById('toast-region') });

// ===== APP VERSION =====
const VERSION_STORAGE_KEY = 'tlu_app_seen_version';
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
    VERSION_STORAGE_KEY,
    STORAGE_KEY,
    'playQueue',
    'listeningStats',
    'skipForwardInterval',
    'skipBackwardInterval',
    'skipLargeForwardInterval',
    'skipLargeBackwardInterval',
    SPEED_PREFS_KEY,
    'voiceBoostEnabled',
    'silenceTrimEnabled',
    'theme'
];
let APP_VERSION = localStorage.getItem(VERSION_STORAGE_KEY) || '0.0.0';

function updateVersionBadge() {
    const badge = document.getElementById('version-badge');
    if (badge) {
        // Strip the build-id suffix (everything after the '+') for display;
        // the full version still lives in localStorage / version.json.
        const display = APP_VERSION.split('+')[0];
        badge.textContent = 'v' + display;
        badge.title = 'v' + APP_VERSION;
    }
}

function setAppVersion(version) {
    if (typeof version !== 'string' || !version.trim()) return;
    APP_VERSION = version.trim();
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
    updateVersionBadge();
}

// ===== AUTO-UPDATE CHECK =====
// Runs immediately - fetches version from server bypassing all caches
// If version mismatch, clears everything and reloads
(async function checkForUpdates() {
    try {
        const response = await fetch('version.json?_=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (response.ok) {
            const data = await response.json();
            const serverVersion = (typeof data.version === 'string' && data.version.trim())
                ? data.version.trim()
                : APP_VERSION;
            const localVersion = localStorage.getItem(VERSION_STORAGE_KEY);
            console.log('Version check - Local:', localVersion || APP_VERSION, 'Server:', serverVersion);

            if (localVersion && serverVersion !== localVersion) {
                console.log('Update available! Clearing caches and reloading...');
                localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);

                // Unregister all service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                }

                // Clear all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        await caches.delete(name);
                    }
                }

                // Hard reload
                window.location.reload();
                return;
            }

            setAppVersion(serverVersion);
        }
    } catch (e) {
        console.log('Version check skipped (offline?):', e.message);
    }
    updateVersionBadge();
})();

// Flag to track if podcasts are loaded
let podcastsLoaded = false;

// Load podcasts.js with cache-busting pinned to the deployed build.
// build-episodes.js substitutes the real version into the placeholder below
// (same mechanism as sw.js); when running unbuilt source, fall back to the
// last-seen app version so the URL is still stable across reloads.
const BUILD_VERSION = '__BUILD_VERSION__';
function loadPodcastsScript() {
    const cacheKey = BUILD_VERSION.includes('__') ? APP_VERSION : BUILD_VERSION;
    const script = document.createElement('script');
    script.src = 'podcasts.js?v=' + encodeURIComponent(cacheKey);
    script.onload = function() {
        const podcasts = Array.isArray(window.PODCASTS) ? window.PODCASTS : [];
        console.log('podcasts.js loaded, PODCASTS:', podcasts.length + ' podcasts');
        podcastsLoaded = true;
        // Re-render now that podcasts are loaded
        if (typeof renderPodcastsList === 'function') {
            renderPodcastsList();
        }
    };
    script.onerror = function() {
        console.error('Failed to load podcasts.js');
        script.remove();
        document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">Failed to load podcasts. Try refreshing.</p>';
        toasts.show('Couldn’t load the podcast library', {
            actionLabel: 'Retry',
            onAction: loadPodcastsScript
        });
    };
    document.head.appendChild(script);
}
loadPodcastsScript();

// ===== STATE =====
// Default accent — keep in sync with --accent in index.html.
const DEFAULT_ACCENT = '#5a5df0';
let currentPodcast = null;
let currentEpisode = null;
let dialogueLines = [];
let currentLineIndex = 0;
let currentAudioManifestBase = '';
let isPlaying = false;
let isPaused = false;
let speechRate = 1.0;
let autoPlayNext = true;
// Sleep timer: either a wall-clock end time (minute presets) or an
// end-of-episode stop. Not persisted — a reload cancels the timer, which is
// what every polished podcast app does. sleepBaseVolume remembers the user's
// volume so we can restore it after the fade-out.
let sleepTimerEndTime = null;
let sleepAtEpisodeEnd = false;
let sleepBaseVolume = null;
let searchMatches = [];
let searchIndex = 0;
const SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
const BRACKET_CUE_LINE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s*[-:]\s*[^\]]+)?\]$/i;
let mediaSessionHandlersInitialized = false;
let lineOffsets = [];
let episodeAudioDuration = 0;
let lastPersistedLine = -1;
// epKey strings (`${podcast.id}-${episode.id}`) that the user has downloaded
// or is currently downloading. The downloaded set is persisted; downloading
// is transient so a refresh-mid-download just shows the episode as undownloaded.
let downloadedEpisodes = new Set(JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]'));
let downloadingEpisodes = new Set();
// Per-podcast lockscreen artwork (data URLs), generated on demand.
const podcastArtworkCache = new Map();
let lastPrebufferedEpKey = null;

const playbackSessions = createPlaybackSessionController();

// New feature state
let skipForwardInterval = parseInt(localStorage.getItem('skipForwardInterval') || '10');
let skipBackwardInterval = parseInt(localStorage.getItem('skipBackwardInterval') || '10');
let skipLargeForwardInterval = parseInt(localStorage.getItem('skipLargeForwardInterval') || '30');
let skipLargeBackwardInterval = parseInt(localStorage.getItem('skipLargeBackwardInterval') || '30');
let voiceBoostEnabled = localStorage.getItem('voiceBoostEnabled') === 'true';
let silenceTrimEnabled = localStorage.getItem('silenceTrimEnabled') === 'true';
let currentTheme = localStorage.getItem('theme') || 'dark';
let currentFilter = 'all';
let currentSort = 'default';
let playQueue = loadQueue();
let listeningStats = loadListeningStats();

function getPodcasts() {
    return Array.isArray(window.PODCASTS) ? window.PODCASTS : [];
}

function activateCardWithKeyboard(card, callback) {
    card.addEventListener('keydown', (event) => {
        if (event.target.closest('button, input, select, textarea, a')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        callback(event);
    });
}

function setPressedState(elementOrId, pressed) {
    const el = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
    if (!el) return;
    el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

function updateToggleButton(id, pressed, labelText) {
    const button = document.getElementById(id);
    if (!button) return;
    button.classList.toggle('active', pressed);
    setPressedState(button, pressed);
    const label = button.querySelector('span');
    if (label) label.textContent = labelText;
}

// Both play/pause buttons (player + mini) share the same morphing SVG icon;
// the `.playing` class drives the CSS cross-morph (≤200ms, disabled under
// prefers-reduced-motion).
function setPlayButtonState(playing) {
    ['play-btn', 'mini-play-btn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('playing', Boolean(playing));
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    });
}

function updateSpeedPresetButtons() {
    document.querySelectorAll('.speed-preset-btn').forEach(b => {
        const isActive = Math.abs(parseFloat(b.dataset.speed) - speechRate) < 0.01;
        b.classList.toggle('active', isActive);
        setPressedState(b, isActive);
    });
}

// Single entry point for speed changes (slider, presets, per-show restore).
// Keeps the button label, popover slider, live audio rate, per-show memory,
// and Media Session position state all in sync.
function applySpeechRate(rate, { persistShow = true, save = true } = {}) {
    speechRate = clampSpeed(rate, speechRate);
    const label = `${speechRate.toFixed(1)}x`;
    const slider = document.getElementById('speed-slider');
    if (slider) slider.value = speechRate;
    const btnValue = document.getElementById('speed-value');
    if (btnValue) btnValue.textContent = label;
    const popValue = document.getElementById('speed-popover-value');
    if (popValue) popValue.textContent = label;
    updateSpeedPresetButtons();
    speechPlayers.setRate(speechRate);
    if (persistShow && currentPodcast) setShowSpeed(currentPodcast.id, speechRate);
    if (save) saveState();
    updateMediaSessionPositionState();
}

// The podcast that owns the loaded episode. `currentPodcast` follows the
// user's browsing context (it changes when they open another show from home
// while audio keeps playing); `playerPodcast` always matches `currentEpisode`
// so the mini player and expand-to-player flow stay correct.
let playerPodcast = null;

// ===== VIEW SWITCHING =====
// Single entry point for screen changes. Wraps the swap in a View Transition
// (graceful fallback + reduced-motion no-op handled by transitionViews) and
// keeps the bottom mini player's visibility in sync with the active screen.
const VIEW_IDS = ['podcasts-view', 'list-view', 'player-view'];

function showView(viewId, { transition = true } = {}) {
    const apply = () => {
        VIEW_IDS.forEach((id) => {
            document.getElementById(id)?.classList.toggle('active', id === viewId);
        });
        updateMiniPlayerVisibility();
    };
    if (transition) {
        transitionViews(apply);
    } else {
        apply();
    }
}

// The mini player lives on every non-player screen whenever an episode is
// loaded (playing OR paused — like Overcast/Pocket Casts). The body class
// gives scrolling views extra bottom padding so content clears the bar.
function updateMiniPlayerVisibility() {
    const playerActive = document.getElementById('player-view')?.classList.contains('active');
    const show = Boolean(playerPodcast && currentEpisode) && !playerActive;
    document.getElementById('mini-player')?.classList.toggle('active', show);
    document.body.classList.toggle('has-mini-player', show);
    if (show) updateMiniPlayer();
}

// Wake Lock API for keeping screen on during playback
let wakeLock = null;

// Request wake lock to prevent device from sleeping
async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
        console.log('Wake Lock API not supported');
        return;
    }

    // Don't request if already acquired
    if (wakeLock && !wakeLock.released) {
        console.log('Wake Lock already active');
        return;
    }

    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock acquired');

        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released');

            // Auto re-acquire if playback is still active
            if (isPlaying && !isPaused && !document.hidden) {
                console.log('Re-acquiring Wake Lock for active playback');
                setTimeout(() => requestWakeLock(), 100);
            }
        });
    } catch (err) {
        console.warn('Wake Lock request failed:', err);
    }
}

// Release wake lock when playback stops
async function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock released manually');
        } catch (err) {
            console.warn('Wake Lock release failed:', err);
        }
    }
}

// (Background-audio keep-alive hack was removed; combined.mp3 is now played as
// a single continuous <audio> element so iOS/Android keep playing through
// lockscreen and tab backgrounding without any tone trickery.)

// === Offline downloads ===

function episodeBasename(episode) {
    const f = episode.file || episode.filename || '';
    return String(f).replace(/\.md$/, '');
}

function combinedAudioUrl(podcastId, episode) {
    return `audio/${podcastId}/${episodeBasename(episode)}/combined.mp3`;
}

function manifestAudioUrl(podcastId, episode) {
    return `audio/${podcastId}/${episodeBasename(episode)}/manifest.json`;
}

function withCacheKey(url, cacheKey) {
    if (!cacheKey) return url;
    return `${url}?v=${encodeURIComponent(cacheKey)}`;
}

function epKeyOf(podcast, episode) {
    return `${podcast.id}-${episode.id}`;
}

function persistDownloadedEpisodes() {
    try {
        localStorage.setItem('downloadedEpisodes', JSON.stringify([...downloadedEpisodes]));
    } catch (err) {
        console.warn('Could not persist downloadedEpisodes:', err);
    }
}

function isEpisodeDownloaded(podcast, episode) {
    return downloadedEpisodes.has(epKeyOf(podcast, episode));
}

function isEpisodeDownloading(podcast, episode) {
    return downloadingEpisodes.has(epKeyOf(podcast, episode));
}

// Send a message to the active service worker and wait for its reply via
// MessageChannel. Resolves to null if there's no controller (e.g. SW not yet
// installed) so callers can fall back to a no-op gracefully.
function sendSwMessage(message) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data);
        try {
            navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
        } catch (err) {
            console.warn('SW message failed:', err);
            resolve(null);
        }
    });
}

async function downloadEpisode(podcast, episode) {
    const epKey = epKeyOf(podcast, episode);
    if (downloadedEpisodes.has(epKey) || downloadingEpisodes.has(epKey)) return;
    downloadingEpisodes.add(epKey);
    renderEpisodeList(document.getElementById('episode-search')?.value || '');
    try {
        const episodeFile = episode.file || episode.filename || null;
        const audioManifest = await loadSupertonicAudioManifest(podcast.id, episodeFile);
        if (!audioManifest) {
            setStatus('Download failed — audio is not available yet');
            toasts.show(`Download failed — audio for "${episode.title}" isn’t available`, {
                actionLabel: 'Retry',
                onAction: () => { void downloadEpisode(podcast, episode); }
            });
            return;
        }
        const urls = [
            new URL(withCacheKey(combinedAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString(),
            new URL(withCacheKey(manifestAudioUrl(podcast.id, episode), audioManifest.cacheKey), location.href).toString()
        ];
        const reply = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls });
        const allOk = reply && Array.isArray(reply.results) && reply.results.every((r) => r.ok);
        if (!allOk) {
            const failed = reply && reply.results ? reply.results.filter((r) => !r.ok).map((r) => r.url).join(', ') : '(no SW)';
            console.warn('Episode download failed for', failed);
            setStatus('Download failed — try again');
            toasts.show(`Download failed for "${episode.title}"`, {
                actionLabel: 'Retry',
                onAction: () => { void downloadEpisode(podcast, episode); }
            });
            return;
        }
        downloadedEpisodes.add(epKey);
        persistDownloadedEpisodes();
        setStatus(`Downloaded "${episode.title}"`);
    } finally {
        downloadingEpisodes.delete(epKey);
        renderEpisodeList(document.getElementById('episode-search')?.value || '');
    }
}

async function deleteDownloadedEpisode(podcast, episode) {
    const epKey = epKeyOf(podcast, episode);
    if (!downloadedEpisodes.has(epKey)) return;
    const urls = [
        new URL(combinedAudioUrl(podcast.id, episode), location.href).toString(),
        new URL(manifestAudioUrl(podcast.id, episode), location.href).toString()
    ];
    await sendSwMessage({ type: 'DELETE_AUDIO_URLS', urls });
    downloadedEpisodes.delete(epKey);
    persistDownloadedEpisodes();
    renderEpisodeList(document.getElementById('episode-search')?.value || '');
    setStatus(`Removed download "${episode.title}"`);
}

// Reconcile our localStorage set against what's actually in the SW cache so
// the UI doesn't show stale "downloaded" badges after a cache eviction.
async function reconcileDownloadedEpisodes() {
    const reply = await sendSwMessage({ type: 'LIST_OFFLINE_AUDIO' });
    if (!reply || !Array.isArray(reply.urls)) return;
    const haveSet = new Set();
    for (const fullUrl of reply.urls) {
        const m = fullUrl.match(/\/audio\/([^/]+)\/([^/]+)\/combined\.mp3/);
        if (!m) continue;
        const podcastId = m[1];
        const basename = m[2];
        const podcasts = getPodcasts();
        const podcast = podcasts.find((p) => p.id === podcastId);
        if (!podcast) continue;
        const ep = podcast.episodes.find((e) => episodeBasename(e) === basename);
        if (ep) haveSet.add(`${podcastId}-${ep.id}`);
    }
    const before = downloadedEpisodes.size;
    downloadedEpisodes = haveSet;
    persistDownloadedEpisodes();
    if (haveSet.size !== before) {
        renderEpisodeList(document.getElementById('episode-search')?.value || '');
    }
}

// === Inline resume prompt (replaces window.confirm) ===

let pendingResumeLine = null;

function hideResumeBanner() {
    pendingResumeLine = null;
    const banner = document.getElementById('resume-banner');
    if (banner) banner.hidden = true;
}

function showResumeBanner(resumedFromLine, percent) {
    const banner = document.getElementById('resume-banner');
    if (!banner) return;
    if (!Number.isInteger(resumedFromLine) || resumedFromLine <= 0) {
        banner.hidden = true;
        pendingResumeLine = null;
        return;
    }
    // Stash the resumed-from line so "Start from beginning" can confirm restart.
    pendingResumeLine = resumedFromLine;
    const text = document.getElementById('resume-banner-text');
    if (text) {
        const pctLabel = Number.isFinite(percent) && percent > 0 ? ` (${percent}%)` : '';
        text.textContent = `Resumed where you left off${pctLabel}`;
    }
    banner.hidden = false;
}

document.addEventListener('click', (event) => {
    if (event.target.closest('#resume-banner-start')) {
        hideResumeBanner();
        void jumpToLine(0, false);
    } else if (event.target.closest('#resume-banner-close')) {
        hideResumeBanner();
    }
});

// === Per-podcast lockscreen artwork (canvas-generated) ===

function generatePodcastArtwork(podcast) {
    if (!podcast) return null;
    const cached = podcastArtworkCache.get(podcast.id);
    if (cached) return cached;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const color = podcast.color || DEFAULT_ACCENT;
    // Background: vertical gradient from podcast color to a darker shade
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shadeHex(color, -0.35));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Big emoji centered
    const icon = podcast.icon || '🎙️';
    ctx.font = '300px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, size / 2, size / 2 - 30);
    // Title bar across the bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, size - 96, size, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 36px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const title = (podcast.title || '').slice(0, 26);
    ctx.fillText(title, size / 2, size - 48);
    let dataUrl;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
        console.warn('Artwork generation failed:', err);
        return null;
    }
    podcastArtworkCache.set(podcast.id, dataUrl);
    return dataUrl;
}

// Adjust a hex color toward black (amount<0) or white (amount>0). Tolerant of
// short (#abc) and long (#aabbcc) forms; returns input unchanged on parse fail.
function shadeHex(hex, amount) {
    const m = String(hex).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return hex;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const adjust = (v) => {
        const target = amount < 0 ? 0 : 255;
        const next = v + (target - v) * Math.abs(amount);
        return Math.max(0, Math.min(255, Math.round(next)));
    };
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

// === Chapter markers on the scrubber ===

function renderChapterMarkers() {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    bar.querySelectorAll('.chapter-marker').forEach((el) => el.remove());
    if (!Array.isArray(chapters) || chapters.length <= 1) return;
    const total = episodeAudioDuration > 0
        ? episodeAudioDuration
        : (lineOffsets.length > 0 ? lineOffsets[lineOffsets.length - 1] : 0);
    const lineCount = dialogueLines.length || 1;
    chapters.forEach((chap, idx) => {
        if (idx === 0) return; // skip the marker at 0%
        let pct;
        if (total > 0 && Number.isInteger(chap.lineIndex) && chap.lineIndex < lineOffsets.length) {
            pct = (lineOffsets[chap.lineIndex] / total) * 100;
        } else if (Number.isInteger(chap.lineIndex)) {
            pct = (chap.lineIndex / lineCount) * 100;
        } else {
            return;
        }
        if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return;
        const marker = document.createElement('div');
        marker.className = 'chapter-marker';
        marker.style.left = `${pct}%`;
        marker.title = chap.title || `Chapter ${idx + 1}`;
        bar.appendChild(marker);
    });
}

// === Next-episode pre-buffer ===

function maybePrebufferNextEpisode() {
    if (!currentPodcast || !currentEpisode) return;
    if (!speechPlayers.isContinuousReady()) return;
    const duration = speechPlayers.getDuration();
    const position = speechPlayers.getCurrentTime();
    if (!duration || duration - position > 30) return;
    const next = getNextUp();
    if (!next) return;
    const nextKey = epKeyOf(next.podcast, next.episode);
    if (lastPrebufferedEpKey === nextKey) return;
    lastPrebufferedEpKey = nextKey;
    // Fire-and-forget: warms the browser HTTP cache so auto-play starts
    // without a network round-trip when this episode ends.
    const url = combinedAudioUrl(next.podcast.id, next.episode);
    fetch(url, { mode: 'no-cors' }).catch(() => { /* ignore */ });
}

// What plays after the current episode: queue first, then the next
// sequential episode in the current show.
function getNextUp() {
    return findNextUp({
        queue: playQueue,
        podcasts: getPodcasts(),
        currentPodcastId: currentPodcast?.id ?? null,
        currentEpisodeId: currentEpisode?.id ?? null
    });
}

// ===== PODCASTS HOME =====
function renderPodcastsList(filter = '') {
    // Update version badge
    updateVersionBadge();

    const podcasts = getPodcasts();
    if (podcasts.length === 0) {
        if (!podcastsLoaded) {
            document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">Loading podcasts...</p>';
            document.getElementById('podcast-count').textContent = 'Loading...';
        } else {
            document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">No podcasts found. Try refreshing.</p>';
            document.getElementById('podcast-count').textContent = '0 podcasts loaded';
        }
        return;
    }

    // Show podcast count
    const totalEpisodes = podcasts.reduce((sum, p) => sum + p.episodes.length, 0);
    document.getElementById('podcast-count').textContent = `${podcasts.length} podcasts · ${totalEpisodes} episodes`;

    const state = loadState();
    const listEl = document.getElementById('podcasts-list');
    listEl.innerHTML = '';

    const filterLower = filter.toLowerCase();

    let matched = 0;
    podcasts.forEach(podcast => {
        if (filter && !podcast.title.toLowerCase().includes(filterLower) &&
            !podcast.subtitle.toLowerCase().includes(filterLower)) {
            return;
        }
        matched++;

        // Calculate podcast progress
        let totalProgress = 0;
        const epCount = podcast.episodes.length;
        podcast.episodes.forEach(ep => {
            const epKey = `${podcast.id}-${ep.id}`;
            const progress = state.episodeProgress?.[epKey] || { percent: 0 };
            const isComplete = state.completedEpisodes?.includes(epKey);
            totalProgress += isComplete ? 100 : progress.percent;
        });
        const avgProgress = epCount > 0 ? Math.round(totalProgress / epCount) : 0;

        const card = document.createElement('div');
        card.className = 'podcast-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Open ${podcast.title}, ${epCount} episodes`);
        renderPodcastCard(card, podcast, epCount, avgProgress);

        card.addEventListener('click', () => openPodcast(podcast));
        activateCardWithKeyboard(card, () => openPodcast(podcast));
        listEl.appendChild(card);
    });

    if (filter && matched === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-items';
        empty.style.padding = '20px';
        empty.textContent = `No podcasts match "${filter}".`;
        listEl.appendChild(empty);
    }

    // Add "Create Podcast" card
    const addCard = document.createElement('div');
    addCard.className = 'add-podcast-card';
    addCard.tabIndex = 0;
    addCard.setAttribute('role', 'button');
    addCard.setAttribute('aria-label', 'Create your own podcast');
    addCard.innerHTML = `
        <div class="add-podcast-icon">+</div>
        <div class="add-podcast-text">Create Your Own Podcast</div>
    `;
    const openCreateModal = () => {
        document.getElementById('create-modal').classList.add('show');
    };
    addCard.addEventListener('click', openCreateModal);
    activateCardWithKeyboard(addCard, openCreateModal);
    listEl.appendChild(addCard);
}

function openPodcast(podcast, { transition = true } = {}) {
    currentPodcast = podcast;
    // Each show remembers its own playback speed (falls back to the current
    // global rate for shows without a saved preference).
    applySpeechRate(getShowSpeed(podcast.id, speechRate), { persistShow: false, save: false });
    document.getElementById('current-podcast-title').textContent = podcast.title;
    document.getElementById('current-podcast-subtitle').textContent = podcast.subtitle;
    document.getElementById('nav-podcast-name').textContent = podcast.title;

    // Update accent color. --accent-text is a lightened shade for
    // accent-colored text on dark surfaces (contrast ≥ 4.5:1); the light
    // theme shadows it with its own darker value in CSS.
    const accent = safeColor(podcast.color || DEFAULT_ACCENT);
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-text', shadeHex(accent, 0.4));

    renderEpisodeList();
    showView('list-view', { transition });
}

document.getElementById('back-to-podcasts').addEventListener('click', () => {
    saveState();
    if (!currentEpisode) {
        // Nothing loaded — fully reset context. When an episode is loaded we
        // keep playback (and the mini player) alive across navigation, like
        // any polished podcast app.
        void stopPlayback();
        currentPodcast = null;
        // Back to the stylesheet defaults for both accent variables.
        document.documentElement.style.removeProperty('--accent');
        document.documentElement.style.removeProperty('--accent-text');
    }
    renderPodcastsList();
    showView('podcasts-view');
});

document.getElementById('podcast-search').addEventListener('input', e => {
    renderPodcastsList(e.target.value);
});

document.getElementById('close-create-modal').addEventListener('click', () => {
    document.getElementById('create-modal').classList.remove('show');
});

function saveState() {
    const existing = loadState();
    const state = {
        ...existing,
        schemaVersion: STATE_SCHEMA_VERSION,
        episodeProgress: {},
        completedEpisodes: [],
        bookmarks: {},
        speechRate,
        autoPlayNext
    };

    // Save current podcast/episode
    if (currentPodcast) {
        state.currentPodcastId = currentPodcast.id;
    }
    if (currentEpisode) {
        state.currentEpisodeId = currentEpisode.id;
        state.currentLineIndex = currentLineIndex;
    }

    // Get existing progress
    if (existing.episodeProgress) {
        state.episodeProgress = existing.episodeProgress;
    }
    if (existing.completedEpisodes) {
        state.completedEpisodes = existing.completedEpisodes;
    }
    if (existing.bookmarks) {
        state.bookmarks = existing.bookmarks;
    }

    // Update current episode progress (with podcast-scoped key)
    if (currentPodcast && currentEpisode && dialogueLines.length > 0) {
        const epKey = `${currentPodcast.id}-${currentEpisode.id}`;
        const pct = Math.round((currentLineIndex / dialogueLines.length) * 100);
        state.episodeProgress[epKey] = {
            line: currentLineIndex,
            percent: pct,
            timestamp: Date.now()
        };

        // Mark complete if >= 98%
        if (pct >= 98 && !state.completedEpisodes.includes(epKey)) {
            state.completedEpisodes.push(epKey);
            // Track in stats
            listeningStats.episodesCompleted += 1;
            saveListeningStats(listeningStats);
        }
    }

    saveAppState(state);
}

function loadState() {
    return loadAppState();
}

function restoreState() {
    const state = loadState();
    if (state.speechRate) {
        applySpeechRate(state.speechRate, { persistShow: false, save: false });
    }
    if (state.autoPlayNext !== undefined) {
        autoPlayNext = state.autoPlayNext;
        updateToggleButton('auto-play-toggle', autoPlayNext, 'Auto');
    }
    return state;
}

// (Voice picker removed: playback uses pre-baked Supertonic audio, so the
// Web Speech API voice selectors no longer affect anything. The preview
// button and the Alex/Sam dropdowns lived here.)

// ===== MARKDOWN PARSING =====
function normalizeSpeakerName(speakerName) {
    return String(speakerName || '').trim().toUpperCase();
}

function isContinuationDialogueLine(trimmed) {
    return Boolean(trimmed) &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('#') &&
        trimmed !== '---';
}

function parseSpeakerVoiceMap(content) {
    const voiceMap = {};
    const mapLine = content.split('\n').find((line) =>
        /^\*\*(?:Speaker\s+Voices?|Voice\s*Map):\*\*/i.test(line.trim())
    );
    if (!mapLine) return voiceMap;

    const matches = mapLine.trim().match(/^\*\*(?:Speaker\s+Voices?|Voice\s*Map):\*\*\s*(.+)$/i);
    if (!matches || !matches[1]) return voiceMap;

    const entries = matches[1].split(/[;,]+/);
    entries.forEach((entry) => {
        const parsed = entry.trim().match(/^(.+?)\s*(?:=|:|->)\s*(alex|sam)\s*$/i);
        if (!parsed) return;
        const speakerName = normalizeSpeakerName(parsed[1]);
        const speakerVoice = parsed[2].toLowerCase();
        if (speakerName) {
            voiceMap[speakerName] = speakerVoice;
        }
    });

    return voiceMap;
}

function parseMarkdown(content, voiceOverrides = {}) {
    const lines = content.split('\n');
    const dialogue = [];
    let currentSpeakerType = null;
    let currentSpeakerLabel = null;
    const speakerMap = {};
    Object.entries(voiceOverrides).forEach(([speaker, voiceType]) => {
        const normalizedSpeaker = normalizeSpeakerName(speaker);
        if ((voiceType === 'alex' || voiceType === 'sam') && normalizedSpeaker) {
            speakerMap[normalizedSpeaker] = voiceType;
        }
    });
    let speakerCount = Object.keys(speakerMap).length;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('|') ||
            trimmed.startsWith('---') || trimmed.startsWith('*Next') || trimmed.startsWith('[Read')) {
            currentSpeakerType = null;
            currentSpeakerLabel = null;
            continue;
        }

        // Match dialogue patterns:
        // - **NAME:** text (standard PodLearn format)
        // - [NAME] text (audio-drama/script format)
        const speakerMatch = trimmed.match(SPEAKER_LINE_RE) || trimmed.match(BRACKET_SPEAKER_LINE_RE);
        const dirMatch = trimmed.match(/^\*?\*?\[(.+)\]\*?\*?$/);

        if (speakerMatch) {
            const speakerName = speakerMatch[1].trim();
            const normalizedSpeaker = normalizeSpeakerName(speakerName);
            const text = (speakerMatch[2] || '').trim();

            // Ignore metadata-like bold labels that are not dialogue lines.
            if (!text) {
                currentSpeakerType = null;
                currentSpeakerLabel = null;
                continue;
            }

            // Assign voice type (alternating between alex and sam voices)
            if (!speakerMap[normalizedSpeaker]) {
                speakerMap[normalizedSpeaker] = speakerCount % 2 === 0 ? 'alex' : 'sam';
                speakerCount++;
            }

            const voiceType = speakerMap[normalizedSpeaker];
            dialogue.push({
                speaker: speakerName,
                text: cleanText(text),
                type: voiceType,
                rawLine: i
            });
            currentSpeakerType = voiceType;
            currentSpeakerLabel = speakerName;
        } else if (dirMatch || BRACKET_CUE_LINE_RE.test(trimmed)) {
            // Stage directions and production cues like [PAUSE] / [MUSIC STING]
            // are not spoken by the TTS layer.
            // dialogue.push({ speaker: '', text: dirMatch[1], type: 'direction' });
            currentSpeakerType = null;
            currentSpeakerLabel = null;
            continue;
        } else if (currentSpeakerType && isContinuationDialogueLine(trimmed)) {
            const continuation = cleanText(trimmed);
            if (continuation) {
                dialogue.push({
                    speaker: currentSpeakerLabel || 'Narration',
                    text: continuation,
                    type: currentSpeakerType,
                    rawLine: i
                });
            }
        }
    }
    return dialogue;
}

function cleanText(text) {
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/```[\s\S]*?```/g, 'code block').trim();
}

// ===== EPISODE LIST =====
function renderEpisodeList(filter = '') {
    if (!currentPodcast || !currentPodcast.episodes) {
        document.getElementById('episode-list').innerHTML = '<p class="loading-text">No episodes found</p>';
        return;
    }

    const episodes = currentPodcast.episodes;
    const state = loadState();
    const listEl = document.getElementById('episode-list');
    listEl.innerHTML = '';

    const filterLower = filter.toLowerCase();
    let totalProgress = 0;
    let shown = 0;

    episodes.forEach(ep => {
        // Filter
        if (filter && !ep.title.toLowerCase().includes(filterLower) &&
            !ep.subtitle.toLowerCase().includes(filterLower)) {
            return;
        }
        shown++;

        const epKey = `${currentPodcast.id}-${ep.id}`;
        const progress = state.episodeProgress?.[epKey] || { percent: 0 };
        const isComplete = state.completedEpisodes?.includes(epKey);
        const inProgress = progress.percent > 0 && progress.percent < 98;

        totalProgress += isComplete ? 100 : progress.percent;

        const card = document.createElement('div');
        card.className = 'episode-card' + (isComplete ? ' completed' : '') + (inProgress ? ' in-progress' : '');
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Play episode ${ep.id}: ${ep.title}`);
        const downloadState = isEpisodeDownloading(currentPodcast, ep)
            ? 'downloading'
            : isEpisodeDownloaded(currentPodcast, ep) ? 'downloaded' : 'none';
        renderEpisodeCard(card, ep, progress, isComplete, inProgress, downloadState);
        const handleEpisodeCardActivation = (event) => {
            const btn = event.target.closest('.ep-download-btn');
            if (btn) {
                event.stopPropagation();
                const state = btn.classList.contains('downloaded')
                    ? 'downloaded'
                    : btn.classList.contains('downloading') ? 'downloading' : 'none';
                if (state === 'downloading') return;
                if (state === 'downloaded') {
                    void deleteDownloadedEpisode(currentPodcast, ep);
                } else {
                    void downloadEpisode(currentPodcast, ep);
                }
                return;
            }
            openEpisode(ep);
        };
        card.addEventListener('click', handleEpisodeCardActivation);
        activateCardWithKeyboard(card, handleEpisodeCardActivation);
        listEl.appendChild(card);
    });

    if (shown === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-items';
        empty.style.padding = '20px';
        empty.textContent = filter
            ? `No episodes match "${filter}".`
            : 'No episodes match this filter.';
        listEl.appendChild(empty);
    }

    // Update total progress badge
    const avgProgress = episodes.length > 0 ? Math.round(totalProgress / episodes.length) : 0;
    document.getElementById('total-progress-badge').textContent = `${avgProgress}% Complete`;
}

// Episode search
document.getElementById('episode-search').addEventListener('input', e => {
    renderEpisodeList(e.target.value);
});

// ===== PLAYER =====
function alignChapterLineIndexes(chapterList, lines) {
    if (!Array.isArray(chapterList) || chapterList.length === 0 || !Array.isArray(lines)) return;
    if (lines.length === 0) {
        chapterList.forEach((chapter) => { chapter.lineIndex = 0; });
        return;
    }

    chapterList.forEach((chapter, idx) => {
        const nextRawLine = chapterList[idx + 1]?.rawLine ?? Number.POSITIVE_INFINITY;
        const lineIndex = lines.findIndex((line) =>
            Number.isInteger(line.rawLine) &&
            line.rawLine > chapter.rawLine &&
            line.rawLine < nextRawLine
        );
        if (lineIndex >= 0) {
            chapter.lineIndex = lineIndex;
        }
    });

    chapterList[0].lineIndex = Math.max(0, chapterList[0].lineIndex || 0);
    for (let i = 1; i < chapterList.length; i += 1) {
        if (chapterList[i].lineIndex < chapterList[i - 1].lineIndex) {
            chapterList[i].lineIndex = chapterList[i - 1].lineIndex;
        }
    }
}

async function loadSupertonicAudioManifest(podcastId, episodeFile) {
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

function stableCacheKey(input) {
    const text = String(input || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function attachAudioUrls(dialogue, manifest) {
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
function buildLineOffsets(dialogue) {
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

async function openEpisode(episode, options = {}) {
    const {
        promptResume = true,
        preferredLine = null
    } = options;
    await stopPlayback();
    currentEpisode = episode;
    playerPodcast = currentPodcast;
    const speakerVoiceMap = parseSpeakerVoiceMap(episode.content);
    dialogueLines = parseMarkdown(episode.content, speakerVoiceMap);
    chapters = parseChapters(episode.content);
    alignChapterLineIndexes(chapters, dialogueLines);

    const podcastId = currentPodcast ? currentPodcast.id : null;
    const episodeFile = episode.file || episode.filename || null;
    const audioManifest = await loadSupertonicAudioManifest(podcastId, episodeFile);
    lineOffsets = [];
    episodeAudioDuration = 0;
    lastPersistedLine = -1;
    if (audioManifest) {
        const matched = attachAudioUrls(dialogueLines, audioManifest);
        currentAudioManifestBase = audioManifest.base;
        if (matched > 0) {
            console.log(`Loaded ${matched}/${dialogueLines.length} Supertonic audio lines from ${audioManifest.base}`);
        } else {
            console.warn(`Supertonic audio manifest found at ${audioManifest.base} but no lines matched`);
        }
        const built = buildLineOffsets(dialogueLines);
        if (built) {
            lineOffsets = built.offsets;
            episodeAudioDuration = built.totalDuration;
            const combinedUrl = withCacheKey(`${audioManifest.base}/combined.mp3`, audioManifest.cacheKey);
            speechPlayers.setEpisode({
                combinedUrl,
                lineOffsets: built.offsets,
                totalDuration: built.totalDuration
            });
            console.log(`Continuous playback ready: ${built.totalDuration.toFixed(1)}s combined.mp3`);
        } else {
            speechPlayers.setEpisode({});
            console.warn('Per-line durations missing from manifest; falling back to chunked playback (no background audio).');
        }
    } else {
        currentAudioManifestBase = '';
        speechPlayers.setEpisode({});
        console.warn(`No Supertonic audio manifest found for ${podcastId || 'unknown podcast'} / ${episodeFile || 'unknown episode'}`);
    }

    // Restore progress (with podcast-scoped key)
    const state = loadState();
    const epKey = currentPodcast ? `${currentPodcast.id}-${episode.id}` : episode.id;
    const progress = state.episodeProgress?.[epKey];
    const savedLine = Number.isInteger(progress?.line) ? progress.line : 0;
    let initialLine = savedLine;

    let resumedFrom = null;
    if (Number.isInteger(preferredLine)) {
        initialLine = preferredLine;
    } else if (
        promptResume &&
        savedLine > 0 &&
        savedLine < Math.max(0, dialogueLines.length - 1)
    ) {
        // Auto-resume from the saved line; the banner just notifies the user
        // and offers a one-tap "Start from beginning" escape hatch.
        initialLine = savedLine;
        resumedFrom = savedLine;
    }

    currentLineIndex = Math.max(0, Math.min(initialLine, Math.max(0, dialogueLines.length - 1)));
    showResumeBanner(resumedFrom, progress?.percent || 0);

    document.getElementById('player-episode-title').textContent = `Ep ${episode.id}: ${episode.title}`;

    // Set breadcrumb navigation
    const podcastName = currentPodcast ? currentPodcast.title : 'Podcast';
    document.getElementById('player-breadcrumb').textContent = `Home › ${podcastName} › Episode ${episode.id}`;

    renderTranscript();
    renderChapters();
    renderChapterMarkers();
    renderBookmarks();
    updateProgress();
    lastPrebufferedEpKey = null;
    hideUpNextBanner();
    setStatus('Ready - Tap play to start');
    syncMediaSession({ includeMetadata: true, includePosition: true });
    updateMiniPlayer();

    showView('player-view');
}

document.getElementById('back-to-list').addEventListener('click', () => {
    hideResumeBanner();
    saveState();
    renderEpisodeList();
    showView('list-view');
});

// Home button from player - go all the way back to podcasts list
document.getElementById('home-from-player').addEventListener('click', () => {
    saveState();
    renderPodcastsList();
    showView('podcasts-view');
});

// ===== TRANSCRIPT =====
// Follow mode: the transcript tracks the current line until the user scrolls
// away, which surfaces the "resync" pill; tapping the pill (or any line) puts
// the transcript back in follow mode.
const transcriptFollow = createTranscriptFollow({
    container: document.getElementById('transcript-content'),
    pill: document.getElementById('transcript-resync'),
    onResync: () => scrollCurrentLineIntoView(true)
});
transcriptFollow.bind();

function scrollCurrentLineIntoView(force = false) {
    if (!force && !transcriptFollow.isFollowing()) return;
    const currentEl = document.querySelector('.transcript-line.current');
    if (!currentEl) return;
    transcriptFollow.notifyAutoScroll();
    currentEl.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center'
    });
}

function renderTranscript() {
    const content = document.getElementById('transcript-content');
    content.innerHTML = '';
    // New episode content: return to follow mode with a fresh scroll baseline.
    transcriptFollow.resync();

    dialogueLines.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = `transcript-line ${line.type}`;
        div.dataset.index = index;
        // Each line is a real control: screen readers announce speaker + text
        // and can activate it to seek (keyboard handled by the delegated
        // keydown on the container below).
        div.tabIndex = 0;
        div.setAttribute('role', 'button');

        renderTranscriptLine(div, line);
        div.addEventListener('click', () => jumpToLine(index));
        content.appendChild(div);
    });

    updateProgress();
}

// Keyboard activation for transcript lines (bound once; lines are re-created
// per episode).
document.getElementById('transcript-content').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const lineEl = event.target.closest('.transcript-line');
    if (!lineEl) return;
    event.preventDefault();
    void jumpToLine(parseInt(lineEl.dataset.index, 10));
});

function formatClock(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
    const total = Math.round(totalSeconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const m = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
    const s = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${m}:${s}` : `${m}:${s}`;
}

function updateProgress() {
    let pct;
    if (speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        const pos = speechPlayers.getCurrentTime();
        pct = dur > 0 ? Math.max(0, Math.min(100, (pos / dur) * 100)) : 0;
        document.getElementById('current-pos').textContent = formatClock(pos);
        document.getElementById('total-pos').textContent = formatClock(dur);
        const remain = Math.max(0, (dur - pos) / Math.max(0.5, speechRate));
        const minsLeft = Math.max(0, Math.round(remain / 60));
        document.getElementById('time-remaining').textContent = minsLeft > 0 ? `${minsLeft} min left` : 'Almost done';
    } else {
        pct = dialogueLines.length > 0 ? (currentLineIndex / dialogueLines.length) * 100 : 0;
        document.getElementById('current-pos').textContent = `Line ${currentLineIndex + 1}`;
        document.getElementById('total-pos').textContent = `of ${dialogueLines.length}`;
        const linesLeft = dialogueLines.length - currentLineIndex;
        const episodeDurationMinutes = currentEpisode?.content ? extractEpisodeDurationMinutes(currentEpisode.content) : null;
        const estimatedSecondsPerLine = (episodeDurationMinutes && dialogueLines.length > 0)
            ? (episodeDurationMinutes * 60) / dialogueLines.length
            : 3;
        const secondsLeft = (linesLeft * estimatedSecondsPerLine) / speechRate;
        const minsLeft = Math.round(secondsLeft / 60);
        document.getElementById('time-remaining').textContent = `~${minsLeft} min left`;
    }
    scrubber.update(pct / 100, scrubLabelFor(pct / 100));
    updateBufferedBar();

    // Update highlighting (aria-current mirrors the visual highlight for
    // screen readers).
    document.querySelectorAll('.transcript-line').forEach((el, i) => {
        const isCurrent = i === currentLineIndex;
        el.classList.toggle('current', isCurrent);
        if (isCurrent) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
    });

    // Scroll into view (only while the transcript is in follow mode).
    scrollCurrentLineIntoView();

    // Periodic save
    if (currentLineIndex % 10 === 0) {
        saveState();
    }

    // Update chapter indicator
    updateCurrentChapter();
    updateMediaSessionPositionState();
}

// Transcript search
function searchTranscript(query) {
    searchMatches = [];
    searchIndex = 0;

    document.querySelectorAll('.transcript-line').forEach(el => {
        el.classList.remove('search-match', 'search-current');
        const textEl = el.querySelector('.text');
        if (textEl) {
            textEl.textContent = textEl.textContent; // Remove highlights
        }
    });

    if (!query) return;

    const queryLower = query.toLowerCase();
    dialogueLines.forEach((line, index) => {
        if (includesQuery(line.text, queryLower)) {
            searchMatches.push(index);
            const el = document.querySelector(`.transcript-line[data-index="${index}"]`);
            if (el) {
                el.classList.add('search-match');
                const textEl = el.querySelector('.text');
                if (textEl) {
                    applyLiteralHighlight(textEl, query);
                }
            }
        }
    });

    if (searchMatches.length > 0) {
        highlightSearchResult(0);
    }
}

function highlightSearchResult(idx) {
    document.querySelectorAll('.transcript-line.search-current').forEach(el => {
        el.classList.remove('search-current');
    });

    if (searchMatches.length === 0) return;
    searchIndex = (idx + searchMatches.length) % searchMatches.length;

    const lineIdx = searchMatches[searchIndex];
    const el = document.querySelector(`.transcript-line[data-index="${lineIdx}"]`);
    if (el) {
        el.classList.add('search-current');
        // Browsing search results leaves follow mode (the pill offers the way
        // back) so playback auto-scroll doesn't yank the view away.
        transcriptFollow.suspend();
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
}

document.getElementById('transcript-search-input').addEventListener('input', e => {
    searchTranscript(e.target.value);
});
document.getElementById('search-prev').addEventListener('click', () => highlightSearchResult(searchIndex - 1));
document.getElementById('search-next').addEventListener('click', () => highlightSearchResult(searchIndex + 1));

// ===== PLAYBACK =====
function setStatus(text, speaking = false) {
    document.getElementById('status-text').textContent = text;
    document.getElementById('status-dot').classList.toggle('speaking', speaking);
}

function speak(text, speaker, options) {
    return speechPlayers.speak(text, speaker, options);
}

const speechPlayers = createSpeechPlayers({
    getSpeechRate: () => speechRate
});

// Ambient audio-reactive bars on the player screen. The AudioContext is only
// ever created inside a user gesture (play button / Space key) — required on
// iOS Safari, where a context created elsewhere would stay suspended and
// silence the <audio> element it routes.
const nowPlayingViz = createNowPlayingVisualizer({
    audio: speechPlayers.audio,
    container: document.getElementById('now-playing-viz'),
    prefersReducedMotion: () => prefersReducedMotion()
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Background/lockscreen: stop the rAF loop (audio keeps playing).
        nowPlayingViz.stop();
    } else {
        // Foreground again: recover from any iOS 'interrupted' context state.
        nowPlayingViz.resumeIfNeeded();
        if (isPlaying && !isPaused) nowPlayingViz.start();
    }
});

// === Player <-> UI bridge (continuous combined.mp3 mode) ===

speechPlayers.on('linechange', (lineIndex) => {
    if (!isPlaying) return;
    if (lineIndex === currentLineIndex) return;
    currentLineIndex = lineIndex;
    updateProgress();
    updateMiniPlayer();
    if (lineIndex - lastPersistedLine >= 5 || lineIndex === 0) {
        saveState();
        lastPersistedLine = lineIndex;
    }
});

speechPlayers.on('timeupdate', () => {
    if (checkSleepTimerExpiry()) return;
    applySleepFade();
    // Cheap per-tick refresh of the clock + progress fill (~4 Hz from <audio>).
    if (speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        const pos = speechPlayers.getCurrentTime();
        const pct = dur > 0 ? Math.max(0, Math.min(100, (pos / dur) * 100)) : 0;
        scrubber.update(pct / 100);
        updateBufferedBar();
        const cur = document.getElementById('current-pos');
        const tot = document.getElementById('total-pos');
        if (cur) cur.textContent = formatClock(pos);
        if (tot) tot.textContent = formatClock(dur);
    }
    updateMiniProgress();
    updateMediaSessionPositionState();
    updateUpNextBanner();
    maybePrebufferNextEpisode();
});

speechPlayers.on('play', () => {
    isPlaying = true;
    isPaused = false;
    setPlayButtonState(true);
    updateMiniPlayer();
    updateMediaSessionPlaybackState();
    nowPlayingViz.resumeIfNeeded();
    if (!document.hidden) nowPlayingViz.start();
    void requestWakeLock();
});

speechPlayers.on('pause', () => {
    nowPlayingViz.stop();
    if (!isPlaying) return;
    isPaused = true;
    setPlayButtonState(false);
    updateMiniPlayer();
    updateMediaSessionPlaybackState();
    saveState();
    void releaseWakeLock();
});

speechPlayers.on('ended', () => {
    nowPlayingViz.stop();
    isPlaying = false;
    isPaused = false;
    currentLineIndex = Math.max(0, dialogueLines.length - 1);
    const sleepStop = sleepAtEpisodeEnd;
    saveState();
    updateMiniPlayer();
    hideUpNextBanner();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    void releaseWakeLock();
    // An end-of-episode sleep timer suppresses auto-advance and ends here.
    showCompleteModal({ allowAutoAdvance: !sleepStop });
    if (sleepStop) consumeSleepEpisodeEndStop();
});

speechPlayers.on('error', (err) => {
    console.warn('Audio element error:', err);
    if (!currentEpisode || !speechPlayers.isContinuousReady()) return;
    setStatus('Audio playback error');
    toasts.show('Audio failed to load', {
        actionLabel: 'Retry',
        onAction: retryAudioLoad
    });
});

// Re-fetch the combined.mp3 the <audio> element choked on (e.g. a dropped
// connection mid-stream), restore the position, and resume.
function retryAudioLoad() {
    if (!speechPlayers.isContinuousReady()) return;
    const line = currentLineIndex;
    try { speechPlayers.audio.load(); } catch { /* ignore */ }
    speechPlayers.seekToLine(line);
    speechPlayers.play().catch((err) => handlePlayFailure(err));
}

// Distinguish autoplay-policy rejections (expected — just ask for a tap)
// from real load/decode failures (surface a retry toast).
function handlePlayFailure(err) {
    if (err && err.name === 'NotAllowedError') {
        setStatus('Tap play to start');
        return;
    }
    console.warn('play() failed:', err);
    setStatus('Audio playback error');
    toasts.show('Playback failed to start', {
        actionLabel: 'Retry',
        onAction: () => {
            nowPlayingViz.ensureContext();
            void togglePlayPause();
        }
    });
}

async function startPlayback() {
    if (dialogueLines.length === 0) return;

    if (speechPlayers.isContinuousReady()) {
        // Continuous mode: combined.mp3 plays as a single <audio>; line tracking
        // happens in the 'linechange' event listener. Player events flip the UI.
        if (isPlaying && !isPaused) return;
        if (!isPlaying) {
            // Fresh start (or resume from saved progress): seek to currentLineIndex.
            speechPlayers.seekToLine(currentLineIndex);
        }
        try {
            await speechPlayers.play();
        } catch (err) {
            handlePlayFailure(err);
        }
        syncMediaSession({ includeMetadata: true, includePosition: true });
        return;
    }

    // Legacy chunked fallback (manifest lacks per-line durations).
    if (isPlaying && !isPaused) return;
    const sessionId = playbackSessions.createSession();
    isPlaying = true;
    isPaused = false;
    setPlayButtonState(true);
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    await requestWakeLock();

    while (currentLineIndex < dialogueLines.length && isPlaying) {
        if (!playbackSessions.isActive(sessionId)) break;
        if (checkSleepTimerExpiry()) break;
        if (isPaused) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }
        const line = dialogueLines[currentLineIndex];
        updateProgress();
        setStatus(`${line.speaker || 'Narration'}: Speaking...`, true);
        try {
            await speak(line.text, line.type, line.audioUrl ? { audioUrl: line.audioUrl } : undefined);
        } catch (e) {
            console.error('Speech error:', e);
            // Identical messages coalesce into one toast, so a run of failing
            // lines doesn't stack notifications.
            const failedLine = currentLineIndex;
            toasts.show('Audio failed for a line — skipping ahead', {
                actionLabel: 'Retry',
                onAction: () => { void jumpToLine(failedLine, true); }
            });
        }
        if (!playbackSessions.isActive(sessionId)) break;
        if (isPlaying && !isPaused) {
            currentLineIndex++;
            if (!document.hidden) await new Promise(r => setTimeout(r, 120));
        }
    }
    if (!playbackSessions.isActive(sessionId)) return;

    if (currentLineIndex >= dialogueLines.length && isPlaying) {
        isPlaying = false;
        isPaused = false;
        const sleepStop = sleepAtEpisodeEnd;
        await releaseWakeLock();
        saveState();
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: true, includePosition: true });
        showCompleteModal({ allowAutoAdvance: !sleepStop });
        if (sleepStop) consumeSleepEpisodeEndStop();
    } else {
        isPlaying = false;
        isPaused = false;
        await releaseWakeLock();
        setPlayButtonState(false);
        setStatus('Ready');
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: true, includePosition: true });
    }
}

async function stopPlayback() {
    playbackSessions.invalidate();
    nowPlayingViz.stop();
    isPlaying = false;
    isPaused = false;
    speechPlayers.stop();
    speechPlayers.stopCurrentSpeech();
    restoreSleepVolume();
    await releaseWakeLock();
    setPlayButtonState(false);
    saveState();
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
}

async function togglePlayPause() {
    if (speechPlayers.isContinuousReady()) {
        if (!isPlaying || isPaused) {
            if (!isPlaying) speechPlayers.seekToLine(currentLineIndex);
            try { await speechPlayers.play(); } catch (err) { handlePlayFailure(err); }
        } else {
            speechPlayers.pause();
        }
        syncMediaSession({ includeMetadata: true, includePosition: true });
        return;
    }

    // Legacy chunked path.
    if (!isPlaying) {
        void startPlayback();
    } else if (isPaused) {
        isPaused = false;
        await requestWakeLock();
        speechPlayers.resumeCurrentSpeech();
        setPlayButtonState(true);
    } else {
        isPaused = true;
        await releaseWakeLock();
        speechPlayers.pauseCurrentSpeech();
        setPlayButtonState(false);
        setStatus('Paused');
        saveState();
    }
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
}

async function jumpToLine(index, autoStart = false) {
    const wasPlaying = isPlaying && !isPaused;
    const target = Math.max(0, Math.min(index, dialogueLines.length - 1));

    if (speechPlayers.isContinuousReady()) {
        currentLineIndex = target;
        speechPlayers.seekToLine(target);
        updateProgress();
        // Seeking to a line is an explicit "take me there" — re-enter follow
        // mode so the transcript tracks playback from the new position.
        transcriptFollow.resync();
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: false, includePosition: true });
        if (autoStart || wasPlaying) {
            try { await speechPlayers.play(); } catch (err) { handlePlayFailure(err); }
        }
        saveState();
        return;
    }

    // Legacy chunked path.
    playbackSessions.invalidate();
    isPlaying = false;
    isPaused = false;
    speechPlayers.stopCurrentSpeech();
    await releaseWakeLock();
    currentLineIndex = target;
    updateProgress();
    transcriptFollow.resync();
    saveState();
    setPlayButtonState(false);
    setStatus('Ready');
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    if (autoStart || wasPlaying) {
        setTimeout(() => { void startPlayback(); }, 100);
    }
}

// Time-based skip. In continuous-mp3 mode we just advance audio.currentTime
// by the given delta. In the legacy chunked fallback we approximate via
// estimated seconds-per-line.
function seekBySeconds(delta) {
    if (speechPlayers.isContinuousReady()) {
        speechPlayers.seek(speechPlayers.getCurrentTime() + delta);
        updateProgress();
        updateMediaSessionPositionState();
        saveState();
        return;
    }
    const linesToJump = estimateLineJumpFromSeconds(Math.abs(delta));
    const target = currentLineIndex + (delta < 0 ? -linesToJump : linesToJump);
    void jumpToLine(target, isPlaying && !isPaused);
}

// Controls — all four skip buttons honor user-configurable intervals from the
// settings panel; holding a skip button repeats the skip until released.
document.getElementById('play-btn').addEventListener('click', () => {
    // User gesture: safe point to create/resume the visualizer AudioContext.
    nowPlayingViz.ensureContext();
    void togglePlayPause();
});

function bindSkipButton(id, getDelta) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let suppressClick = false;
    // Every skip (tap, keyboard activation, or long-press repeat) shows the
    // seconds flyout; the ripple fires once per press from the pointer point.
    const doSkip = () => {
        const delta = getDelta();
        seekBySeconds(delta);
        showSkipFlyout(btn, delta);
    };
    const skipper = createRepeatSkipper({ action: doSkip });
    btn.addEventListener('pointerdown', (e) => {
        if (typeof e.button === 'number' && e.button !== 0) return;
        spawnRipple(btn, e);
        skipper.press();
    });
    const endPress = () => {
        if (skipper.release()) suppressClick = true;
    };
    btn.addEventListener('pointerup', endPress);
    btn.addEventListener('pointerleave', endPress);
    btn.addEventListener('pointercancel', endPress);
    btn.addEventListener('click', () => {
        // A long-press already performed its repeat skips; swallow the
        // trailing click so releasing doesn't skip one extra time.
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        doSkip();
    });
    // Long-press on touch would otherwise summon the context menu.
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindSkipButton('prev-btn', () => -skipLargeBackwardInterval);
bindSkipButton('next-btn', () => skipLargeForwardInterval);
bindSkipButton('back-btn', () => -skipBackwardInterval);
bindSkipButton('fwd-btn', () => skipForwardInterval);

// Speed — button opens a popover with presets + a 0.5–4x slider.
document.getElementById('speed-slider').addEventListener('input', e => {
    applySpeechRate(parseFloat(e.target.value));
});

const speedBtn = document.getElementById('speed-btn');
const speedPopover = document.getElementById('speed-popover');

function setSpeedPopoverOpen(open) {
    if (!speedPopover || !speedBtn) return;
    speedPopover.hidden = !open;
    speedBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
        const slider = document.getElementById('speed-slider');
        if (slider) {
            try { slider.focus({ preventScroll: true }); } catch (_) { slider.focus(); }
        }
    }
}

speedBtn?.addEventListener('click', () => {
    setSpeedPopoverOpen(speedPopover.hidden);
});

document.addEventListener('click', (e) => {
    if (!speedPopover || speedPopover.hidden) return;
    if (e.target.closest('#speed-popover') || e.target.closest('#speed-btn')) return;
    setSpeedPopoverOpen(false);
});

// Escape closes the speed popover (returning focus to its trigger); Tab is
// trapped inside it while open, matching the modal focus behavior.
document.addEventListener('keydown', (e) => {
    if (!speedPopover || speedPopover.hidden) return;
    if (e.key === 'Escape') {
        setSpeedPopoverOpen(false);
        speedBtn?.focus();
        return;
    }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(
        speedPopover.querySelectorAll('button:not([disabled]), input:not([disabled])')
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (!speedPopover.contains(active)) {
        e.preventDefault();
        first.focus();
    } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
    }
});

// Draggable scrubber — touch/mouse drag with a time-preview bubble, keyboard
// arrow keys for fine seeks. Continuous mode seeks real audio time; the
// chunked fallback maps the fraction to a transcript line.
function getPlaybackFraction() {
    if (speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        return dur > 0 ? Math.max(0, Math.min(1, speechPlayers.getCurrentTime() / dur)) : 0;
    }
    return dialogueLines.length > 0 ? currentLineIndex / dialogueLines.length : 0;
}

function scrubLabelFor(fraction) {
    if (speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        return formatClock(fraction * dur);
    }
    const total = Math.max(1, dialogueLines.length);
    return `Line ${Math.min(total, Math.floor(fraction * total) + 1)} of ${total}`;
}

const scrubber = createScrubber({
    bar: document.getElementById('progress-bar'),
    fill: document.getElementById('progress-fill'),
    handle: document.getElementById('scrub-handle'),
    bubble: document.getElementById('scrub-bubble'),
    getFraction: getPlaybackFraction,
    formatLabel: scrubLabelFor,
    onCommit: (fraction) => {
        if (speechPlayers.isContinuousReady()) {
            const dur = speechPlayers.getDuration() || episodeAudioDuration;
            if (dur > 0) {
                speechPlayers.seek(fraction * dur);
                updateProgress();
                updateMediaSessionPositionState();
                saveState();
                return;
            }
        }
        const wasPlaying = isPlaying && !isPaused;
        void jumpToLine(Math.floor(fraction * dialogueLines.length), wasPlaying);
    },
    onNudge: (seconds) => {
        if (speechPlayers.isContinuousReady()) {
            seekBySeconds(seconds);
        } else {
            void jumpToLine(currentLineIndex + (seconds < 0 ? -1 : 1), isPlaying && !isPaused);
        }
    }
});

// Buffered-range indication on the scrubber track (continuous mode only).
function updateBufferedBar() {
    const el = document.getElementById('progress-buffered');
    if (!el) return;
    const audioEl = speechPlayers.audio;
    if (!speechPlayers.isContinuousReady() || !audioEl || !audioEl.buffered) {
        el.style.width = '0%';
        return;
    }
    const dur = speechPlayers.getDuration() || episodeAudioDuration;
    const frac = bufferedEndFraction(audioEl.buffered, dur, audioEl.currentTime || 0);
    el.style.width = `${(frac * 100).toFixed(2)}%`;
}

speechPlayers.on('progress', updateBufferedBar);

// Auto-play toggle
document.getElementById('auto-play-toggle').addEventListener('click', () => {
    autoPlayNext = !autoPlayNext;
    updateToggleButton('auto-play-toggle', autoPlayNext, 'Auto');
    saveState();
});

// ===== SLEEP TIMER =====
function sleepTimerActive() {
    return sleepTimerEndTime !== null || sleepAtEpisodeEnd;
}

function currentSleepRemaining() {
    const continuous = speechPlayers.isContinuousReady();
    return sleepRemainingSeconds({
        endTime: sleepTimerEndTime,
        atEpisodeEnd: sleepAtEpisodeEnd,
        now: Date.now(),
        positionSeconds: continuous ? speechPlayers.getCurrentTime() : 0,
        durationSeconds: continuous ? (speechPlayers.getDuration() || episodeAudioDuration) : 0,
        playbackRate: speechRate
    });
}

// Gentle fade over the final SLEEP_FADE_SECONDS before the timer stops
// playback. The user's volume is captured on the way into the fade window
// and restored once playback stops (or the timer is cancelled). Note: iOS
// Safari ignores element volume, so the fade is a desktop/Android nicety.
function applySleepFade() {
    if (!sleepTimerActive()) return;
    const audioEl = speechPlayers.audio;
    if (!audioEl) return;
    const remaining = currentSleepRemaining();
    const factor = sleepFadeVolume(remaining);
    if (factor >= 1) return;
    if (sleepBaseVolume === null) sleepBaseVolume = audioEl.volume;
    try { audioEl.volume = sleepBaseVolume * factor; } catch { /* ignore */ }
}

function restoreSleepVolume() {
    if (sleepBaseVolume === null) return;
    const audioEl = speechPlayers.audio;
    if (audioEl) {
        try { audioEl.volume = sleepBaseVolume; } catch { /* ignore */ }
    }
    sleepBaseVolume = null;
}

function checkSleepTimerExpiry() {
    if (sleepTimerEndTime !== null && Date.now() >= sleepTimerEndTime) {
        void finishSleepTimer();
        return true;
    }
    return false;
}

// Timer fired: pause (keeping position) rather than stop, restore the faded
// volume, and make sure the lockscreen reflects the paused state.
async function finishSleepTimer() {
    sleepTimerEndTime = null;
    sleepAtEpisodeEnd = false;
    if (speechPlayers.isContinuousReady()) {
        speechPlayers.pause();
    } else {
        await stopPlayback();
    }
    restoreSleepVolume();
    setStatus('Sleep timer ended');
    updateSleepUI();
    saveState();
    syncMediaSession({ includePosition: true });
}

// End-of-episode mode resolved naturally (the episode finished). Clears the
// timer and restores volume; returns true if a sleep stop was consumed.
function consumeSleepEpisodeEndStop() {
    if (!sleepAtEpisodeEnd) return false;
    sleepAtEpisodeEnd = false;
    restoreSleepVolume();
    setStatus('Sleep timer ended');
    updateSleepUI();
    return true;
}

function setSleepMinutes(mins) {
    restoreSleepVolume();
    sleepAtEpisodeEnd = false;
    sleepTimerEndTime = Date.now() + mins * 60 * 1000;
    updateSleepUI();
}

function setSleepEpisodeEnd() {
    restoreSleepVolume();
    sleepTimerEndTime = null;
    sleepAtEpisodeEnd = true;
    updateSleepUI();
}

function cancelSleepTimer() {
    sleepTimerEndTime = null;
    sleepAtEpisodeEnd = false;
    restoreSleepVolume();
    updateSleepUI();
}

// Keeps the modal display, the status-row chip, and the header button badge
// in sync — the "visible state" of the timer in the player UI.
function updateSleepUI() {
    const display = document.getElementById('timer-display');
    const chip = document.getElementById('sleep-chip');
    const chipText = document.getElementById('sleep-chip-text');
    const headerBtn = document.getElementById('sleep-timer-btn');
    const active = sleepTimerActive();
    headerBtn?.classList.toggle('sleep-active', active);

    if (!active) {
        if (display) {
            display.textContent = 'No timer set';
            display.classList.remove('active');
        }
        if (chip) chip.hidden = true;
        document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
        return;
    }

    const remaining = currentSleepRemaining();
    if (sleepAtEpisodeEnd) {
        const suffix = Number.isFinite(remaining) ? ` (~${formatClock(remaining)} left)` : '';
        if (display) display.textContent = `Stopping at end of episode${suffix}`;
        if (chipText) chipText.textContent = Number.isFinite(remaining) ? formatClock(remaining) : 'End of ep.';
    } else {
        if (display) display.textContent = `Stopping in ${formatClock(remaining)}`;
        if (chipText) chipText.textContent = formatClock(remaining);
    }
    if (display) display.classList.add('active');
    if (chip) chip.hidden = false;
}

document.getElementById('sleep-timer-btn').addEventListener('click', () => {
    document.getElementById('sleep-modal').classList.add('show');
});

document.getElementById('sleep-chip')?.addEventListener('click', () => {
    document.getElementById('sleep-modal').classList.add('show');
});

document.getElementById('close-sleep-modal').addEventListener('click', () => {
    document.getElementById('sleep-modal').classList.remove('show');
});

document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.episodeEnd) {
            setSleepEpisodeEnd();
        } else {
            setSleepMinutes(parseInt(btn.dataset.minutes));
        }
    });
});

document.getElementById('cancel-timer').addEventListener('click', cancelSleepTimer);

// 1 Hz countdown refresh; also catches expiry while paused (timeupdate
// events stop when the audio element is paused).
setInterval(() => {
    if (!sleepTimerActive()) return;
    if (checkSleepTimerExpiry()) return;
    updateSleepUI();
}, 1000);

// ===== EPISODE COMPLETE MODAL & QUEUE AUTO-ADVANCE =====
function showCompleteModal({ allowAutoAdvance = true } = {}) {
    setPlayButtonState(false);
    setStatus('Episode complete! 🎉');
    hideUpNextBanner();

    const next = getNextUp();
    const playNextBtn = document.getElementById('play-next-episode');
    playNextBtn.style.display = '';

    if (autoPlayNext && allowAutoAdvance && next) {
        document.getElementById('complete-message').textContent = `Starting "${next.episode.title}" in 5 seconds...`;
        playNextBtn.textContent = 'Play Now';
        document.getElementById('complete-modal').classList.add('show');

        setTimeout(() => {
            if (document.getElementById('complete-modal').classList.contains('show')) {
                playNextEpisode();
            }
        }, 5000);
    } else if (next) {
        document.getElementById('complete-message').textContent = `Up next: "${next.episode.title}"`;
        playNextBtn.textContent = 'Play Next Episode';
        document.getElementById('complete-modal').classList.add('show');
    } else {
        document.getElementById('complete-message').textContent = 'You\'ve completed all episodes! 🏆';
        playNextBtn.style.display = 'none';
        document.getElementById('complete-modal').classList.add('show');
    }
}

// Advance to whatever is up next (queue first, then the sequential episode).
// Queue entries are consumed as they play; crossing into another show swaps
// the podcast context so per-show speed and accent color follow along.
async function playNextEpisode() {
    document.getElementById('complete-modal').classList.remove('show');
    const next = getNextUp();
    if (!next) return;
    if (next.queueIndex >= 0) removeFromQueue(next.queueIndex);
    if (!currentPodcast || currentPodcast.id !== next.podcast.id) {
        openPodcast(next.podcast);
    }
    await openEpisode(next.episode, { promptResume: false, preferredLine: 0 });
    startPlayback();
}

// "Up next" affordance: a small banner in the controls panel during the last
// 30 seconds of an episode, showing what auto-advance will play.
function hideUpNextBanner() {
    const banner = document.getElementById('up-next-banner');
    if (banner) banner.hidden = true;
}

function updateUpNextBanner() {
    const banner = document.getElementById('up-next-banner');
    if (!banner) return;
    let next = null;
    if (autoPlayNext && !sleepAtEpisodeEnd && isPlaying && !isPaused && speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        const pos = speechPlayers.getCurrentTime();
        if (dur > 0 && dur - pos > 0 && dur - pos <= 30) {
            next = getNextUp();
        }
    }
    if (!next) {
        banner.hidden = true;
        return;
    }
    document.getElementById('up-next-title').textContent = next.episode.title;
    banner.hidden = false;
}

document.getElementById('up-next-play')?.addEventListener('click', () => {
    void playNextEpisode();
});

async function playPreviousEpisode() {
    const episodes = currentPodcast?.episodes || [];
    const prevEp = episodes.find(e => e.id === currentEpisode.id - 1);
    if (prevEp) {
        await openEpisode(prevEp, { promptResume: false, preferredLine: 0 });
        startPlayback();
    }
}

document.getElementById('play-next-episode').addEventListener('click', playNextEpisode);
document.getElementById('back-to-episodes').addEventListener('click', () => {
    document.getElementById('complete-modal').classList.remove('show');
    document.getElementById('back-to-list').click();
});

// ===== SWIPE GESTURES =====
let touchStartX = 0;
let touchStartY = 0;
const swipeThreshold = 80;

document.getElementById('player-view').addEventListener('touchstart', e => {
    // Touches that start on the scrubber belong to the drag interaction —
    // never interpret them as a swipe skip.
    if (e.target.closest('#progress-bar')) {
        touchStartX = 0;
        return;
    }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('player-view').addEventListener('touchmove', e => {
    if (!touchStartX) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = Math.abs(e.touches[0].clientY - touchStartY);

    // Only show hint if horizontal swipe
    if (Math.abs(diffX) > 30 && diffY < 50) {
        if (diffX > 0) {
            document.getElementById('swipe-left').classList.add('show');
            document.getElementById('swipe-right').classList.remove('show');
        } else {
            document.getElementById('swipe-right').classList.add('show');
            document.getElementById('swipe-left').classList.remove('show');
        }
    }
}, { passive: true });

document.getElementById('player-view').addEventListener('touchend', e => {
    document.getElementById('swipe-left').classList.remove('show');
    document.getElementById('swipe-right').classList.remove('show');

    if (!touchStartX) return;
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY);

    if (Math.abs(diffX) > swipeThreshold && diffY < 50) {
        if (diffX > 0) {
            seekBySeconds(-skipLargeBackwardInterval); // Swipe right = large skip back
        } else {
            seekBySeconds(skipLargeForwardInterval); // Swipe left = large skip forward
        }
    }
    touchStartX = 0;
}, { passive: true });

// ===== COLLAPSIBLE PANELS =====
document.querySelectorAll('.panel-header').forEach(header => {
    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-label', `Toggle ${header.textContent.trim()}`);
    const syncExpanded = () => {
        header.setAttribute(
            'aria-expanded',
            header.parentElement.classList.contains('collapsed') ? 'false' : 'true'
        );
    };
    syncExpanded();
    const togglePanel = () => {
        header.parentElement.classList.toggle('collapsed');
        syncExpanded();
    };
    header.addEventListener('click', togglePanel);
    activateCardWithKeyboard(header, togglePanel);
});

// ===== INSTALL PROMPT =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-modal').classList.add('show');
});

document.getElementById('do-install').addEventListener('click', () => {
    document.getElementById('install-modal').classList.remove('show');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    }
});

document.getElementById('dismiss-install').addEventListener('click', () => {
    document.getElementById('install-modal').classList.remove('show');
});

// ===== NEW FEATURES =====

// Initialize theme
if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
}
document.getElementById('theme-toggle').setAttribute(
    'aria-label',
    currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
);

// Speed Presets
document.querySelectorAll('.speed-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        applySpeechRate(parseFloat(btn.dataset.speed));
    });
});

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme');
    document.getElementById('theme-toggle').querySelector('span').textContent =
        currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
    document.getElementById('theme-toggle').setAttribute(
        'aria-label',
        currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
    localStorage.setItem('theme', currentTheme);
});

// Settings Panel
document.getElementById('skip-forward-interval').addEventListener('change', e => {
    skipForwardInterval = parseInt(e.target.value);
    localStorage.setItem('skipForwardInterval', skipForwardInterval);
    updateSkipButtonTitles();
});

document.getElementById('skip-backward-interval').addEventListener('change', e => {
    skipBackwardInterval = parseInt(e.target.value);
    localStorage.setItem('skipBackwardInterval', skipBackwardInterval);
    updateSkipButtonTitles();
});

document.getElementById('skip-large-forward-interval').addEventListener('change', e => {
    skipLargeForwardInterval = parseInt(e.target.value);
    localStorage.setItem('skipLargeForwardInterval', skipLargeForwardInterval);
    updateSkipButtonTitles();
});

document.getElementById('skip-large-backward-interval').addEventListener('change', e => {
    skipLargeBackwardInterval = parseInt(e.target.value);
    localStorage.setItem('skipLargeBackwardInterval', skipLargeBackwardInterval);
    updateSkipButtonTitles();
});

function updateSkipButtonTitles() {
    // All four skip buttons honor the user's configured intervals; hold any
    // of them to repeat-skip.
    const setSkipLabel = (id, seconds, direction) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const word = direction < 0 ? 'Back' : 'Forward';
        btn.title = `${word} ${seconds}s (hold to repeat)`;
        btn.setAttribute('aria-label', `${word} ${seconds} seconds, hold to repeat`);
        btn.textContent = `${direction < 0 ? '−' : '+'}${seconds}`;
    };
    setSkipLabel('prev-btn', skipLargeBackwardInterval, -1);
    setSkipLabel('back-btn', skipBackwardInterval, -1);
    setSkipLabel('fwd-btn', skipForwardInterval, 1);
    setSkipLabel('next-btn', skipLargeForwardInterval, 1);
}
updateSkipButtonTitles();

// Voice Boost Toggle
document.getElementById('voice-boost-toggle').addEventListener('click', () => {
    voiceBoostEnabled = !voiceBoostEnabled;
    updateToggleButton('voice-boost-toggle', voiceBoostEnabled, voiceBoostEnabled ? 'On' : 'Off');
    localStorage.setItem('voiceBoostEnabled', voiceBoostEnabled);
    if (voiceBoostEnabled) {
        setStatus('Voice boost is handled in generated Supertonic audio');
    }
});

// Silence Trim Toggle
document.getElementById('silence-trim-toggle').addEventListener('click', () => {
    silenceTrimEnabled = !silenceTrimEnabled;
    updateToggleButton('silence-trim-toggle', silenceTrimEnabled, silenceTrimEnabled ? 'On' : 'Off');
    localStorage.setItem('silenceTrimEnabled', silenceTrimEnabled);
});

document.getElementById('clear-local-data-btn').addEventListener('click', async () => {
    const confirmed = window.confirm(
        'Clear local app data and cache? This resets saved progress, bookmarks, queue, and settings on this device.'
    );
    if (!confirmed) return;

    await stopPlayback();

    LOCAL_STORAGE_KEYS_TO_CLEAR.forEach((key) => {
        localStorage.removeItem(key);
    });

    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    window.location.href = window.location.pathname;
});

// Episode Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterAndSortEpisodes();
    });
});

document.getElementById('episode-sort').addEventListener('change', e => {
    currentSort = e.target.value;
    filterAndSortEpisodes();
});

function filterAndSortEpisodes() {
    if (!currentPodcast) return;
    const container = document.getElementById('episode-list');
    const cards = Array.from(container.querySelectorAll('.episode-card'));

    // Filter
    let visible = 0;
    cards.forEach(card => {
        const status = card.classList.contains('completed') ? 'completed' :
                      card.classList.contains('in-progress') ? 'in-progress' : 'unplayed';
        const show = currentFilter === 'all' ||
                    (currentFilter === 'completed' && status === 'completed') ||
                    (currentFilter === 'in-progress' && status === 'in-progress') ||
                    (currentFilter === 'unplayed' && status === 'unplayed');
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    // Empty state for filters that match nothing
    let emptyEl = container.querySelector('.no-items.filter-empty');
    if (visible === 0 && cards.length > 0) {
        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'no-items filter-empty';
            emptyEl.style.padding = '20px';
            container.appendChild(emptyEl);
        }
        const labels = {
            unplayed: 'No unplayed episodes — you\'ve started or finished them all.',
            'in-progress': 'No episodes in progress.',
            completed: 'No completed episodes yet.',
        };
        emptyEl.textContent = labels[currentFilter] || 'No episodes match this filter.';
    } else if (emptyEl) {
        emptyEl.remove();
    }

    // Sort
    if (currentSort !== 'default') {
        const sortedCards = cards.sort((a, b) => {
            const aNum = parseInt(a.querySelector('.ep-number').textContent.match(/\d+/)[0]);
            const bNum = parseInt(b.querySelector('.ep-number').textContent.match(/\d+/)[0]);
            const aTitle = a.querySelector('.ep-title').textContent;
            const bTitle = b.querySelector('.ep-title').textContent;
            const aProgress = parseFloat(a.querySelector('.ep-progress-bar').style.width) || 0;
            const bProgress = parseFloat(b.querySelector('.ep-progress-bar').style.width) || 0;

            switch(currentSort) {
                case 'newest': return bNum - aNum;
                case 'oldest': return aNum - bNum;
                case 'title': return aTitle.localeCompare(bTitle);
                case 'progress': return bProgress - aProgress;
                default: return 0;
            }
        });
        sortedCards.forEach(card => container.appendChild(card));
    }
}

// Queue Management
function addToQueue(podcast, episode) {
    playQueue.push({ podcastId: podcast.id, episodeNum: episode.id, addedAt: Date.now() });
    saveQueue(playQueue);
    updateQueueDisplay();
}

function removeFromQueue(index) {
    playQueue.splice(index, 1);
    saveQueue(playQueue);
    updateQueueDisplay();
}

function updateQueueDisplay() {
    const queueList = document.getElementById('queue-list');
    if (playQueue.length === 0) {
        queueList.innerHTML = '<div class="no-items">Queue is empty</div>';
        return;
    }

    queueList.innerHTML = playQueue.map((item, index) => {
        const podcast = getPodcasts().find(p => p.id === item.podcastId);
        const episode = podcast?.episodes.find(e => e.id === item.episodeNum);
        if (!podcast || !episode) return '';

        const isPlaying = currentPodcast?.id === item.podcastId && currentEpisode?.id === item.episodeNum;

        return renderQueueItem(item, episode, podcast, isPlaying, index);
    }).join('');

    // Add click + keyboard handlers (items are role="button" divs)
    const openQueueItem = (index) => {
        const queueItem = playQueue[index];
        if (!queueItem) return;
        const podcast = getPodcasts().find(p => p.id === queueItem.podcastId);
        if (!podcast) return;
        const episode = podcast.episodes.find(e => e.id === queueItem.episodeNum);
        if (!episode) return;
        openPodcast(podcast);
        setTimeout(() => openEpisode(episode, { promptResume: true }), 100);
    };
    queueList.querySelectorAll('.queue-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('queue-remove')) {
                openQueueItem(index);
            }
        });
        activateCardWithKeyboard(item, () => openQueueItem(index));
    });

    queueList.querySelectorAll('.queue-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromQueue(parseInt(btn.dataset.index));
        });
    });
}

// Share & Export
document.getElementById('share-btn').addEventListener('click', () => {
    document.getElementById('share-modal').classList.add('show');
});

document.getElementById('close-share-modal').addEventListener('click', () => {
    document.getElementById('share-modal').classList.remove('show');
});

document.getElementById('share-timestamp-btn').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('podcast', currentPodcast.id);
    url.searchParams.set('episode', currentEpisode.id);
    url.searchParams.set('line', currentLineIndex);

    if (navigator.share) {
        navigator.share({
            title: `${currentEpisode.title} - ${currentPodcast.title}`,
            text: `Listen from line ${currentLineIndex}`,
            url: url.toString()
        });
    } else {
        navigator.clipboard.writeText(url.toString());
        alert('Link copied to clipboard!');
    }
});

document.getElementById('share-episode-btn').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('podcast', currentPodcast.id);
    url.searchParams.set('episode', currentEpisode.id);

    if (navigator.share) {
        navigator.share({
            title: `${currentEpisode.title} - ${currentPodcast.title}`,
            text: currentEpisode.subtitle,
            url: url.toString()
        });
    } else {
        navigator.clipboard.writeText(url.toString());
        alert('Link copied to clipboard!');
    }
});

document.getElementById('export-bookmarks-btn').addEventListener('click', () => {
    const data = buildBookmarksExport({
        state: loadState(),
        currentPodcast,
        currentEpisode,
        dialogueLines
    });
    downloadJSON(`bookmarks-${currentPodcast.id}-${currentEpisode.id}.json`, data);
});

document.getElementById('export-progress-btn').addEventListener('click', () => {
    const data = buildProgressExport(loadState());
    downloadJSON('podcast-progress.json', data);
});

// Statistics
document.getElementById('stats-btn').addEventListener('click', () => {
    updateStatisticsDisplay();
    document.getElementById('stats-modal').classList.add('show');
});

document.getElementById('close-stats-modal').addEventListener('click', () => {
    document.getElementById('stats-modal').classList.remove('show');
});

function updateListeningStats(secondsListened) {
    listeningStats.totalTime += secondsListened;
    listeningStats.speedSum += speechRate;
    listeningStats.speedCount += 1;

    const today = new Date().toDateString();
    if (listeningStats.lastListenDate !== today) {
        if (listeningStats.lastListenDate === new Date(Date.now() - 86400000).toDateString()) {
            listeningStats.currentStreak += 1;
        } else {
            listeningStats.currentStreak = 1;
        }
        listeningStats.lastListenDate = today;
    }

    saveListeningStats(listeningStats);
}

function updateStatisticsDisplay() {
    const hours = Math.floor(listeningStats.totalTime / 3600);
    const mins = Math.floor((listeningStats.totalTime % 3600) / 60);
    document.getElementById('stat-total-time').textContent = `${hours}h ${mins}m`;
    document.getElementById('stat-episodes-completed').textContent = listeningStats.episodesCompleted;
    document.getElementById('stat-current-streak').textContent = listeningStats.currentStreak;

    const avgSpeed = listeningStats.speedCount > 0 ?
        (listeningStats.speedSum / listeningStats.speedCount).toFixed(1) : '1.0';
    document.getElementById('stat-avg-speed').textContent = avgSpeed + 'x';

    const normalTime = listeningStats.totalTime * (parseFloat(avgSpeed));
    const timeSaved = normalTime - listeningStats.totalTime;
    const savedHours = Math.floor(timeSaved / 3600);
    const savedMins = Math.floor((timeSaved % 3600) / 60);
    document.getElementById('stat-time-saved').textContent = `${savedHours}h ${savedMins}m`;
}

// Track time listened
let lastStatsUpdate = Date.now();
setInterval(() => {
    if (isPlaying && !isPaused) {
        const now = Date.now();
        const elapsed = (now - lastStatsUpdate) / 1000;
        updateListeningStats(elapsed);
        lastStatsUpdate = now;
    }
}, 10000); // Update every 10 seconds

// Mini Player
function updateMiniPlayer() {
    const pod = playerPodcast || currentPodcast;
    if (pod && currentEpisode) {
        document.getElementById('mini-player-title').textContent = currentEpisode.title;
        document.getElementById('mini-player-subtitle').textContent = pod.title;
        const art = document.getElementById('mini-player-art');
        if (art) {
            const dataUrl = generatePodcastArtwork(pod);
            if (dataUrl) {
                if (art.src !== dataUrl) art.src = dataUrl;
                art.hidden = false;
            } else {
                art.hidden = true;
            }
        }
    }
    setPlayButtonState(isPlaying && !isPaused);
    updateMiniProgress();
}

// Progress hairline across the top of the mini player.
function updateMiniProgress() {
    const fill = document.getElementById('mini-progress-fill');
    if (!fill) return;
    fill.style.width = `${(getPlaybackFraction() * 100).toFixed(2)}%`;
}

// Tap-to-expand: return to the player screen with a quick spring-feel rise
// (CSS animation, ≤200ms, disabled under prefers-reduced-motion). Skips the
// cross-fade view transition so the spring is the only motion.
function expandMiniPlayer() {
    if (!playerPodcast || !currentEpisode) return;
    if (currentPodcast?.id !== playerPodcast.id) {
        // The user browsed into a different show while listening — restore
        // the playing show's context (header, accent, per-show speed).
        // Must skip the View Transition: startViewTransition defers its DOM
        // swap to an async callback, which would re-activate list-view AFTER
        // the synchronous showView('player-view') below and dump the user on
        // the episode list instead of the player.
        openPodcast(playerPodcast, { transition: false });
    }
    showView('player-view', { transition: false });
    const playerView = document.getElementById('player-view');
    if (playerView) {
        playerView.classList.remove('spring-in');
        // Restart the animation if the class was already applied.
        void playerView.offsetWidth;
        playerView.classList.add('spring-in');
        playerView.addEventListener('animationend', () => {
            playerView.classList.remove('spring-in');
        }, { once: true });
    }
}

document.getElementById('mini-player').addEventListener('click', (e) => {
    if (e.target.closest('.mini-ctrl-btn')) return;
    expandMiniPlayer();
});

document.getElementById('mini-player').addEventListener('keydown', (e) => {
    if (e.target.closest('.mini-ctrl-btn')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    expandMiniPlayer();
});

document.getElementById('mini-play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    nowPlayingViz.ensureContext();
    void togglePlayPause();
});

// Load from URL parameters
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const podcastId = params.get('podcast');
    const episodeNum = params.get('episode');
    const lineNum = params.get('line');

    const podcasts = getPodcasts();
    if (podcastId && podcasts.length > 0) {
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast && episodeNum) {
            const episode = podcast.episodes.find(e => e.id === parseInt(episodeNum));
            if (episode) {
                openPodcast(podcast);
                setTimeout(() => {
                    openEpisode(episode, { promptResume: !lineNum });
                    if (lineNum) {
                        setTimeout(() => {
                            jumpToLine(parseInt(lineNum), false);
                        }, 500);
                    }
                }, 100);
            }
        }
    }
});

// Initialize settings
document.getElementById('skip-forward-interval').value = skipForwardInterval;
document.getElementById('skip-backward-interval').value = skipBackwardInterval;
document.getElementById('skip-large-forward-interval').value = skipLargeForwardInterval;
document.getElementById('skip-large-backward-interval').value = skipLargeBackwardInterval;
updateToggleButton('voice-boost-toggle', voiceBoostEnabled, voiceBoostEnabled ? 'On' : 'Off');
updateToggleButton('silence-trim-toggle', silenceTrimEnabled, silenceTrimEnabled ? 'On' : 'Off');
updateToggleButton('auto-play-toggle', autoPlayNext, 'Auto');
updateSpeedPresetButtons();
updateSkipButtonTitles();
updateQueueDisplay();

// ===== CHAPTERS =====
let chapters = [];

function parseChapters(content) {
    return parseChaptersFromContent(content, SPEAKER_LINE_RE);
}

function renderChapters() {
    const container = document.getElementById('chapters-list');
    container.innerHTML = '';

    if (chapters.length === 0) {
        container.innerHTML = '<div class="no-items">No chapters found</div>';
        return;
    }

    chapters.forEach((chap, idx) => {
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.dataset.index = idx;
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Play chapter ${idx + 1}: ${chap.title}`);

        renderChapterItem(item, chap, idx);

        const activate = () => {
            jumpToLine(chap.lineIndex, true);
        };
        item.addEventListener('click', activate);
        activateCardWithKeyboard(item, activate);

        container.appendChild(item);
    });

    updateCurrentChapter();
}

function updateCurrentChapter() {
    // Find current chapter based on line
    let currentChapIdx = 0;
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (currentLineIndex >= chapters[i].lineIndex) {
            currentChapIdx = i;
            break;
        }
    }

    // Update chapter list highlighting
    document.querySelectorAll('.chapter-item').forEach((el, idx) => {
        const isCurrent = idx === currentChapIdx;
        el.classList.toggle('current', isCurrent);
        if (isCurrent) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
    });

    // Update badge
    if (chapters.length > 0 && chapters[currentChapIdx]) {
        document.getElementById('current-chapter-badge').textContent =
            `Chapter ${currentChapIdx + 1}: ${chapters[currentChapIdx].title}`;
    } else {
        document.getElementById('current-chapter-badge').textContent = '';
    }
}

// ===== BOOKMARKS =====
function getBookmarks() {
    const state = loadState();
    return state.bookmarks || {};
}

function getEpisodeKey() {
    return currentPodcast && currentEpisode ? `${currentPodcast.id}-${currentEpisode.id}` : null;
}

function saveBookmark(epKey, lineIndex, note) {
    const state = loadState();
    if (!state.bookmarks) state.bookmarks = {};
    if (!state.bookmarks[epKey]) state.bookmarks[epKey] = [];

    state.bookmarks[epKey].push({
        lineIndex,
        note: note || '',
        timestamp: Date.now()
    });

    // Sort by line index
    state.bookmarks[epKey].sort((a, b) => a.lineIndex - b.lineIndex);

    saveAppState(state);
}

function deleteBookmark(epKey, timestamp) {
    const state = loadState();
    if (state.bookmarks && state.bookmarks[epKey]) {
        state.bookmarks[epKey] = state.bookmarks[epKey].filter(b => b.timestamp !== timestamp);
    }
    saveAppState(state);
}

function renderBookmarks() {
    const container = document.getElementById('bookmarks-list');
    container.innerHTML = '';

    // Add bookmark button first
    const addBtn = document.createElement('button');
    addBtn.className = 'add-bookmark-btn';
    addBtn.id = 'add-bookmark-btn';
    addBtn.textContent = '+ Add Bookmark Here';
    addBtn.addEventListener('click', showAddBookmarkModal);
    container.appendChild(addBtn);

    const epKey = getEpisodeKey();
    if (!epKey) return;

    const bookmarks = getBookmarks();
    const epBookmarks = bookmarks[epKey] || [];

    if (epBookmarks.length === 0) {
        // NOTE: using innerHTML += here re-serializes and re-parses every child,
        // which silently drops the click listener attached to addBtn above.
        // Use appendChild so the listener survives.
        const empty = document.createElement('div');
        empty.className = 'no-items';
        empty.textContent = 'No bookmarks yet';
        container.appendChild(empty);
        return;
    }

    epBookmarks.forEach(bm => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';

        // Get preview text from dialogue
        const line = dialogueLines[bm.lineIndex];
        const preview = line ? line.text.substring(0, 60) + (line.text.length > 60 ? '...' : '') : '';

        renderBookmarkItem(item, bm, preview);

        const bookmarkContent = item.querySelector('.bookmark-content');
        bookmarkContent.addEventListener('click', () => {
            jumpToLine(bm.lineIndex, true);
        });
        // .bookmark-content is rendered as role="button" tabindex="0".
        activateCardWithKeyboard(bookmarkContent, () => jumpToLine(bm.lineIndex, true));

        item.querySelector('.bookmark-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBookmark(epKey, bm.timestamp);
            renderBookmarks();
        });

        container.appendChild(item);
    });
}

function showAddBookmarkModal() {
    const modal = document.getElementById('bookmark-modal');
    document.getElementById('bookmark-position-text').textContent =
        `Line ${currentLineIndex + 1} of ${dialogueLines.length}`;

    const line = dialogueLines[currentLineIndex];
    document.getElementById('bookmark-context').textContent =
        line ? `${line.speaker ? line.speaker + ': ' : ''}${line.text.substring(0, 100)}...` : '';

    document.getElementById('bookmark-note-input').value = '';
    modal.classList.add('show');
    document.getElementById('bookmark-note-input').focus();
}

document.getElementById('save-bookmark').addEventListener('click', () => {
    const epKey = getEpisodeKey();
    if (!epKey) return;
    const note = document.getElementById('bookmark-note-input').value;
    saveBookmark(epKey, currentLineIndex, note);
    document.getElementById('bookmark-modal').classList.remove('show');
    renderBookmarks();
});

document.getElementById('cancel-bookmark').addEventListener('click', () => {
    document.getElementById('bookmark-modal').classList.remove('show');
});

// ===== MODAL A11Y =====
// Manage focus + ESC for any .modal-overlay that toggles the `.show` class.
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const modalReturnFocus = new WeakMap();

function focusableIn(el) {
    return Array.from(el.querySelectorAll(FOCUSABLE_SELECTOR)).filter((n) => n.offsetParent !== null || n === document.activeElement);
}

function onModalShown(modal) {
    modalReturnFocus.set(modal, document.activeElement);
    const first = focusableIn(modal)[0];
    if (first) {
        try { first.focus({ preventScroll: true }); } catch (_) { first.focus(); }
    }
}

function onModalHidden(modal) {
    const returnTo = modalReturnFocus.get(modal);
    modalReturnFocus.delete(modal);
    if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
        try { returnTo.focus({ preventScroll: true }); } catch (_) { returnTo.focus(); }
    }
}

document.querySelectorAll('.modal-overlay').forEach((modal) => {
    const mo = new MutationObserver(() => {
        if (modal.classList.contains('show')) onModalShown(modal);
        else onModalHidden(modal);
    });
    mo.observe(modal, { attributes: true, attributeFilter: ['class'] });
});

// Tab / Shift-Tab focus trap + Escape close for any visible modal.
document.addEventListener('keydown', (e) => {
    const open = Array.from(document.querySelectorAll('.modal-overlay.show'));
    if (open.length === 0) return;
    const modal = open[open.length - 1];

    if (e.key === 'Escape') {
        // Prefer the modal's explicit cancel/close/dismiss button so its handler runs.
        const closeBtn = modal.querySelector(
            '[id^="cancel-"], [id^="close-"], [id^="dismiss-"]'
        );
        if (closeBtn) {
            e.preventDefault();
            closeBtn.click();
        } else {
            e.preventDefault();
            modal.classList.remove('show');
        }
        return;
    }

    if (e.key === 'Tab') {
        const focusables = focusableIn(modal);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

// ===== INIT =====
restoreState();
renderPodcastsList();
bindNavTabs();

// Service worker registration with update handling. Updates surface as a
// sticky toast wherever the user is (the green banner only lives on the
// home screen).
const swClient = registerServiceWorker({
    onUpdateAvailable: () => {
        toasts.show('A new version is ready', {
            actionLabel: 'Update',
            onAction: applyUpdate,
            duration: 0
        });
    }
});

// Once the SW takes control, reconcile our localStorage download set against
// the actual offline-audio cache so the UI doesn't show stale "downloaded"
// badges (e.g. after an evicted cache or a manual storage clear).
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
        .then(() => reconcileDownloadedEpisodes())
        .catch((err) => console.warn('Download reconciliation skipped:', err));
}

// ===== BACKGROUND MODE HANDLING =====
// Track playback state before going to background
let wasPlayingBeforeBackground = false;
let backgroundHandlersEnabled = false;

// Enable background handlers after a short delay to avoid interfering with initial load
setTimeout(() => {
    backgroundHandlersEnabled = true;
    console.log('Background mode handlers enabled');
}, 1000);

// Handle visibility changes (tab switching, minimizing)
document.addEventListener('visibilitychange', async () => {
    if (!backgroundHandlersEnabled) return;

    if (document.hidden) {
        // App went to background.
        console.log('App went to background, isPlaying:', isPlaying, 'isPaused:', isPaused);
        wasPlayingBeforeBackground = isPlaying && !isPaused;

        // Save current state but do not force pause here. The combined.mp3
        // <audio> element keeps playing on its own under browser media policy.
        saveState();
        syncMediaSession({ includeMetadata: true, includePosition: true });
        console.log('Playback handling delegated to browser while backgrounded');
    } else {
        // App came to foreground
        console.log('App came to foreground, wasPlaying:', wasPlayingBeforeBackground);

        // Re-acquire wake lock if playback is active
        if (isPlaying && !isPaused) {
            await requestWakeLock();

            speechPlayers.resumeCurrentSpeech();
            syncMediaSession({ includeMetadata: true, includePosition: true });
        }
    }
}, { passive: true });

// Handle page hide event (navigating away, closing tab)
window.addEventListener('pagehide', (e) => {
    if (!backgroundHandlersEnabled) return;

    console.log('Page hide - saving state, persisted:', e.persisted);
    saveState();
    syncMediaSession({ includeMetadata: true, includePosition: true });

    // Don't cancel speech - browser media policies will decide background behavior.
    console.log('Page hidden, playback managed by browser policy');
}, { passive: true });

// Fallback: beforeunload for saving state
window.addEventListener('beforeunload', () => {
    if (!backgroundHandlersEnabled) return;
    console.log('Before unload - saving state');
    saveState();
});

// Force refresh - clears cache and reloads
function forceRefresh() {
    const btn = document.getElementById('refresh-btn');
    btn.textContent = '↻ Refreshing...';
    btn.disabled = true;

    // Clear caches
    if ('caches' in window) {
        caches.keys().then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
        }).then(() => {
            console.log('All caches cleared');
            // Unregister service worker and reload
            if (swClient.registration) {
                swClient.unregister().then(() => {
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        });
    } else {
        window.location.reload(true);
    }
}

// Apply pending update
function applyUpdate() {
    if (swClient.registration && swClient.registration.waiting) {
        swClient.registration.waiting.postMessage('SKIP_WAITING');
    }
    window.location.reload();
}

document.getElementById('refresh-btn')?.addEventListener('click', forceRefresh);
document.getElementById('apply-update-btn')?.addEventListener('click', applyUpdate);

// ===== MEDIA SESSION API =====
// Enables lock screen controls, notification controls, and handles audio interruptions
function estimateEpisodeDurationSeconds() {
    const episodeDurationMinutes = currentEpisode?.content
        ? extractEpisodeDurationMinutes(currentEpisode.content)
        : null;
    if (episodeDurationMinutes && episodeDurationMinutes > 0) {
        return Math.max(1, Math.round(episodeDurationMinutes * 60));
    }
    return Math.max(1, Math.round(dialogueLines.length * 3));
}

function estimateLineJumpFromSeconds(seconds) {
    const safeSeconds = Math.max(1, Number(seconds) || 10);
    const duration = estimateEpisodeDurationSeconds();
    if (duration <= 0 || dialogueLines.length === 0) return 1;
    return Math.max(1, Math.round((safeSeconds / duration) * dialogueLines.length));
}

function updateMediaSessionPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = (isPlaying && !isPaused) ? 'playing' : 'paused';
}

function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;
    if (!currentPodcast || !currentEpisode) return;
    if (typeof window.MediaMetadata !== 'function') return;
    const artwork = generatePodcastArtwork(currentPodcast);
    navigator.mediaSession.metadata = new MediaMetadata({
        title: currentEpisode.title,
        artist: currentPodcast.title,
        album: 'PodLearn',
        artwork: artwork
            ? [{ src: artwork, sizes: '512x512', type: 'image/png' }]
            : [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }]
    });
}

function updateMediaSessionPositionState() {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
    if (!currentEpisode || dialogueLines.length === 0) return;
    let duration;
    let position;
    if (speechPlayers.isContinuousReady()) {
        duration = speechPlayers.getDuration() || episodeAudioDuration || estimateEpisodeDurationSeconds();
        position = Math.max(0, Math.min(duration, speechPlayers.getCurrentTime()));
    } else {
        duration = estimateEpisodeDurationSeconds();
        const safeLineCount = Math.max(1, dialogueLines.length);
        const clampedLine = Math.max(0, Math.min(currentLineIndex, safeLineCount));
        position = Math.max(0, Math.min(duration, (clampedLine / safeLineCount) * duration));
    }
    try {
        navigator.mediaSession.setPositionState({
            duration,
            playbackRate: speechRate,
            position
        });
    } catch (err) {
        console.debug('Media Session position update failed:', err);
    }
}

function initializeMediaSessionHandlers() {
    if (!('mediaSession' in navigator) || mediaSessionHandlersInitialized) return;
    const setActionHandler = (action, handler) => {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (err) {
            console.debug(`Media Session action not supported: ${action}`, err);
        }
    };

    setActionHandler('play', () => {
        if (!isPlaying || isPaused) {
            void togglePlayPause();
        }
    });
    setActionHandler('pause', () => {
        if (isPlaying && !isPaused) {
            void togglePlayPause();
        }
    });
    setActionHandler('stop', () => {
        void stopPlayback();
    });
    setActionHandler('seekbackward', (details) => {
        const offset = Number(details?.seekOffset) || 10;
        if (speechPlayers.isContinuousReady()) {
            speechPlayers.seek(speechPlayers.getCurrentTime() - offset);
            updateMediaSessionPositionState();
        } else {
            const linesToJump = estimateLineJumpFromSeconds(offset);
            void jumpToLine(currentLineIndex - linesToJump, isPlaying && !isPaused);
        }
    });
    setActionHandler('seekforward', (details) => {
        const offset = Number(details?.seekOffset) || 10;
        if (speechPlayers.isContinuousReady()) {
            speechPlayers.seek(speechPlayers.getCurrentTime() + offset);
            updateMediaSessionPositionState();
        } else {
            const linesToJump = estimateLineJumpFromSeconds(offset);
            void jumpToLine(currentLineIndex + linesToJump, isPlaying && !isPaused);
        }
    });
    setActionHandler('seekto', (details) => {
        if (!Number.isFinite(details?.seekTime)) return;
        if (speechPlayers.isContinuousReady()) {
            speechPlayers.seek(details.seekTime);
            updateMediaSessionPositionState();
        } else {
            const duration = estimateEpisodeDurationSeconds();
            const targetLine = Math.round((details.seekTime / Math.max(1, duration)) * dialogueLines.length);
            void jumpToLine(targetLine, isPlaying && !isPaused);
        }
    });
    setActionHandler('previoustrack', () => {
        void playPreviousEpisode();
    });
    setActionHandler('nexttrack', () => {
        void playNextEpisode();
    });

    mediaSessionHandlersInitialized = true;
}

function syncMediaSession({ includeMetadata = false, includePosition = false } = {}) {
    if (!('mediaSession' in navigator)) return;
    initializeMediaSessionHandlers();
    if (includeMetadata) {
        updateMediaSessionMetadata();
    }
    updateMediaSessionPlaybackState();
    if (includePosition) {
        updateMediaSessionPositionState();
    }
}

// ===== KEYBOARD SHORTCUTS (desktop) =====
// Space play/pause, ←/→ seek, ↑/↓ speed, ? shows the shortcut overlay.
// Never fires while typing in a field or when focus is on an interactive
// control (buttons keep their native Space/Enter activation; the scrubber
// slider handles its own arrow keys).
const SHORTCUT_IGNORE_SELECTOR =
    'input, textarea, select, button, a, [contenteditable="true"], [role="slider"], [role="button"]';

function toggleShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    modal.classList.toggle('show');
}

document.getElementById('close-shortcuts-modal')?.addEventListener('click', () => {
    document.getElementById('shortcuts-modal')?.classList.remove('show');
});

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest(SHORTCUT_IGNORE_SELECTOR)) return;

    if (event.key === '?') {
        event.preventDefault();
        toggleShortcutsModal();
        return;
    }

    // Playback shortcuts stay quiet while any modal is open (the modal focus
    // trap owns the keyboard) or before an episode is loaded.
    if (document.querySelector('.modal-overlay.show')) return;
    if (!currentEpisode) return;

    switch (event.key) {
        case ' ':
            event.preventDefault();
            nowPlayingViz.ensureContext();
            void togglePlayPause();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            seekBySeconds(-skipBackwardInterval);
            break;
        case 'ArrowRight':
            event.preventDefault();
            seekBySeconds(skipForwardInterval);
            break;
        case 'ArrowUp':
            event.preventDefault();
            applySpeechRate(Math.round((speechRate + 0.1) * 10) / 10);
            break;
        case 'ArrowDown':
            event.preventDefault();
            applySpeechRate(Math.round((speechRate - 0.1) * 10) / 10);
            break;
    }
});

window.addEventListener('keydown', (event) => {
    const key = event.code || event.key;
    if (key === 'MediaPlayPause') {
        event.preventDefault();
        void togglePlayPause();
        return;
    }
    if (key === 'MediaTrackNext') {
        event.preventDefault();
        void playNextEpisode();
        return;
    }
    if (key === 'MediaTrackPrevious') {
        event.preventDefault();
        void playPreviousEpisode();
    }
});
