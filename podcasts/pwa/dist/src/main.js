import { safeColor } from './security/sanitize.js';
import { applyLiteralHighlight, includesQuery } from './search/transcript-search.js';
import {
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
const APP_VERSION = '2.2.0';

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
            console.log('Version check - Local:', APP_VERSION, 'Server:', data.version);

            if (data.version !== APP_VERSION) {
                console.log('Update available! Clearing caches and reloading...');

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
                window.location.reload(true);
                return;
            }
        }
    } catch (e) {
        console.log('Version check skipped (offline?):', e.message);
    }
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

// ===== PODCASTS HOME =====
function renderPodcastsList(filter = '') {
    // Update version badge
    document.getElementById('version-badge').textContent = 'v' + APP_VERSION;

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
function parseMarkdown(content) {
    const lines = content.split('\n');
    const dialogue = [];
    let currentSpeaker = null;
    let speakerCount = 0;
    const speakerMap = {}; // Maps speaker names to 'alex' or 'sam' voice

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('|') ||
            trimmed.startsWith('---') || trimmed.startsWith('*Next') || trimmed.startsWith('[Read')) {
            continue;
        }

        // Match any speaker pattern: **NAME:** or **NAME:** text
        const speakerMatch = trimmed.match(SPEAKER_LINE_RE);
        const dirMatch = trimmed.match(/^\*?\*?\[(.+)\]\*?\*?$/);

        if (speakerMatch) {
            const speakerName = speakerMatch[1];
            const text = (speakerMatch[2] || '').trim();

            // Ignore metadata-like bold labels that are not dialogue lines.
            if (!text) {
                currentSpeaker = null;
                continue;
            }

            // Assign voice type (alternating between alex and sam voices)
            if (!speakerMap[speakerName]) {
                speakerMap[speakerName] = speakerCount % 2 === 0 ? 'alex' : 'sam';
                speakerCount++;
            }

            const voiceType = speakerMap[speakerName];
            dialogue.push({
                speaker: speakerName,
                text: cleanText(text),
                type: voiceType
            });
            currentSpeaker = voiceType;
        } else if (dirMatch) {
            // Stage directions like [MUSIC FADES] - skip these, don't speak them
            // dialogue.push({ speaker: '', text: dirMatch[1], type: 'direction' });
            continue;
        } else if (currentSpeaker && trimmed.length > 0 && !trimmed.startsWith('*') && !trimmed.startsWith('-')) {
            // Continuation of previous speaker's text
            if (dialogue.length > 0 && dialogue[dialogue.length - 1].type === currentSpeaker) {
                dialogue[dialogue.length - 1].text += ' ' + cleanText(trimmed);
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
        renderEpisodeCard(card, ep, progress, isComplete, inProgress);
        card.addEventListener('click', () => openEpisode(ep));
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
async function openEpisode(episode) {
    await stopPlayback();
    currentEpisode = episode;
    dialogueLines = parseMarkdown(episode.content);
    chapters = parseChapters(episode.content);

    // Restore progress (with podcast-scoped key)
    const state = loadState();
    const epKey = currentPodcast ? `${currentPodcast.id}-${episode.id}` : episode.id;
    const progress = state.episodeProgress?.[epKey];
    currentLineIndex = progress?.line || 0;

    document.getElementById('player-episode-title').textContent = `Ep ${episode.id}: ${episode.title}`;

    // Set breadcrumb navigation
    const podcastName = currentPodcast ? currentPodcast.title : 'Podcast';
    document.getElementById('player-breadcrumb').textContent = `Home › ${podcastName} › Episode ${episode.id}`;

    renderTranscript();
    renderChapters();
    renderBookmarks();
    updateProgress();
    setStatus('Ready - Tap play to start');

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

function speak(text, speaker) {
    return speechPlayers.speak(text, speaker);
}

const speechPlayers = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice, samVoice }),
    getSpeechRate: () => speechRate
});

async function startPlayback() {
    if (dialogueLines.length === 0) return;
    if (isPlaying && !isPaused) return;
    const sessionId = playbackSessions.createSession();

    isPlaying = true;
    isPaused = false;
    document.getElementById('play-btn').textContent = '⏸';

    // Request wake lock to keep device awake during playback
    await requestWakeLock();

    while (currentLineIndex < dialogueLines.length && isPlaying) {
        if (!playbackSessions.isActive(sessionId)) break;
        // Check sleep timer
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
            await speak(line.text, line.type);
        } catch (e) {
            console.error('Speech error:', e);
        }
        if (!playbackSessions.isActive(sessionId)) break;

        if (isPlaying && !isPaused) {
            currentLineIndex++;
            await new Promise(r => setTimeout(r, 300));
        }
    }
    if (!playbackSessions.isActive(sessionId)) return;

    // Episode complete
    if (currentLineIndex >= dialogueLines.length && isPlaying) {
        isPlaying = false;
        isPaused = false;
        await releaseWakeLock();
        saveState();
        showCompleteModal();
    } else {
        isPlaying = false;
        isPaused = false;
        await releaseWakeLock();
        document.getElementById('play-btn').textContent = '▶';
        setStatus('Ready');
    }
}

