// App controller: bootstrapping, state, screen routing, and playback
// orchestration. Feature UIs live in cohesive modules under src/ — this file
// owns the cross-cutting mutable state (current podcast/episode, playback
// flags) and wires the modules together.

import {
    STORAGE_KEY,
    STATE_SCHEMA_VERSION,
    loadAppState,
    saveAppState
} from './state/storage.js?v=2.3.0%2B20260717T091248Z';
import { bindNavTabs } from './ui/tabs.js?v=2.3.0%2B20260717T091248Z';
import { registerServiceWorker } from './sw/register-sw.js?v=2.3.0%2B20260717T091248Z';
import { createPlaybackSessionController } from './playback/controller.js?v=2.3.0%2B20260717T091248Z';
import { createSpeechPlayers } from './playback/audio.js?v=2.3.0%2B20260717T091248Z';
import { parseChaptersFromContent, extractEpisodeDurationMinutes } from './playback/chapters.js?v=2.3.0%2B20260717T091248Z';
import { createScrubber, bufferedEndFraction } from './ui/scrubber.js?v=2.3.0%2B20260717T091248Z';
import { createRepeatSkipper } from './ui/long-press.js?v=2.3.0%2B20260717T091248Z';
import { getShowSpeed, setShowSpeed, clampSpeed, SPEED_PREFS_KEY } from './state/speed-prefs.js?v=2.3.0%2B20260717T091248Z';
import { transitionViews, morphViews, spawnRipple, showSkipFlyout, prefersReducedMotion } from './ui/motion.js?v=2.3.0%2B20260717T091248Z';
import { createNowPlayingVisualizer } from './playback/visualizer.js?v=2.3.0%2B20260717T091248Z';
import { createToastManager } from './ui/toast.js?v=2.3.0%2B20260717T091248Z';
import {
    VERSION_STORAGE_KEY,
    checkForUpdates
} from './app/version.js?v=2.3.0%2B20260717T091248Z';
import { createPodcastsLoader, getPodcasts } from './app/podcasts-loader.js?v=2.3.0%2B20260717T091248Z';
import { createWakeLockManager } from './app/wake-lock.js?v=2.3.0%2B20260717T091248Z';
import {
    SPEAKER_LINE_RE,
    parseSpeakerVoiceMap,
    parseMarkdown,
    alignChapterLineIndexes
} from './parse/dialogue.js?v=2.3.0%2B20260717T091248Z';
import {
    combinedAudioUrl,
    withCacheKey,
    epKeyOf,
    loadSupertonicAudioManifest,
    attachAudioUrls,
    buildLineOffsets
} from './playback/manifest.js?v=2.3.0%2B20260717T091248Z';
import { createDownloadsManager } from './downloads/downloads.js?v=2.3.0%2B20260717T091248Z';
import { createMediaSessionController } from './playback/media-session.js?v=2.3.0%2B20260717T091248Z';
import { createSleepController } from './playback/sleep-controller.js?v=2.3.0%2B20260717T091248Z';
import { findNextUp } from './state/queue-next.js?v=2.3.0%2B20260717T091248Z';
import { formatClock } from './ui/format.js?v=2.3.0%2B20260717T091248Z';
import { generatePodcastArtwork, applyShowPalette, clearShowPalette } from './ui/artwork.js?v=2.3.0%2B20260717T091248Z';
import { activateCardWithKeyboard, updateToggleButton, setPlayButtonState, setPressedState } from './ui/dom.js?v=2.3.0%2B20260717T091248Z';
import { initModalA11y } from './ui/modal-a11y.js?v=2.3.0%2B20260717T091248Z';
import { createMiniPlayer } from './ui/mini-player.js?v=2.3.0%2B20260717T091248Z';
import { createSettingsPanel } from './ui/settings-panel.js?v=2.3.0%2B20260717T091248Z';
import { createStatsTracker } from './state/stats.js?v=2.3.0%2B20260717T091248Z';
import { createQueuePanel } from './ui/queue-panel.js?v=2.3.0%2B20260717T091248Z';
import { createBookmarksPanel } from './ui/bookmarks-panel.js?v=2.3.0%2B20260717T091248Z';
import { createChaptersPanel } from './ui/chapters-panel.js?v=2.3.0%2B20260717T091248Z';
import { createTranscriptPanel } from './ui/transcript-panel.js?v=2.3.0%2B20260717T091248Z';
import { createLibrary } from './ui/library.js?v=2.3.0%2B20260717T091248Z';
import { createSharePanel } from './ui/share-panel.js?v=2.3.0%2B20260717T091248Z';
import { initKeyboardShortcuts } from './ui/shortcuts.js?v=2.3.0%2B20260717T091248Z';
import { initSwipeGestures } from './ui/swipe.js?v=2.3.0%2B20260717T091248Z';

