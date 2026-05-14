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

// ===== APP VERSION =====
const VERSION_STORAGE_KEY = 'tlu_app_seen_version';
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
    VERSION_STORAGE_KEY,
    STORAGE_KEY,
    'playQueue',
    'listeningStats',
    'skipForwardInterval',
    'skipBackwardInterval',
    'voiceBoostEnabled',
    'silenceTrimEnabled',
    'theme'
];
let APP_VERSION = localStorage.getItem(VERSION_STORAGE_KEY) || '0.0.0';

function updateVersionBadge() {
    const badge = document.getElementById('version-badge');
    if (badge) {
        badge.textContent = 'v' + APP_VERSION;
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

// Load podcasts.js with cache-busting
(function() {
    const script = document.createElement('script');
    script.src = 'podcasts.js?v=' + Date.now();
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
        document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">Failed to load podcasts. Try refreshing.</p>';
    };
    document.head.appendChild(script);
})();

// ===== STATE =====
let currentPodcast = null;
let currentEpisode = null;
let dialogueLines = [];
let currentLineIndex = 0;
let currentAudioManifestBase = '';
let isPlaying = false;
let isPaused = false;
let voices = [];
let alexVoice = null;
let samVoice = null;
let speechRate = 1.0;
let autoPlayNext = true;
let sleepTimer = null;
let sleepEndTime = null;
let searchMatches = [];
let searchIndex = 0;
const synth = window.speechSynthesis;
const SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
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

// Mini player state
let showMiniPlayer = false;

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
    const urls = [
        new URL(combinedAudioUrl(podcast.id, episode), location.href).toString(),
        new URL(manifestAudioUrl(podcast.id, episode), location.href).toString()
    ];
    try {
        const reply = await sendSwMessage({ type: 'CACHE_AUDIO_URLS', urls });
        const allOk = reply && Array.isArray(reply.results) && reply.results.every((r) => r.ok);
        if (!allOk) {
            const failed = reply && reply.results ? reply.results.filter((r) => !r.ok).map((r) => r.url).join(', ') : '(no SW)';
            console.warn('Episode download failed for', failed);
            setStatus('Download failed — try again');
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
    const color = podcast.color || '#6366f1';
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
    const next = currentPodcast.episodes.find((e) => e.id === currentEpisode.id + 1);
    if (!next) return;
    const nextKey = epKeyOf(currentPodcast, next);
    if (lastPrebufferedEpKey === nextKey) return;
    lastPrebufferedEpKey = nextKey;
    // Fire-and-forget: warms the browser HTTP cache so auto-play starts
    // without a network round-trip when this episode ends.
    const url = combinedAudioUrl(currentPodcast.id, next);
    fetch(url, { mode: 'no-cors' }).catch(() => { /* ignore */ });
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

    podcasts.forEach(podcast => {
        if (filter && !podcast.title.toLowerCase().includes(filterLower) &&
            !podcast.subtitle.toLowerCase().includes(filterLower)) {
            return;
        }

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
        renderPodcastCard(card, podcast, epCount, avgProgress);

        card.addEventListener('click', () => openPodcast(podcast));
        listEl.appendChild(card);
    });

    // Add "Create Podcast" card
    const addCard = document.createElement('div');
    addCard.className = 'add-podcast-card';
    addCard.innerHTML = `
        <div class="add-podcast-icon">+</div>
        <div class="add-podcast-text">Create Your Own Podcast</div>
    `;
    addCard.addEventListener('click', () => {
        document.getElementById('create-modal').classList.add('show');
    });
    listEl.appendChild(addCard);
}

function openPodcast(podcast) {
    currentPodcast = podcast;
    document.getElementById('current-podcast-title').textContent = podcast.title;
    document.getElementById('current-podcast-subtitle').textContent = podcast.subtitle;
    document.getElementById('nav-podcast-name').textContent = podcast.title;

    // Update accent color
    document.documentElement.style.setProperty('--accent', safeColor(podcast.color || '#6366f1'));

    document.getElementById('podcasts-view').classList.remove('active');
    document.getElementById('list-view').classList.add('active');
    renderEpisodeList();
}

document.getElementById('back-to-podcasts').addEventListener('click', () => {
    stopPlayback();
    saveState();
    currentPodcast = null;
    document.getElementById('list-view').classList.remove('active');
    document.getElementById('podcasts-view').classList.add('active');
    // Reset accent color
    document.documentElement.style.setProperty('--accent', '#6366f1');
    renderPodcastsList();
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
        autoPlayNext,
        alexVoiceIndex: document.getElementById('alex-voice').value,
        samVoiceIndex: document.getElementById('sam-voice').value
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
        speechRate = state.speechRate;
        document.getElementById('speed-slider').value = speechRate;
        document.getElementById('speed-value').textContent = `${speechRate.toFixed(1)}x`;
        // Update speed preset button highlights
        document.querySelectorAll('.speed-preset-btn').forEach(b => {
            b.classList.toggle('active', Math.abs(parseFloat(b.dataset.speed) - speechRate) < 0.01);
        });
    }
    if (state.autoPlayNext !== undefined) {
        autoPlayNext = state.autoPlayNext;
        document.getElementById('auto-play-toggle').classList.toggle('active', autoPlayNext);
    }
    return state;
}

// ===== VOICE LOADING =====
function loadVoices() {
    voices = synth.getVoices();
    if (voices.length === 0) {
        setTimeout(loadVoices, 100);
        return;
    }

    console.log('Available voices:', voices.length, voices.map(v => v.name));

    // Update voice count display
    const voiceCountEl = document.getElementById('voice-count');
    const englishCount = voices.filter(v => v.lang.toLowerCase().startsWith('en')).length;
    voiceCountEl.textContent = `${voices.length} voices available (${englishCount} English)`;

    const alexSelect = document.getElementById('alex-voice');
    const samSelect = document.getElementById('sam-voice');
    alexSelect.innerHTML = '';
    samSelect.innerHTML = '';

    // Categorize voices
    const maleKeywords = ['male', 'david', 'james', 'daniel', 'guy', 'aaron', 'mark', 'matthew', 'google us english', 'google uk english male'];
    const femaleKeywords = ['female', 'samantha', 'karen', 'victoria', 'fiona', 'zira', 'susan', 'google uk english female'];

    const maleVoices = [];
    const femaleVoices = [];
    const englishVoices = [];

    voices.forEach((voice, index) => {
        const name = voice.name.toLowerCase();
        const lang = voice.lang.toLowerCase();

        // Prefer English voices
        if (lang.startsWith('en')) {
            englishVoices.push({ voice, index });
        }

        if (maleKeywords.some(k => name.includes(k))) {
            maleVoices.push({ voice, index });
        } else if (femaleKeywords.some(k => name.includes(k))) {
            femaleVoices.push({ voice, index });
        }
    });

    // Populate select options
    voices.forEach((voice, index) => {
        const opt1 = document.createElement('option');
        opt1.value = index;
        opt1.textContent = `${voice.name} (${voice.lang})`;
        alexSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = index;
        opt2.textContent = `${voice.name} (${voice.lang})`;
        samSelect.appendChild(opt2);
    });

    // Restore saved voices or use defaults
    const state = loadState();
    let alexIdx = 0;
    let samIdx = voices.length > 1 ? 1 : 0;

    // Try to get saved voices
    if (state.alexVoiceIndex !== undefined && voices[parseInt(state.alexVoiceIndex, 10)]) {
        alexIdx = parseInt(state.alexVoiceIndex, 10);
    } else if (maleVoices.length > 0) {
        alexIdx = maleVoices[0].index;
    } else if (englishVoices.length > 0) {
        alexIdx = englishVoices[0].index;
    }

    if (state.samVoiceIndex !== undefined && voices[parseInt(state.samVoiceIndex, 10)]) {
        samIdx = parseInt(state.samVoiceIndex, 10);
    } else if (femaleVoices.length > 0) {
        samIdx = femaleVoices[0].index;
    } else if (englishVoices.length > 1) {
        // Pick a different English voice than Alex
        samIdx = englishVoices.find(v => v.index !== alexIdx)?.index || (alexIdx === 0 ? 1 : 0);
    }

    // Ensure different voices if possible
    if (samIdx === alexIdx && voices.length > 1) {
        samIdx = alexIdx === 0 ? 1 : 0;
    }

    alexSelect.value = alexIdx;
    samSelect.value = samIdx;
    alexVoice = voices[alexIdx];
    samVoice = voices[samIdx];

    console.log('Alex voice:', alexVoice?.name);
    console.log('Sam voice:', samVoice?.name);
}

if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
}
loadVoices();

document.getElementById('alex-voice').addEventListener('change', e => {
    const idx = parseInt(e.target.value, 10);
    alexVoice = voices[idx];
    console.log('Alex voice set to:', alexVoice?.name);
    saveState();
});
document.getElementById('sam-voice').addEventListener('change', e => {
    const idx = parseInt(e.target.value, 10);
    samVoice = voices[idx];
    console.log('Sam voice set to:', samVoice?.name);
    saveState();
});

// Preview voices
document.getElementById('preview-voices').addEventListener('click', () => {
    synth.cancel();
    const alexUtter = new SpeechSynthesisUtterance("Hi, I'm Alex, your technical expert.");
    if (alexVoice) alexUtter.voice = alexVoice;
    alexUtter.rate = speechRate;
    alexUtter.pitch = 0.9;

    const samUtter = new SpeechSynthesisUtterance("And I'm Sam, asking the questions you're thinking.");
    if (samVoice) samUtter.voice = samVoice;
    samUtter.rate = speechRate;
    samUtter.pitch = 1.1;

    synth.speak(alexUtter);
    synth.speak(samUtter);
});

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

        // Match any speaker pattern: **NAME:** or **NAME:** text
        const speakerMatch = trimmed.match(SPEAKER_LINE_RE);
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
        } else if (dirMatch) {
            // Stage directions like [MUSIC FADES] - skip these, don't speak them
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
        const downloadState = isEpisodeDownloading(currentPodcast, ep)
            ? 'downloading'
            : isEpisodeDownloaded(currentPodcast, ep) ? 'downloaded' : 'none';
        renderEpisodeCard(card, ep, progress, isComplete, inProgress, downloadState);
        card.addEventListener('click', (event) => {
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
        });
        listEl.appendChild(card);
    });

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
    const cacheKey = Date.now().toString(36);
    try {
        const res = await fetch(`${base}/manifest.json?v=${cacheKey}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (!res.ok) return null;
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) return null;
        return { base, cacheKey, items };
    } catch {
        return null;
    }
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
            const combinedUrl = `${audioManifest.base}/combined.mp3?v=${audioManifest.cacheKey}`;
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

    if (Number.isInteger(preferredLine)) {
        initialLine = preferredLine;
    } else if (
        promptResume &&
        savedLine > 0 &&
        savedLine < Math.max(0, dialogueLines.length - 1)
    ) {
        const shouldResume = window.confirm(`Resume this episode from line ${savedLine + 1}?`);
        initialLine = shouldResume ? savedLine : 0;
    }

    currentLineIndex = Math.max(0, Math.min(initialLine, Math.max(0, dialogueLines.length - 1)));

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
    setStatus('Ready - Tap play to start');
    syncMediaSession({ includeMetadata: true, includePosition: true });
    updateMiniPlayer();

    document.getElementById('list-view').classList.remove('active');
    document.getElementById('player-view').classList.add('active');
    // Hide mini player when entering player view
    document.getElementById('mini-player').classList.remove('active');
}

document.getElementById('back-to-list').addEventListener('click', () => {
    saveState();
    document.getElementById('player-view').classList.remove('active');
    document.getElementById('list-view').classList.add('active');
    // Show mini player if still playing
    const showMini = currentPodcast && currentEpisode && (isPlaying || isPaused);
    document.getElementById('mini-player').classList.toggle('active', showMini);
    if (showMini) updateMiniPlayer();
    renderEpisodeList();
});

// Home button from player - go all the way back to podcasts list
document.getElementById('home-from-player').addEventListener('click', () => {
    saveState();
    document.getElementById('player-view').classList.remove('active');
    document.getElementById('podcasts-view').classList.add('active');
    // Show mini player if still playing
    const showMini = currentPodcast && currentEpisode && (isPlaying || isPaused);
    document.getElementById('mini-player').classList.toggle('active', showMini);
    if (showMini) updateMiniPlayer();
    renderPodcastsList();
});

// ===== TRANSCRIPT =====
function renderTranscript() {
    const content = document.getElementById('transcript-content');
    content.innerHTML = '';

    dialogueLines.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = `transcript-line ${line.type}`;
        div.dataset.index = index;

        renderTranscriptLine(div, line);
        div.addEventListener('click', () => jumpToLine(index));
        content.appendChild(div);
    });

    updateProgress();
}

function updateProgress() {
    const pct = dialogueLines.length > 0 ? (currentLineIndex / dialogueLines.length) * 100 : 0;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('current-pos').textContent = `Line ${currentLineIndex + 1}`;
    document.getElementById('total-pos').textContent = `of ${dialogueLines.length}`;

    // Calculate time remaining using actual audio durations or estimate
    const linesLeft = dialogueLines.length - currentLineIndex;
    const episodeDurationMinutes = currentEpisode?.content ? extractEpisodeDurationMinutes(currentEpisode.content) : null;
    const estimatedSecondsPerLine = (episodeDurationMinutes && dialogueLines.length > 0)
        ? (episodeDurationMinutes * 60) / dialogueLines.length
        : 3;
    const secondsLeft = (linesLeft * estimatedSecondsPerLine) / speechRate;

    const minsLeft = Math.round(secondsLeft / 60);
    document.getElementById('time-remaining').textContent = `~${minsLeft} min left`;

    // Update highlighting
    document.querySelectorAll('.transcript-line').forEach((el, i) => {
        el.classList.toggle('current', i === currentLineIndex);
    });

    // Scroll into view
    const currentEl = document.querySelector('.transcript-line.current');
    if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (sleepEndTime && Date.now() >= sleepEndTime) {
        sleepEndTime = null;
        updateSleepDisplay();
        setStatus('Sleep timer ended');
        void stopPlayback();
        return;
    }
    updateMediaSessionPositionState();
    maybePrebufferNextEpisode();
});

speechPlayers.on('play', () => {
    isPlaying = true;
    isPaused = false;
    document.getElementById('play-btn').textContent = '⏸';
    updateMiniPlayer();
    updateMediaSessionPlaybackState();
    void requestWakeLock();
});

speechPlayers.on('pause', () => {
    if (!isPlaying) return;
    isPaused = true;
    document.getElementById('play-btn').textContent = '▶';
    updateMiniPlayer();
    updateMediaSessionPlaybackState();
    saveState();
    void releaseWakeLock();
});

speechPlayers.on('ended', () => {
    isPlaying = false;
    isPaused = false;
    currentLineIndex = Math.max(0, dialogueLines.length - 1);
    saveState();
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    void releaseWakeLock();
    showCompleteModal();
});

speechPlayers.on('error', (err) => {
    console.warn('Audio element error:', err);
    setStatus('Audio playback error');
});

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
            console.warn('combined.mp3 play() rejected:', err);
            setStatus('Tap play to start');
        }
        syncMediaSession({ includeMetadata: true, includePosition: true });
        return;
    }

    // Legacy chunked fallback (manifest lacks per-line durations).
    if (isPlaying && !isPaused) return;
    const sessionId = playbackSessions.createSession();
    isPlaying = true;
    isPaused = false;
    document.getElementById('play-btn').textContent = '⏸';
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    await requestWakeLock();

    while (currentLineIndex < dialogueLines.length && isPlaying) {
        if (!playbackSessions.isActive(sessionId)) break;
        if (sleepEndTime && Date.now() >= sleepEndTime) {
            await stopPlayback();
            sleepEndTime = null;
            updateSleepDisplay();
            setStatus('Sleep timer ended');
            break;
        }
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
        await releaseWakeLock();
        saveState();
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: true, includePosition: true });
        showCompleteModal();
    } else {
        isPlaying = false;
        isPaused = false;
        await releaseWakeLock();
        document.getElementById('play-btn').textContent = '▶';
        setStatus('Ready');
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: true, includePosition: true });
    }
}

async function stopPlayback() {
    playbackSessions.invalidate();
    isPlaying = false;
    isPaused = false;
    speechPlayers.stop();
    speechPlayers.stopCurrentSpeech();
    await releaseWakeLock();
    document.getElementById('play-btn').textContent = '▶';
    saveState();
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
}

async function togglePlayPause() {
    if (speechPlayers.isContinuousReady()) {
        if (!isPlaying || isPaused) {
            if (!isPlaying) speechPlayers.seekToLine(currentLineIndex);
            try { await speechPlayers.play(); } catch (err) { console.warn('play() failed:', err); }
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
        document.getElementById('play-btn').textContent = '⏸';
    } else {
        isPaused = true;
        await releaseWakeLock();
        speechPlayers.pauseCurrentSpeech();
        document.getElementById('play-btn').textContent = '▶';
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
        updateMiniPlayer();
        syncMediaSession({ includeMetadata: false, includePosition: true });
        if (autoStart || wasPlaying) {
            try { await speechPlayers.play(); } catch (err) { console.warn('seek-and-play failed:', err); }
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
    saveState();
    document.getElementById('play-btn').textContent = '▶';
    setStatus('Ready');
    updateMiniPlayer();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    if (autoStart || wasPlaying) {
        setTimeout(() => { void startPlayback(); }, 100);
    }
}

function skipLines(n) {
    jumpToLine(currentLineIndex + n, isPlaying && !isPaused);
}

// Controls
document.getElementById('play-btn').addEventListener('click', togglePlayPause);
document.getElementById('prev-btn').addEventListener('click', () => skipLines(-10));
document.getElementById('next-btn').addEventListener('click', () => skipLines(10));
document.getElementById('back-btn').addEventListener('click', () => skipLines(-5));
document.getElementById('fwd-btn').addEventListener('click', () => skipLines(5));

// Speed
document.getElementById('speed-slider').addEventListener('input', e => {
    speechRate = parseFloat(e.target.value);
    document.getElementById('speed-value').textContent = `${speechRate.toFixed(1)}x`;
    // Update speed preset button highlights
    document.querySelectorAll('.speed-preset-btn').forEach(b => {
        b.classList.toggle('active', Math.abs(parseFloat(b.dataset.speed) - speechRate) < 0.01);
    });
    speechPlayers.setRate(speechRate);
    saveState();
});

// Progress bar click
document.getElementById('progress-bar').addEventListener('click', e => {
    const rect = e.target.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const wasPlaying = isPlaying && !isPaused;
    jumpToLine(Math.floor(pct * dialogueLines.length), wasPlaying);
});

// Auto-play toggle
document.getElementById('auto-play-toggle').addEventListener('click', () => {
    autoPlayNext = !autoPlayNext;
    document.getElementById('auto-play-toggle').classList.toggle('active', autoPlayNext);
    saveState();
});

// ===== SLEEP TIMER =====
document.getElementById('sleep-timer-btn').addEventListener('click', () => {
    document.getElementById('sleep-modal').classList.add('show');
});

document.getElementById('close-sleep-modal').addEventListener('click', () => {
    document.getElementById('sleep-modal').classList.remove('show');
});

document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mins = parseInt(btn.dataset.minutes);
        sleepEndTime = Date.now() + mins * 60 * 1000;
        updateSleepDisplay();
    });
});

document.getElementById('cancel-timer').addEventListener('click', () => {
    sleepEndTime = null;
    document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
    updateSleepDisplay();
});

function updateSleepDisplay() {
    const display = document.getElementById('timer-display');
    if (sleepEndTime) {
        const minsLeft = Math.max(0, Math.round((sleepEndTime - Date.now()) / 60000));
        display.textContent = `Stopping in ${minsLeft} minutes`;
        display.classList.add('active');
    } else {
        display.textContent = 'No timer set';
        display.classList.remove('active');
    }
}

// Update timer display every minute
setInterval(updateSleepDisplay, 60000);

// ===== EPISODE COMPLETE MODAL =====
function showCompleteModal() {
    document.getElementById('play-btn').textContent = '▶';
    setStatus('Episode complete! 🎉');

    const episodes = currentPodcast?.episodes || [];
    const nextEp = episodes.find(e => e.id === currentEpisode.id + 1);

    if (autoPlayNext && nextEp) {
        document.getElementById('complete-message').textContent = `Starting "${nextEp.title}" in 5 seconds...`;
        document.getElementById('play-next-episode').textContent = 'Play Now';
        document.getElementById('complete-modal').classList.add('show');

        setTimeout(() => {
            if (document.getElementById('complete-modal').classList.contains('show')) {
                playNextEpisode();
            }
        }, 5000);
    } else if (nextEp) {
        document.getElementById('complete-message').textContent = `Up next: "${nextEp.title}"`;
        document.getElementById('play-next-episode').textContent = 'Play Next Episode';
        document.getElementById('complete-modal').classList.add('show');
    } else {
        document.getElementById('complete-message').textContent = 'You\'ve completed all episodes! 🏆';
        document.getElementById('play-next-episode').style.display = 'none';
        document.getElementById('complete-modal').classList.add('show');
    }
}

async function playNextEpisode() {
    document.getElementById('complete-modal').classList.remove('show');
    const episodes = currentPodcast?.episodes || [];
    const nextEp = episodes.find(e => e.id === currentEpisode.id + 1);
    if (nextEp) {
        await openEpisode(nextEp, { promptResume: false, preferredLine: 0 });
        startPlayback();
    }
}

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
            skipLines(-10); // Swipe right = go back
        } else {
            skipLines(10); // Swipe left = go forward
        }
    }
    touchStartX = 0;
}, { passive: true });

// ===== COLLAPSIBLE PANELS =====
document.querySelectorAll('.panel-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('collapsed');
    });
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

// Speed Presets
document.querySelectorAll('.speed-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        speechRate = speed;
        document.getElementById('speed-slider').value = speed;
        document.getElementById('speed-value').textContent = `${speed.toFixed(1)}x`;
        document.querySelectorAll('.speed-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveState();
    });
});

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme');
    document.getElementById('theme-toggle').querySelector('span').textContent =
        currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
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

function updateSkipButtonTitles() {
    document.getElementById('next-btn').title = `Forward ${skipForwardInterval}s`;
    document.getElementById('prev-btn').title = `Back ${skipBackwardInterval}s`;
}

// Voice Boost Toggle
document.getElementById('voice-boost-toggle').addEventListener('click', () => {
    voiceBoostEnabled = !voiceBoostEnabled;
    document.getElementById('voice-boost-toggle').classList.toggle('active', voiceBoostEnabled);
    document.getElementById('voice-boost-toggle').querySelector('span').textContent =
        voiceBoostEnabled ? 'On' : 'Off';
    localStorage.setItem('voiceBoostEnabled', voiceBoostEnabled);
    if (voiceBoostEnabled) {
        setStatus('Voice boost is handled in generated Supertonic audio');
    }
});

// Silence Trim Toggle
document.getElementById('silence-trim-toggle').addEventListener('click', () => {
    silenceTrimEnabled = !silenceTrimEnabled;
    document.getElementById('silence-trim-toggle').classList.toggle('active', silenceTrimEnabled);
    document.getElementById('silence-trim-toggle').querySelector('span').textContent =
        silenceTrimEnabled ? 'On' : 'Off';
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
    cards.forEach(card => {
        const status = card.classList.contains('completed') ? 'completed' :
                      card.classList.contains('in-progress') ? 'in-progress' : 'unplayed';
        const show = currentFilter === 'all' ||
                    (currentFilter === 'completed' && status === 'completed') ||
                    (currentFilter === 'in-progress' && status === 'in-progress') ||
                    (currentFilter === 'unplayed' && status === 'unplayed');
        card.style.display = show ? '' : 'none';
    });

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

    // Add click handlers
    queueList.querySelectorAll('.queue-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('queue-remove')) {
                const queueItem = playQueue[index];
                const podcast = getPodcasts().find(p => p.id === queueItem.podcastId);
                if (!podcast) return;
                const episode = podcast.episodes.find(e => e.id === queueItem.episodeNum);
                if (!episode) return;
                openPodcast(podcast);
                setTimeout(() => openEpisode(episode, { promptResume: true }), 100);
            }
        });
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
    if (currentPodcast && currentEpisode) {
        document.getElementById('mini-player-title').textContent = currentEpisode.title;
        document.getElementById('mini-player-subtitle').textContent = currentPodcast.title;
        document.getElementById('mini-play-btn').textContent = (isPlaying && !isPaused) ? '⏸' : '▶';
    }
}

document.getElementById('mini-player').addEventListener('click', (e) => {
    if (!e.target.classList.contains('mini-ctrl-btn') && currentPodcast && currentEpisode) {
        showView('player-view');
    }
});

document.getElementById('mini-play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
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
if (voiceBoostEnabled) {
    document.getElementById('voice-boost-toggle').classList.add('active');
    document.getElementById('voice-boost-toggle').querySelector('span').textContent = 'On';
}
if (silenceTrimEnabled) {
    document.getElementById('silence-trim-toggle').classList.add('active');
    document.getElementById('silence-trim-toggle').querySelector('span').textContent = 'On';
}
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

        renderChapterItem(item, chap, idx);

        item.addEventListener('click', () => {
            jumpToLine(chap.lineIndex, true);
        });

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
        el.classList.toggle('current', idx === currentChapIdx);
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
        container.innerHTML += '<div class="no-items">No bookmarks yet</div>';
        return;
    }

    epBookmarks.forEach(bm => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';

        // Get preview text from dialogue
        const line = dialogueLines[bm.lineIndex];
        const preview = line ? line.text.substring(0, 60) + (line.text.length > 60 ? '...' : '') : '';

        renderBookmarkItem(item, bm, preview);

        item.querySelector('.bookmark-content').addEventListener('click', () => {
            jumpToLine(bm.lineIndex, true);
        });

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

// ===== INIT =====
restoreState();
renderPodcastsList();
bindNavTabs();

// Service worker registration with update handling
const swClient = registerServiceWorker();

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