async function stopPlayback() {
    playbackSessions.invalidate();
    isPlaying = false;
    isPaused = false;
    speechPlayers.stopCurrentSpeech();
    // Release wake lock when stopping playback
    await releaseWakeLock();
    document.getElementById('play-btn').textContent = '▶';
    saveState();
}

async function togglePlayPause() {
    if (!isPlaying) {
        startPlayback();
    } else if (isPaused) {
        isPaused = false;
        // Re-acquire wake lock when resuming
        await requestWakeLock();
        synth.resume();
        document.getElementById('play-btn').textContent = '⏸';
    } else {
        isPaused = true;
        // Release wake lock when pausing
        await releaseWakeLock();
        synth.pause();
        document.getElementById('play-btn').textContent = '▶';
        setStatus('Paused');
        saveState();
    }
    updateMiniPlayer();
}

async function jumpToLine(index, autoStart = false) {
    const wasPlaying = isPlaying && !isPaused;
    // Stop any current playback cleanly
    playbackSessions.invalidate();
    isPlaying = false;
    isPaused = false;
    speechPlayers.stopCurrentSpeech();
    // Release wake lock when jumping
    await releaseWakeLock();

    currentLineIndex = Math.max(0, Math.min(index, dialogueLines.length - 1));
    updateProgress();
    saveState();

    // Update UI
    document.getElementById('play-btn').textContent = '▶';
    setStatus('Ready');

    // Auto-start if requested or was playing before
    if (autoStart || wasPlaying) {
        setTimeout(() => startPlayback(), 100);
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
        await openEpisode(nextEp);
        startPlayback();
    }
}

async function playPreviousEpisode() {
    const episodes = currentPodcast?.episodes || [];
    const prevEp = episodes.find(e => e.id === currentEpisode.id - 1);
    if (prevEp) {
        await openEpisode(prevEp);
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
        setStatus('Voice boost is limited in TTS mode');
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
                setTimeout(() => openEpisode(episode), 100);
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
    togglePlayPause();
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
                    openEpisode(episode);
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

        // Save current state but do not force pause here.
        saveState();
        console.log('Playback handling delegated to browser while backgrounded');
    } else {
        // App came to foreground
        console.log('App came to foreground, wasPlaying:', wasPlayingBeforeBackground);

        // Re-acquire wake lock if playback is active
        if (isPlaying && !isPaused) {
            await requestWakeLock();

            // Resume speech synthesis if it was paused
            if (synth.paused) {
                console.log('Resuming speech synthesis after background');
                synth.resume();
            }
        }
    }
}, { passive: true });

// Handle page hide event (navigating away, closing tab)
window.addEventListener('pagehide', (e) => {
    if (!backgroundHandlersEnabled) return;

    console.log('Page hide - saving state, persisted:', e.persisted);
    saveState();

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
function updateMediaSession() {
    if (!('mediaSession' in navigator)) {
        console.log('Media Session API not supported');
        return;
    }

    if (!currentPodcast || !currentEpisode) {
        return;
    }

    // Update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
        title: currentEpisode.title,
        artist: currentPodcast.title,
        album: 'PodLearn',
        artwork: [
            { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
    });

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying || isPaused) {
            togglePlayPause();
        }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying && !isPaused) {
            togglePlayPause();
        }
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
        // Jump back 10 seconds worth of lines
        const newIndex = Math.max(0, currentLineIndex - 5);
        jumpToLine(newIndex);
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
        // Jump forward 10 seconds worth of lines
        const newIndex = Math.min(dialogueLines.length - 1, currentLineIndex + 5);
        jumpToLine(newIndex);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
        // Navigate to previous episode
        playPreviousEpisode();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Navigate to next episode
        playNextEpisode();
    });

    // Update playback state
    navigator.mediaSession.playbackState = (isPlaying && !isPaused) ? 'playing' : 'paused';

    console.log('Media Session API initialized');
}

// Call updateMediaSession when playback state changes
const originalTogglePlayPause = togglePlayPause;
togglePlayPause = function() {
    const result = originalTogglePlayPause();
    updateMediaSession();
    return result;
};

const originalStartPlayback = startPlayback;
startPlayback = function() {
    const result = originalStartPlayback();
    updateMediaSession();
    return result;
};

const originalStopPlayback = stopPlayback;
stopPlayback = function() {
    const result = originalStopPlayback();
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
    }
    return result;
};