// Queue-able notifications with retry actions — the user-visible surface for
// audio load failures, offline-download failures, and app updates.
const toasts = createToastManager({ container: document.getElementById('toast-region') });

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

// ===== AUTO-UPDATE CHECK =====
// Runs immediately - fetches version from server bypassing all caches.
// If version mismatch, clears everything and reloads.
void checkForUpdates();

// ===== STATE =====
let currentPodcast = null;
let currentEpisode = null;
let dialogueLines = [];
let currentLineIndex = 0;
let currentAudioManifestBase = '';
let isPlaying = false;
let isPaused = false;
let speechRate = 1.0;
let autoPlayNext = true;
let chapters = [];
let lineOffsets = [];
let episodeAudioDuration = 0;
let lastPersistedLine = -1;
let lastPrebufferedEpKey = null;

// The podcast that owns the loaded episode. `currentPodcast` follows the
// user's browsing context (it changes when they open another show from home
// while audio keeps playing); `playerPodcast` always matches `currentEpisode`
// so the mini player and expand-to-player flow stay correct.
let playerPodcast = null;

const playbackSessions = createPlaybackSessionController();

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

// Wake Lock keeps the screen on during playback and re-acquires itself if the
// OS releases it while playback is still active.
const wakeLock = createWakeLockManager({
    shouldReacquire: () => isPlaying && !isPaused && !document.hidden
});
const requestWakeLock = wakeLock.request;
const releaseWakeLock = wakeLock.release;

// ===== FEATURE MODULES =====

const stats = createStatsTracker({
    getSpeechRate: () => speechRate,
    isListening: () => isPlaying && !isPaused
});

const downloads = createDownloadsManager({
    toasts,
    setStatus,
    getPodcasts,
    loadManifest: loadSupertonicAudioManifest,
    onChange: () => library.refreshEpisodeList()
});

const library = createLibrary({
    getPodcasts,
    isLoaded: () => podcastsLoader.isLoaded(),
    loadState,
    getCurrentPodcast: () => currentPodcast,
    downloads,
    onOpenPodcast: (podcast, sourceArt) => openPodcast(podcast, { sourceArt }),
    onOpenEpisode: (episode) => { void openEpisode(episode); }
});

const podcastsLoader = createPodcastsLoader({
    toasts,
    onLoaded: () => {
        library.renderPodcastsList();
        // First paint of the library: give the home list its staggered
        // entrance (later showView calls stamp this themselves).
        stampViewEntering(document.getElementById('podcasts-view'));
    }
});

const queuePanel = createQueuePanel({
    getPodcasts,
    isCurrentItem: (item) => currentPodcast?.id === item.podcastId && currentEpisode?.id === item.episodeNum,
    onOpenItem: (podcast, episode) => {
        openPodcast(podcast);
        setTimeout(() => openEpisode(episode, { promptResume: true }), 100);
    }
});

const bookmarksPanel = createBookmarksPanel({
    loadState,
    saveAppState,
    getEpisodeKey,
    getDialogueLines: () => dialogueLines,
    getCurrentLineIndex: () => currentLineIndex,
    jumpToLine: (index, autoStart) => { void jumpToLine(index, autoStart); }
});

const chaptersPanel = createChaptersPanel({
    getChapters: () => chapters,
    getCurrentLineIndex: () => currentLineIndex,
    getDialogueLineCount: () => dialogueLines.length,
    getLineOffsets: () => lineOffsets,
    getEpisodeAudioDuration: () => episodeAudioDuration,
    jumpToLine: (index, autoStart) => { void jumpToLine(index, autoStart); }
});

const transcriptPanel = createTranscriptPanel({
    getDialogueLines: () => dialogueLines,
    onSeekLine: (index) => { void jumpToLine(index); },
    onAfterRender: () => updateProgress()
});

const sleep = createSleepController({
    speechPlayers,
    getSpeechRate: () => speechRate,
    getEpisodeAudioDuration: () => episodeAudioDuration,
    setStatus,
    saveState,
    stopPlayback: () => stopPlayback(),
    syncMediaSession: (options) => syncMediaSession(options)
});

const mediaSession = createMediaSessionController({
    speechPlayers,
    getState: () => ({
        isPlaying,
        isPaused,
        currentPodcast,
        currentEpisode,
        dialogueLines,
        currentLineIndex,
        speechRate,
        episodeAudioDuration
    }),
    getArtwork: generatePodcastArtwork,
    estimateEpisodeDurationSeconds,
    estimateLineJumpFromSeconds,
    actions: {
        togglePlayPause,
        stopPlayback,
        jumpToLine,
        playNextEpisode,
        playPreviousEpisode
    }
});

function syncMediaSession(options) {
    mediaSession.sync(options);
}

function updateMediaSessionPositionState() {
    mediaSession.updatePositionState();
}

const settings = createSettingsPanel({
    setStatus,
    stopPlayback,
    localStorageKeysToClear: LOCAL_STORAGE_KEYS_TO_CLEAR
});

const miniPlayer = createMiniPlayer({
    getPlayerPodcast: () => playerPodcast,
    getCurrentPodcast: () => currentPodcast,
    getCurrentEpisode: () => currentEpisode,
    getPlaybackFraction,
    isPlayingActive: () => isPlaying && !isPaused,
    onToggle: () => {
        nowPlayingViz.ensureContext();
        void togglePlayPause();
    },
    onExpand: expandMiniPlayer
});

const sharePanel = createSharePanel({
    loadState,
    getCurrentPodcast: () => currentPodcast,
    getCurrentEpisode: () => currentEpisode,
    getCurrentLineIndex: () => currentLineIndex,
    getDialogueLines: () => dialogueLines
});

// ===== SPEED CONTROL =====

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

// ===== VIEW SWITCHING =====
// Single entry point for screen changes. Wraps the swap in a View Transition
// (graceful fallback + reduced-motion no-op handled by transitionViews) and
// keeps the bottom mini player's visibility in sync with the active screen.
const VIEW_IDS = ['podcasts-view', 'list-view', 'player-view'];

// Newly-activated list views get a short-lived .entering class that drives
// the staggered card-entrance animation (first 8 items, --stagger steps).
// Removed on a timer so later re-renders (search keystrokes, sort) never
// re-trigger the entrance.
let enteringTimer = null;

function stampViewEntering(view) {
    if (!view) return;
    document.querySelectorAll('.view.entering').forEach((v) => v.classList.remove('entering'));
    view.classList.remove('entering');
    void view.offsetWidth; // restart the entrance if re-entering the view
    view.classList.add('entering');
    clearTimeout(enteringTimer);
    enteringTimer = setTimeout(() => view.classList.remove('entering'), 700);
}

// `morph` optionally names a shared-element pair { from, to } so the show
// artwork flies card → hero (View Transitions; instant under reduced
// motion or without support — see morphViews).
function showView(viewId, { transition = true, morph = null } = {}) {
    const apply = () => {
        VIEW_IDS.forEach((id) => {
            document.getElementById(id)?.classList.toggle('active', id === viewId);
        });
        if (viewId !== 'player-view') stampViewEntering(document.getElementById(viewId));
        updateMiniPlayerVisibility();
    };
    if (transition && morph) {
        morphViews(apply, morph);
    } else if (transition) {
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
    if (show) miniPlayer.update();
}

// Tap-to-expand: the capsule's artwork thumb morphs into the hero artwork
// via a shared-element View Transition (mini-player-art → np-art), so the
// expand lands exactly on the hero. Every DOM change happens inside the
// morph's apply callback so the swap stays atomic. Fallback (no View
// Transitions): the previous spring-feel rise; reduced motion: instant.
function expandMiniPlayer() {
    if (!playerPodcast || !currentEpisode) return;
    const apply = () => {
        if (currentPodcast?.id !== playerPodcast.id) {
            // The user browsed into a different show while listening — restore
            // the playing show's context (header, accent, per-show speed).
            openPodcast(playerPodcast, { transition: false });
        }
        showView('player-view', { transition: false });
    };
    const thumb = document.getElementById('mini-player-art');
    const morphed = morphViews(apply, {
        from: thumb && !thumb.hidden ? thumb : null,
        to: () => document.getElementById('np-art')
    });
    if (morphed) return;
    const playerView = document.getElementById('player-view');
    if (playerView && !prefersReducedMotion()) {
        playerView.classList.remove('spring-in');
        // Restart the animation if the class was already applied.
        void playerView.offsetWidth;
        playerView.classList.add('spring-in');
        playerView.addEventListener('animationend', () => {
            playerView.classList.remove('spring-in');
        }, { once: true });
    }
}

// (Background-audio keep-alive hack was removed; combined.mp3 is now played as
// a single continuous <audio> element so iOS/Android keep playing through
// lockscreen and tab backgrounding without any tone trickery.)

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
        queue: queuePanel.getQueue(),
        podcasts: getPodcasts(),
        currentPodcastId: currentPodcast?.id ?? null,
        currentEpisodeId: currentEpisode?.id ?? null
    });
}

// ===== NAVIGATION =====

// `sourceArt` (the tapped card's artwork element, when the user navigated
// from home) feeds the shared-element morph: card art → show-header art.
function openPodcast(podcast, { transition = true, sourceArt = null } = {}) {
    currentPodcast = podcast;
    // Each show remembers its own playback speed (falls back to the current
    // global rate for shows without a saved preference).
    applySpeechRate(getShowSpeed(podcast.id, speechRate), { persistShow: false, save: false });
    document.getElementById('current-podcast-title').textContent = podcast.title;
    document.getElementById('current-podcast-subtitle').textContent = podcast.subtitle;
    document.getElementById('nav-podcast-name').textContent = podcast.title;

    // Artwork-led show header: the generated cover anchors the wash.
    const headerArt = document.getElementById('podcast-header-art');
    if (headerArt) {
        const headerArtUrl = generatePodcastArtwork(podcast);
        if (headerArtUrl) {
            headerArt.src = headerArtUrl;
            headerArt.hidden = false;
        } else {
            headerArt.hidden = true;
        }
    }

    // Enter the show's adaptive palette: --show-* on <body> (wash, accent,
    // chips, glow — DESIGN.md §3) plus the legacy --accent/--accent-text
    // bridge on <html>. Contrast clamping happens inside the engine.
    applyShowPalette(podcast);

    library.renderEpisodeList();
    showView('list-view', {
        transition,
        morph: sourceArt ? { from: sourceArt, to: headerArt && !headerArt.hidden ? headerArt : null } : null
    });
}

document.getElementById('back-to-podcasts').addEventListener('click', () => {
    saveState();
    const leavingShowId = currentPodcast?.id;
    if (!currentEpisode) {
        // Nothing loaded — fully reset context. When an episode is loaded we
        // keep playback (and the mini player) alive across navigation, like
        // any polished podcast app.
        void stopPlayback();
        currentPodcast = null;
        // Back to the resting ember palette (stylesheet defaults).
        clearShowPalette();
    }
    library.renderPodcastsList();
    // Reverse morph: the show-header art flies back onto its home card.
    const headerArt = document.getElementById('podcast-header-art');
    showView('podcasts-view', {
        morph: {
            from: headerArt && !headerArt.hidden ? headerArt : null,
            to: () => {
                if (!leavingShowId) return null;
                for (const card of document.querySelectorAll('.podcast-card')) {
                    if (card.dataset.podcastId === leavingShowId) {
                        return card.querySelector('.podcast-icon');
                    }
                }
                return null;
            }
        }
    });
});

// ===== APP STATE PERSISTENCE =====

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
            stats.noteEpisodeCompleted();
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

// ===== PLAYER =====

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
    const lastLine = Math.max(0, dialogueLines.length - 1);
    // A finished episode restarts from the top: resuming at the final line
    // just replays the completion modal, which reads as "the episode won't
    // play" — and the old failure-cascade bug left episodes saved exactly
    // there with no resume banner to escape from.
    const effectiveSavedLine = savedLine >= lastLine ? 0 : savedLine;
    let initialLine = effectiveSavedLine;

    let resumedFrom = null;
    if (Number.isInteger(preferredLine)) {
        initialLine = preferredLine;
    } else if (promptResume && effectiveSavedLine > 0) {
        // Auto-resume from the saved line; the banner just notifies the user
        // and offers a one-tap "Start from beginning" escape hatch.
        initialLine = effectiveSavedLine;
        resumedFrom = effectiveSavedLine;
    }

    currentLineIndex = Math.max(0, Math.min(initialLine, Math.max(0, dialogueLines.length - 1)));
    showResumeBanner(resumedFrom, progress?.percent || 0);

    document.getElementById('player-episode-title').textContent = episode.title;

    // Hero type stack: show + episode number under the title; the breadcrumb
    // stays in the DOM (visually hidden) as the screen-reader location line.
    const podcastName = currentPodcast ? currentPodcast.title : 'Podcast';
    const showLine = document.getElementById('np-show-name');
    if (showLine) showLine.textContent = `${podcastName} · Episode ${episode.id}`;
    document.getElementById('player-breadcrumb').textContent = `Home › ${podcastName} › Episode ${episode.id}`;

    // Hero artwork (same generated cover the mini player / Media Session use).
    const heroArt = document.getElementById('np-art');
    if (heroArt) {
        const artUrl = currentPodcast ? generatePodcastArtwork(currentPodcast) : null;
        if (artUrl) {
            heroArt.src = artUrl;
            heroArt.hidden = false;
        } else {
            heroArt.removeAttribute('src');
            heroArt.hidden = true;
        }
    }

    transcriptPanel.render();
    chaptersPanel.render();
    chaptersPanel.renderMarkers();
    bookmarksPanel.render();
    updateProgress();
    lastPrebufferedEpKey = null;
    hideUpNextBanner();
    setStatus('Ready - Tap play to start');
    syncMediaSession({ includeMetadata: true, includePosition: true });
    miniPlayer.update();

    // Shared-element morph: the show-header art flies into the hero slab
    // (only when arriving from the episode list — queue jumps and deep
    // links keep the plain cross-fade).
    const listActive = document.getElementById('list-view')?.classList.contains('active');
    const listArt = document.getElementById('podcast-header-art');
    showView('player-view', {
        morph: listActive && listArt && !listArt.hidden
            ? { from: listArt, to: () => document.getElementById('np-art') }
            : null
    });
}

document.getElementById('back-to-list').addEventListener('click', () => {
    hideResumeBanner();
    saveState();
    library.renderEpisodeList();
    // Reverse morph: hero artwork settles back into the show header.
    const heroArt = document.getElementById('np-art');
    showView('list-view', {
        morph: {
            from: heroArt && !heroArt.hidden ? heroArt : null,
            to: () => {
                const headerArt = document.getElementById('podcast-header-art');
                return headerArt && !headerArt.hidden ? headerArt : null;
            }
        }
    });
});

// Home button from player - go all the way back to podcasts list
document.getElementById('home-from-player').addEventListener('click', () => {
    saveState();
    library.renderPodcastsList();
    showView('podcasts-view');
});

function parseChapters(content) {
    return parseChaptersFromContent(content, SPEAKER_LINE_RE);
}

function getEpisodeKey() {
    return currentPodcast && currentEpisode ? `${currentPodcast.id}-${currentEpisode.id}` : null;
}

// ===== PROGRESS =====

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
    transcriptPanel.setCurrentLine(currentLineIndex);

    // Scroll into view (only while the transcript is in follow mode).
    transcriptPanel.scrollCurrentIntoView();

    // Periodic save
    if (currentLineIndex % 10 === 0) {
        saveState();
    }

    // Update chapter indicator
    chaptersPanel.updateCurrent();
    updateMediaSessionPositionState();
}

// ===== PLAYBACK =====
function setStatus(text, speaking = false) {
    document.getElementById('status-text').textContent = text;
    document.getElementById('status-dot').classList.toggle('speaking', speaking);
}

function speak(text, speaker, options) {
    return speechPlayers.speak(text, speaker, options);
}

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
    miniPlayer.update();
    if (lineIndex - lastPersistedLine >= 5 || lineIndex === 0) {
        saveState();
        lastPersistedLine = lineIndex;
    }
});

speechPlayers.on('timeupdate', () => {
    if (sleep.checkExpiry()) return;
    sleep.applyFade();
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
    miniPlayer.updateProgress();
    updateMediaSessionPositionState();
    updateUpNextBanner();
    maybePrebufferNextEpisode();
});

speechPlayers.on('play', () => {
    isPlaying = true;
    isPaused = false;
    setPlayButtonState(true);
    miniPlayer.update();
    mediaSession.updatePlaybackState();
    nowPlayingViz.resumeIfNeeded();
    if (!document.hidden) nowPlayingViz.start();
    void requestWakeLock();
});

speechPlayers.on('pause', () => {
    nowPlayingViz.stop();
    if (!isPlaying) return;
    isPaused = true;
    setPlayButtonState(false);
    miniPlayer.update();
    mediaSession.updatePlaybackState();
    saveState();
    void releaseWakeLock();
});

speechPlayers.on('ended', () => {
    nowPlayingViz.stop();
    isPlaying = false;
    isPaused = false;
    currentLineIndex = Math.max(0, dialogueLines.length - 1);
    const sleepStop = sleep.isEpisodeEndStop();
    saveState();
    miniPlayer.update();
    hideUpNextBanner();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    void releaseWakeLock();
    // An end-of-episode sleep timer suppresses auto-advance and ends here.
    showCompleteModal({ allowAutoAdvance: !sleepStop });
    if (sleepStop) sleep.consumeEpisodeEndStop();
});

// Continuous mode is enabled from manifest durations alone — a missing or
// unsupported combined.mp3 only reveals itself when the element errors. The
// per-line clips are still there, so downgrade the episode to chunked
// playback instead of stranding it behind a retry that can never succeed.
// One-shot per episode: mid-stream network drops keep the retry toast.
let demotedEpisodeKey = null;
function demoteToChunked() {
    if (!currentEpisode) return false;
    const key = getEpisodeKey();
    if (demotedEpisodeKey === key) return false;
    if (!dialogueLines.some((l) => l.audioUrl)) return false;
    demotedEpisodeKey = key;
    const line = currentLineIndex;
    speechPlayers.setEpisode({});
    currentLineIndex = line;
    console.warn('combined.mp3 unavailable — demoting episode to per-chunk playback');
    return true;
}

speechPlayers.on('error', (err) => {
    console.warn('Audio element error:', err);
    if (!currentEpisode || !speechPlayers.isContinuousReady()) return;
    // Source never became playable (load-time 404/decode failure, not a
    // mid-stream drop): fall back to the per-line clips.
    if (!(speechPlayers.getCurrentTime() > 0) && demoteToChunked()) {
        if (isPlaying && !isPaused) { isPlaying = false; void startPlayback(); }
        return;
    }
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
    // play() rejecting before any audio ever rendered usually means the
    // combined.mp3 doesn't exist — switch to the per-line clips and go.
    if (!(speechPlayers.getCurrentTime() > 0) && demoteToChunked()) {
        void startPlayback();
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
    miniPlayer.update();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    await requestWakeLock();

    let consecutiveAudioFailures = 0;
    while (currentLineIndex < dialogueLines.length && isPlaying) {
        if (!playbackSessions.isActive(sessionId)) break;
        if (sleep.checkExpiry()) break;
        if (isPaused) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }
        const line = dialogueLines[currentLineIndex];
        updateProgress();
        setStatus(`${line.speaker || 'Narration'}: Speaking...`, true);
        try {
            await speak(line.text, line.type, line.audioUrl ? { audioUrl: line.audioUrl } : undefined);
            consecutiveAudioFailures = 0;
        } catch (e) {
            console.error('Speech error:', e);
            const failedLine = currentLineIndex;
            consecutiveAudioFailures++;
            if (consecutiveAudioFailures >= 3) {
                // Nothing is loading (offline, missing audio deploy, bad
                // episode) — stop at the start of the failing run instead of
                // silently "playing" the rest of the episode and marking it
                // complete with no sound.
                currentLineIndex = Math.max(0, failedLine - (consecutiveAudioFailures - 1));
                isPlaying = false;
                toasts.show("Episode audio isn't loading — check your connection and try again", {
                    actionLabel: 'Retry',
                    onAction: () => { void jumpToLine(currentLineIndex, true); }
                });
                break;
            }
            // Identical messages coalesce into one toast, so a run of failing
            // lines doesn't stack notifications.
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
        const sleepStop = sleep.isEpisodeEndStop();
        await releaseWakeLock();
        saveState();
        miniPlayer.update();
        syncMediaSession({ includeMetadata: true, includePosition: true });
        showCompleteModal({ allowAutoAdvance: !sleepStop });
        if (sleepStop) sleep.consumeEpisodeEndStop();
    } else {
        isPlaying = false;
        isPaused = false;
        await releaseWakeLock();
        setPlayButtonState(false);
        setStatus('Ready');
        miniPlayer.update();
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
    sleep.restoreVolume();
    await releaseWakeLock();
    setPlayButtonState(false);
    saveState();
    miniPlayer.update();
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
    miniPlayer.update();
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
        transcriptPanel.resync();
        miniPlayer.update();
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
    transcriptPanel.resync();
    saveState();
    setPlayButtonState(false);
    setStatus('Ready');
    miniPlayer.update();
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

// ===== TRANSPORT CONTROLS =====
// All four skip buttons honor user-configurable intervals from the settings
// panel; holding a skip button repeats the skip until released.
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
        // A long-press that ended off-button never got the trailing click
        // that consumes this flag; clear it so this press isn't swallowed.
        suppressClick = false;
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

bindSkipButton('prev-btn', () => -settings.skipLargeBackward());
bindSkipButton('next-btn', () => settings.skipLargeForward());
bindSkipButton('back-btn', () => -settings.skipBackward());
bindSkipButton('fwd-btn', () => settings.skipForward());

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

// Speed Presets
document.querySelectorAll('.speed-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        applySpeechRate(parseFloat(btn.dataset.speed));
    });
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
    if (next.queueIndex >= 0) queuePanel.removeAt(next.queueIndex);
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
    if (autoPlayNext && !sleep.isEpisodeEndStop() && isPlaying && !isPaused && speechPlayers.isContinuousReady()) {
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

// ===== PLAYER OPTIONS SHEET =====
// The settings accordion, status readout, stats, and home shortcut are
// demoted off the primary player screen into a bottom sheet behind ⋯.
// Focus trap / Escape handling comes from initModalA11y (.modal-overlay).
const moreSheet = document.getElementById('player-more-sheet');
const moreBtn = document.getElementById('player-more-btn');

function setMoreSheetOpen(open) {
    if (!moreSheet) return;
    moreSheet.classList.toggle('show', open);
    moreBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

moreBtn?.addEventListener('click', () => {
    setMoreSheetOpen(!moreSheet?.classList.contains('show'));
});
document.getElementById('close-player-more')?.addEventListener('click', () => setMoreSheetOpen(false));
// Tapping the scrim dismisses the sheet.
moreSheet?.addEventListener('click', (e) => {
    if (e.target === moreSheet) setMoreSheetOpen(false);
});
// Actions that open another surface (stats modal) or navigate away close
// the sheet first so it isn't left hanging underneath.
document.getElementById('stats-btn')?.addEventListener('click', () => setMoreSheetOpen(false));
document.getElementById('home-from-player')?.addEventListener('click', () => setMoreSheetOpen(false));

// Secondary-row shortcuts: reveal the queue / bookmarks section below the
// fold (activates the tab, then brings the panel into view).
function revealNavTab(tabName) {
    document.querySelector(`.nav-tab[data-tab="${tabName}"]`)?.click();
    document.querySelector('.nav-panel')?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
    });
}
document.getElementById('np-queue-btn')?.addEventListener('click', () => revealNavTab('queue'));
document.getElementById('np-bookmark-btn')?.addEventListener('click', () => revealNavTab('bookmarks'));

// ===== SWIPE GESTURES =====
initSwipeGestures({
    onSwipeBack: () => seekBySeconds(-settings.skipLargeBackward()),
    onSwipeForward: () => seekBySeconds(settings.skipLargeForward())
});

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

// ===== INIT =====
podcastsLoader.load();

transcriptPanel.bind();
sleep.bind();
settings.bind();
settings.initControls();
stats.bind();
bookmarksPanel.bind();
sharePanel.bind();
miniPlayer.bind();
library.bind();
initModalA11y();

initKeyboardShortcuts({
    hasEpisode: () => Boolean(currentEpisode),
    togglePlayPause,
    seekBySeconds,
    getSkipBackward: () => settings.skipBackward(),
    getSkipForward: () => settings.skipForward(),
    getSpeechRate: () => speechRate,
    applySpeechRate,
    ensureVizContext: () => nowPlayingViz.ensureContext(),
    playNextEpisode,
    playPreviousEpisode
});

restoreState();
updateToggleButton('auto-play-toggle', autoPlayNext, 'Auto');
updateSpeedPresetButtons();
queuePanel.update();
library.renderPodcastsList();
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
        .then(() => downloads.reconcile())
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
