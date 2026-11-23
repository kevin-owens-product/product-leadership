// App controller: bootstrapping, state, screen routing, and playback
// orchestration. Feature UIs live in cohesive modules under src/ — this file
// owns the cross-cutting mutable state (current podcast/episode, playback
// flags) and wires the modules together.

import {
    STORAGE_KEY,
    getResumePosition,
    loadAppState,
    saveAppState
} from './state/storage.js?v=2.7.4%2B20261123T141526Z';
import { bindNavTabs } from './ui/tabs.js?v=2.7.4%2B20261123T141526Z';
import { registerServiceWorker } from './sw/register-sw.js?v=2.7.4%2B20261123T141526Z';
import { createPlaybackSessionController } from './playback/controller.js?v=2.7.4%2B20261123T141526Z';
import { createSpeechPlayers } from './playback/audio.js?v=2.7.4%2B20261123T141526Z';
import { parseChaptersFromContent, extractEpisodeDurationMinutes } from './playback/chapters.js?v=2.7.4%2B20261123T141526Z';
import { createScrubber, bufferedEndFraction } from './ui/scrubber.js?v=2.7.4%2B20261123T141526Z';
import { createRepeatSkipper } from './ui/long-press.js?v=2.7.4%2B20261123T141526Z';
import { getShowSpeed, setShowSpeed, clampSpeed, SPEED_PREFS_KEY } from './state/speed-prefs.js?v=2.7.4%2B20261123T141526Z';
import { transitionViews, morphViews, spawnRipple, showSkipFlyout, prefersReducedMotion } from './ui/motion.js?v=2.7.4%2B20261123T141526Z';
import { createNowPlayingVisualizer } from './playback/visualizer.js?v=2.7.4%2B20261123T141526Z';
import { createToastManager } from './ui/toast.js?v=2.7.4%2B20261123T141526Z';
import {
    VERSION_STORAGE_KEY,
    checkForUpdates
} from './app/version.js?v=2.7.4%2B20261123T141526Z';
import { createPodcastsLoader, getPodcasts } from './app/podcasts-loader.js?v=2.7.4%2B20261123T141526Z';
import { createWakeLockManager } from './app/wake-lock.js?v=2.7.4%2B20261123T141526Z';
import {
    SPEAKER_LINE_RE,
    parseSpeakerVoiceMap,
    parseMarkdown,
    alignChapterLineIndexes
} from './parse/dialogue.js?v=2.7.4%2B20261123T141526Z';
import {
    withCacheKey,
    epKeyOf,
    loadSupertonicAudioManifest,
    attachAudioUrls,
    buildLineOffsets
} from './playback/manifest.js?v=2.7.4%2B20261123T141526Z';
import { createDownloadsManager } from './downloads/downloads.js?v=2.7.4%2B20261123T141526Z';
import { ensureEpisodeContent } from './app/transcripts.js?v=2.7.4%2B20261123T141526Z';
import { createNewEpisodeTracker, NEW_EPISODES_KEY } from './state/new-episodes.js?v=2.7.4%2B20261123T141526Z';
import { createMediaSessionController } from './playback/media-session.js?v=2.7.4%2B20261123T141526Z';
import { createSleepController } from './playback/sleep-controller.js?v=2.7.4%2B20261123T141526Z';
import { findAdjacentEpisode, findNextUp } from './state/queue-next.js?v=2.7.4%2B20261123T141526Z';
import { formatClock } from './ui/format.js?v=2.7.4%2B20261123T141526Z';
import { generatePodcastArtwork, applyShowPalette, clearShowPalette } from './ui/artwork.js?v=2.7.4%2B20261123T141526Z';
import { activateCardWithKeyboard, updateToggleButton, setPlayButtonState, setPressedState } from './ui/dom.js?v=2.7.4%2B20261123T141526Z';
import { initModalA11y } from './ui/modal-a11y.js?v=2.7.4%2B20261123T141526Z';
import { createMiniPlayer } from './ui/mini-player.js?v=2.7.4%2B20261123T141526Z';
import { createSettingsPanel } from './ui/settings-panel.js?v=2.7.4%2B20261123T141526Z';
import { createStatsTracker } from './state/stats.js?v=2.7.4%2B20261123T141526Z';
import { createQueuePanel } from './ui/queue-panel.js?v=2.7.4%2B20261123T141526Z';
import { createBookmarksPanel } from './ui/bookmarks-panel.js?v=2.7.4%2B20261123T141526Z';
import { createChaptersPanel } from './ui/chapters-panel.js?v=2.7.4%2B20261123T141526Z';
import { createTranscriptPanel } from './ui/transcript-panel.js?v=2.7.4%2B20261123T141526Z';
import { createLibrary } from './ui/library.js?v=2.7.4%2B20261123T141526Z';
import { createSharePanel } from './ui/share-panel.js?v=2.7.4%2B20261123T141526Z';
import { initKeyboardShortcuts } from './ui/shortcuts.js?v=2.7.4%2B20261123T141526Z';
import { initSwipeGestures } from './ui/swipe.js?v=2.7.4%2B20261123T141526Z';
import { initBackNav, backTarget, performBack } from './app/back-nav.js?v=2.7.4%2B20261123T141526Z';
import { classifyContinuousAudioFailure } from './playback/audio-errors.js?v=2.7.4%2B20261123T141526Z';

// Queue-able notifications with retry actions — the user-visible surface for
// audio load failures, offline-download failures, and app updates.
const toasts = createToastManager({ container: document.getElementById('toast-region') });

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
    VERSION_STORAGE_KEY,
    STORAGE_KEY,
    'playQueue',
    'listeningStats',
    'downloadedEpisodes',
    'downloadSelections',
    NEW_EPISODES_KEY,
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
// Check for a fresh app shell while preserving offline episodes.
void checkForUpdates();

// ===== STATE =====
let currentPodcast = null;
let currentEpisode = null;
let dialogueLines = [];
let currentLineIndex = 0;
let episodeFinished = false;
let currentAudioManifestBase = '';
let isPlaying = false;
let isPaused = false;
let speechRate = 1.0;
let autoPlayNext = true;
let chapters = [];
let lineOffsets = [];
let episodeAudioDuration = 0;
let lastKnownPosition = 0;
let lastSavedPosition = 0;
let progressChangedAt = null;
let prebufferedNextAudio = null;
let prebufferingNextEpKey = null;
let lastPrebufferAttemptKey = null;
let lastPrebufferAttemptAt = 0;
let episodeAudioLoadFailed = false;
let retryStartLine = null;
let episodeOpenRequest = 0;
let audioSourceGeneration = 0;
let continuousPlayIntentGeneration = null;

// The podcast that owns the loaded episode. `currentPodcast` follows the
// user's browsing context (it changes when they open another show from home
// while audio keeps playing); `playerPodcast` always matches `currentEpisode`
// so the mini player and expand-to-player flow stay correct.
let playerPodcast = null;

const playbackSessions = createPlaybackSessionController();

const stats = createStatsTracker();
const speechPlayers = createSpeechPlayers({
    onCreateAudio: stats.trackAudio,
    getSpeechRate: () => speechRate,
    getMediaTitle: () => currentEpisode && playerPodcast
        ? `${currentEpisode.title} — ${playerPodcast.title}` : ''
});

// Ambient play-state bars on the player screen. They are intentionally CSS
// only: routing the podcast element through Web Audio lets mobile browsers
// silence it when that context is suspended in the background.
const nowPlayingViz = createNowPlayingVisualizer({
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

const newEpisodes = createNewEpisodeTracker();

const downloads = createDownloadsManager({
    toasts,
    setStatus,
    getPodcasts,
    isCatalogLoaded: () => podcastsLoader.isLoaded(),
    loadManifest: loadSupertonicAudioManifest,
    onChange: () => library.refreshEpisodeList()
});

const library = createLibrary({
    getPodcasts,
    isLoaded: () => podcastsLoader.isLoaded(),
    loadState,
    getCurrentPodcast: () => currentPodcast,
    getPlaybackContext: () => ({
        podcastId: playerPodcast?.id ?? null,
        episodeId: currentEpisode?.id ?? null
    }),
    persistSeasonSelection: (podcastId, seasonNumber) => {
        const state = loadState();
        saveAppState({
            ...state,
            seasonSelections: {
                ...(state.seasonSelections || {}),
                [podcastId]: seasonNumber
            }
        });
    },
    downloads,
    newEpisodes,
    toasts,
    isQueued: (podcast, episode) => queuePanel.contains(podcast, episode),
    onAddToQueue: async (podcast, episode) => {
        await queuePanel.add(podcast, episode);
        toasts.show(`Added "${episode.title}" to the queue`);
    },
    onOpenPodcast: (podcast, sourceArt) => openPodcast(podcast, { sourceArt }),
    onOpenEpisode: (episode) => { void openEpisode(episode); },
    onResumeEpisode: resumeEpisode
});

const podcastsLoader = createPodcastsLoader({
    toasts,
    onLoaded: () => {
        newEpisodes.syncCatalog(getPodcasts());
        library.renderPodcastsList();
        queuePanel.update();
        reconcileDownloads();
        // First paint of the library: give the home list its staggered
        // entrance (later showView calls stamp this themselves).
        stampViewEntering(document.getElementById('podcasts-view'));
    }
});

const queuePanel = createQueuePanel({
    getPodcasts,
    isCurrentItem: (item) => playerPodcast?.id === item.podcastId && currentEpisode?.id === item.episodeNum,
    onOpenItem: (podcast, episode) => { void playUpcomingEpisode(podcast, episode, { resume: true }); },
    onExternalChange: () => library.refreshEpisodeList()
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
    stopPlayback
});

const mediaSession = createMediaSessionController({
    speechPlayers,
    getState: () => ({
        isPlaying,
        isPaused,
        currentPodcast: playerPodcast || currentPodcast,
        currentEpisode,
        dialogueLines,
        currentLineIndex,
        speechRate,
        episodeAudioDuration
    }),
    estimateEpisodeDurationSeconds,
    getSkipForward: () => settings.skipForward(),
    getSkipBackward: () => settings.skipBackward(),
    actions: {
        seekBySeconds,
        togglePlayPause,
        stopPlayback,
        jumpToLine,
        seekToSeconds,
        playNextEpisode,
        playPreviousEpisode
    }
});

function syncMediaSession(options) {
    mediaSession.sync(options);
}

// Publish once the native element actually has audio to play. A Bluetooth
// receiver can request track details as Android grants the session audio focus.
speechPlayers.on('playing', () => {
    if (playerPodcast && currentEpisode && queuePanel.contains(playerPodcast, currentEpisode)) {
        void queuePanel.removeItem({ podcastId: playerPodcast.id, episodeNum: currentEpisode.id });
    }
    syncMediaSession({ includeMetadata: true, includePosition: true });
});

function updateMediaSessionPositionState() {
    mediaSession.updatePositionState();
}

const settings = createSettingsPanel({
    setStatus,
    stopPlayback: async () => {
        await stopPlayback();
        await stats.stopTracking();
    },
    localStorageKeysToClear: LOCAL_STORAGE_KEYS_TO_CLEAR
});

const miniPlayer = createMiniPlayer({
    getPlayerPodcast: () => playerPodcast,
    getCurrentPodcast: () => currentPodcast,
    getCurrentEpisode: () => currentEpisode,
    getPlaybackFraction,
    isPlayingActive: () => isPlaying && !isPaused,
    onToggle: () => {
        void togglePlayPause();
    },
    onExpand: expandMiniPlayer
});

const sharePanel = createSharePanel({
    loadState,
    getCurrentPodcast: () => playerPodcast || currentPodcast,
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
    const speedOwner = playerPodcast || currentPodcast;
    if (persistShow && speedOwner) setShowSpeed(speedOwner.id, speechRate);
    if (save) saveState({ speechRate });
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

// Android's back gesture is browser-history navigation, so without an entry of
// our own it unloads the app instead of stepping back a screen. backNav owns a
// single sentinel entry; every depth change has to re-reconcile it.
const backNav = initBackNav({
    canGoBack: () => backTarget(document) !== null,
    goBack: () => performBack(document)
});

// Overlays open and close from a dozen call sites, so observe the class that
// actually decides whether one is up rather than trying to hook each of them.
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    new MutationObserver(() => {
        // Escape and the system Back gesture can dismiss an overlay directly.
        if (overlay.id === 'complete-modal' && !overlay.classList.contains('show')) {
            cancelAutoAdvanceTimer();
        }
        backNav.sync();
    })
        .observe(overlay, { attributes: true, attributeFilter: ['class'] });
});

// `morph` optionally names a shared-element pair { from, to } so the show
// artwork flies card → hero (View Transitions; instant under reduced
// motion or without support — see morphViews).
function showView(viewId, { transition = true, morph = null } = {}) {
    // A listener who navigates away owns the next screen, even if an episode's
    // transcript or audio manifest is still loading.
    if (viewId !== 'player-view') episodeOpenRequest++;
    const apply = () => {
        VIEW_IDS.forEach((id) => {
            document.getElementById(id)?.classList.toggle('active', id === viewId);
        });
        if (viewId !== 'player-view') stampViewEntering(document.getElementById(viewId));
        updateMiniPlayerVisibility();
        backNav.sync();
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
    episodeOpenRequest++;
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

function hideResumeBanner() {
    const banner = document.getElementById('resume-banner');
    if (banner) banner.hidden = true;
}

function showResumeBanner(resumed, percent) {
    const banner = document.getElementById('resume-banner');
    if (!banner) return;
    if (!resumed) {
        banner.hidden = true;
        return;
    }
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
        if (speechPlayers.isContinuousReady()) {
            seekToSeconds(0);
            transcriptPanel.resync();
        } else {
            void jumpToLine(0, false);
        }
    } else if (event.target.closest('#resume-banner-close')) {
        hideResumeBanner();
    }
});

// === Next-episode pre-buffer ===

function maybePrebufferNextEpisode() {
    if (!playerPodcast || !currentEpisode) return;
    if (!speechPlayers.isContinuousReady()) return;
    const next = getNextUp();
    if (!next) return;
    const nextKey = epKeyOf(next.podcast, next.episode);
    if (prebufferedNextAudio?.key === nextKey || prebufferingNextEpKey === nextKey) return;
    const now = Date.now();
    // A temporary manifest failure should be retried, but never on every
    // timeupdate tick. Starting early leaves several retry windows before the
    // current episode ends and Android can suspend asynchronous page work.
    if (lastPrebufferAttemptKey === nextKey && now - lastPrebufferAttemptAt < 15_000) return;
    lastPrebufferAttemptKey = nextKey;
    lastPrebufferAttemptAt = now;
    prebufferingNextEpKey = nextKey;
    const sourceKey = getEpisodeKey();
    const episodeFile = next.episode.file || next.episode.filename || null;
    // Prepare the tiny, no-store manifest as soon as playback starts. The
    // source itself remains untouched: fetching the full next MP3 would waste
    // bandwidth and compete with the current episode on mobile connections.
    void loadSupertonicAudioManifest(next.podcast.id, episodeFile).then((audioManifest) => {
        if (!audioManifest || getEpisodeKey() !== sourceKey) return;
        const stillNext = getNextUp();
        if (!stillNext || epKeyOf(stillNext.podcast, stillNext.episode) !== nextKey) return;
        prebufferedNextAudio = { key: nextKey, audioManifest };
    }).finally(() => {
        if (prebufferingNextEpKey === nextKey) prebufferingNextEpKey = null;
    });
}

// What plays after the current episode: queue first, then the next
// sequential episode in the current show.
function getNextUp() {
    return findNextUp({
        queue: queuePanel.getQueue(),
        podcasts: getPodcasts(),
        currentPodcastId: playerPodcast?.id ?? null,
        currentEpisodeId: currentEpisode?.id ?? null
    });
}

// ===== NAVIGATION =====

// `sourceArt` (the tapped card's artwork element, when the user navigated
// from home) feeds the shared-element morph: card art → show-header art.
function openPodcast(podcast, { transition = true, sourceArt = null } = {}) {
    currentPodcast = podcast;
    // Each show remembers its own playback speed (falls back to the current
    // global rate for shows without a saved preference). Browsing another show
    // must not change the rate of the episode that is still playing.
    if (!currentEpisode || playerPodcast?.id === podcast.id) {
        applySpeechRate(getShowSpeed(podcast.id, speechRate), { persistShow: false, save: false });
    }
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

function continuousPosition() {
    // A failed resource can reset the native clock before recovery runs.
    return speechPlayers.audio.error ? lastKnownPosition : speechPlayers.getCurrentTime();
}

function markProgressChanged() {
    progressChangedAt = Date.now();
}

function saveState(preferences) {
    if (settings.isResettingLocalData() || (!preferences && progressChangedAt === null)) return;
    const state = { ...loadState(), ...preferences };
    const activityTime = progressChangedAt;
    progressChangedAt = null;

    // A lifecycle event can run long after the listener stopped using this
    // tab. Only playback or an explicit seek updates the episode checkpoint.
    if (activityTime !== null && playerPodcast && currentEpisode && dialogueLines.length && !episodeAudioLoadFailed) {
        const epKey = `${playerPodcast.id}-${currentEpisode.id}`;
        if (activityTime >= (state.episodeProgress[epKey]?.timestamp || 0)) {
            const position = speechPlayers.isContinuousReady() ? continuousPosition() : null;
            const fraction = position === null
                ? currentLineIndex / dialogueLines.length : position / speechPlayers.getDuration();
            const percent = fraction > 0 ? Math.max(1, Math.min(99, Math.round(fraction * 100))) : 0;
            state.episodeProgress[epKey] = {
                line: currentLineIndex,
                ...(position === null ? {} : { positionSeconds: position }),
                finished: episodeFinished,
                percent: episodeFinished ? 100 : percent,
                timestamp: activityTime
            };
            state.currentPodcastId = playerPodcast.id;
            state.currentEpisodeId = currentEpisode.id;
            state.currentLineIndex = currentLineIndex;
            if (position !== null) lastSavedPosition = position;
            if (episodeFinished && !state.completedEpisodes.includes(epKey)) {
                state.completedEpisodes.push(epKey);
                stats.noteEpisodeCompleted();
            }
            saveAppState(state);
            return;
        }
    }
    if (preferences) saveAppState(state);
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

function resumeEpisode(podcast, episode) {
    if (currentPodcast?.id !== podcast.id) openPodcast(podcast, { transition: false });
    if (playerPodcast?.id === podcast.id && currentEpisode?.id === episode.id && !episodeAudioLoadFailed) {
        // A shelf tap supersedes a pending switch and keeps an active track
        // running, including its current position inside a fallback clip.
        episodeOpenRequest++;
        showView('player-view', { transition: false });
        if (!isPlaying || isPaused) void togglePlayPause();
        return;
    }
    void openEpisode(episode, { podcast, playOnOpen: true });
}

async function openEpisode(episode, options = {}) {
    const {
        promptResume = true,
        preferredLine = null,
        podcast: requestedPodcast = currentPodcast,
        prefetchedAudioManifest = null
    } = options;
    if (!requestedPodcast) return false;
    const requestId = ++episodeOpenRequest;
    await stopPlayback({ preserveOpenRequest: true });
    if (requestId !== episodeOpenRequest) return false;
    const podcastId = requestedPodcast.id;
    const episodeFile = episode.file || episode.filename || null;
    // The script and the audio manifest load in parallel; the catalog only
    // carries metadata, so the transcript arrives here on first open.
    const [content, audioManifest] = await Promise.all([
        ensureEpisodeContent(podcastId, episode),
        prefetchedAudioManifest || loadSupertonicAudioManifest(podcastId, episodeFile)
    ]);
    if (requestId !== episodeOpenRequest) return false;
    if (typeof content !== 'string') {
        toasts.show(`Couldn’t load "${episode.title}". Check your connection.`, {
            actionLabel: 'Retry',
            onAction: () => {
                if (currentPodcast?.id !== podcastId) openPodcast(requestedPodcast, { transition: false });
                void openEpisode(episode, { ...options, podcast: requestedPodcast });
            }
        });
        return false;
    }
    // Publish the new identity only after both requests settle. Navigation
    // and pagehide can still save the previous episode while either is pending.
    currentEpisode = episode;
    playerPodcast = requestedPodcast;
    episodeFinished = false;
    newEpisodes.markOpened(requestedPodcast, episode);
    library.selectSeasonForEpisode(requestedPodcast, episode);
    applySpeechRate(getShowSpeed(requestedPodcast.id, speechRate), { persistShow: false, save: false });
    const speakerVoiceMap = parseSpeakerVoiceMap(content);
    dialogueLines = parseMarkdown(content, speakerVoiceMap);
    chapters = parseChapters(content);
    alignChapterLineIndexes(chapters, dialogueLines);

    lineOffsets = [];
    episodeAudioDuration = 0;
    lastKnownPosition = 0;
    lastSavedPosition = 0;
    progressChangedAt = null;
    episodeAudioLoadFailed = false;
    if (audioManifest) {
        const matched = attachAudioUrls(dialogueLines, audioManifest);
        currentAudioManifestBase = audioManifest.base;
        if (matched > 0) {
            console.log(`Loaded ${matched}/${dialogueLines.length} Supertonic audio lines from ${audioManifest.base}`);
        } else {
            console.warn(`Supertonic audio manifest found at ${audioManifest.base} but no lines matched`);
            episodeAudioLoadFailed = true;
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
        episodeAudioLoadFailed = true;
        console.warn(`No Supertonic audio manifest found for ${podcastId || 'unknown podcast'} / ${episodeFile || 'unknown episode'}`);
    }

    // Restore progress (with podcast-scoped key)
    const state = loadState();
    const epKey = `${requestedPodcast.id}-${episode.id}`;
    const progress = state.episodeProgress?.[epKey];
    const resume = getResumePosition(progress, dialogueLines.length, preferredLine);
    retryStartLine = episodeAudioLoadFailed ? preferredLine : null;
    currentLineIndex = resume.line;
    if (speechPlayers.isContinuousReady()) {
        speechPlayers.seek(resume.seconds ?? (currentLineIndex > 0 ? lineOffsets[currentLineIndex] : 0));
    }
    episodeFinished = resume.finished;
    // Record the explicit selection once, so simply closing this view later
    // cannot change the last episode chosen in a different tab.
    saveAppState({ ...state, currentPodcastId: podcastId, currentEpisodeId: episode.id, currentLineIndex });
    const resumed = !Number.isInteger(preferredLine) && (currentLineIndex > 0 || lastKnownPosition > 0);
    showResumeBanner(promptResume && resumed, progress?.percent || 0);

    document.getElementById('player-episode-title').textContent = episode.title;

    // Hero type stack: show + episode number under the title; the breadcrumb
    // stays in the DOM (visually hidden) as the screen-reader location line.
    const podcastName = requestedPodcast.title;
    const showLine = document.getElementById('np-show-name');
    if (showLine) showLine.textContent = `${podcastName} · Episode ${episode.id}`;
    document.getElementById('player-breadcrumb').textContent = `Home › ${podcastName} › Episode ${episode.id}`;

    // Hero artwork (same generated cover the mini player / Media Session use).
    const heroArt = document.getElementById('np-art');
    if (heroArt) {
        const artUrl = generatePodcastArtwork(requestedPodcast);
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
    queuePanel.update();
    updateProgress();
    prebufferedNextAudio = null;
    prebufferingNextEpKey = null;
    lastPrebufferAttemptKey = null;
    lastPrebufferAttemptAt = 0;
    hideUpNextBanner();
    setStatus(episodeAudioLoadFailed
        ? 'Episode audio metadata isn\'t loading — tap play to retry'
        : 'Ready - Tap play to start');
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
    if (options.playOnOpen) void startPlayback();
    return true;
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
    return playerPodcast && currentEpisode ? `${playerPodcast.id}-${currentEpisode.id}` : null;
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
    if (!speechPlayers.isContinuousReady() && currentLineIndex % 10 === 0) {
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
        // Background/lockscreen: stop decorative motion (audio keeps playing).
        nowPlayingViz.stop();
    } else {
        if (isPlaying && !isPaused) nowPlayingViz.start();
    }
});

// === Player <-> UI bridge (continuous combined.mp3 mode) ===

speechPlayers.on('seek', (lineIndex) => {
    currentLineIndex = lineIndex;
    lastKnownPosition = speechPlayers.getCurrentTime();
    episodeFinished = false;
});

speechPlayers.on('linechange', (lineIndex) => {
    if (!isPlaying || speechPlayers.audio.error) return;
    if (lineIndex === currentLineIndex) return;
    currentLineIndex = lineIndex;
    updateProgress();
    miniPlayer.update();
});

speechPlayers.on('timeupdate', () => {
    if (sleep.checkExpiry()) return;
    sleep.applyFade();
    // Cheap per-tick refresh of the clock + progress fill (~4 Hz from <audio>).
    if (speechPlayers.isContinuousReady()) {
        const dur = speechPlayers.getDuration() || episodeAudioDuration;
        const pos = speechPlayers.getCurrentTime();
        if (!speechPlayers.audio.error) {
            if (isPlaying && !isPaused && pos !== lastKnownPosition) markProgressChanged();
            lastKnownPosition = pos;
            if (isPlaying && !isPaused && Math.abs(pos - lastSavedPosition) >= 10) saveState();
        }
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
    if (!document.hidden) nowPlayingViz.start();
    // Fetch only the next episode's tiny manifest while this media session is
    // definitely active. Waiting for the final seconds is unreliable when a
    // locked Android PWA throttles timeupdate and fetch callbacks.
    maybePrebufferNextEpisode();
    void requestWakeLock();
});

speechPlayers.on('pause', () => {
    nowPlayingViz.stop();
    if (!isPlaying) return;
    if (!isPaused && continuousPosition() !== lastKnownPosition) markProgressChanged();
    isPaused = true;
    setPlayButtonState(false);
    miniPlayer.update();
    mediaSession.updatePlaybackState();
    saveState();
    void releaseWakeLock();
});

speechPlayers.on('ended', () => {
    if (!currentEpisode || !speechPlayers.isContinuousReady()) return;
    nowPlayingViz.stop();
    isPlaying = false;
    isPaused = false;
    currentLineIndex = Math.max(0, dialogueLines.length - 1);
    episodeFinished = true;
    markProgressChanged();
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

// A media failure can arrive twice (the element's `error` event and the
// rejected play() promise), and Chrome can report a transient range failure as
// code 4 "format error". Coordinate both signals through one bounded recovery
// state keyed to the currently loaded source. This prevents an old source's
// AbortError from demoting a newly opened episode and prevents the screenshot's
// immediate combined -> three failing line clips cascade.
const COMBINED_RETRY_DELAYS_MS = [200, 650];
let combinedRecoveryGeneration = -1;
let combinedRecoveryAttempts = 0;
let combinedRecoveryTimer = null;
let combinedRecoveryInFlight = false;
let combinedRecoveryAttemptFailure = null;
let combinedRecoveryShouldResume = false;
let combinedRecoveryPrefersFallback = false;
let combinedRecoveryFinalizing = false;

function snapshotAudioFailure(error) {
    return {
        code: Number(error?.code) || 0,
        name: String(error?.name || ''),
        message: String(error?.message || '')
    };
}

function resetCombinedRecovery(generation = audioSourceGeneration) {
    if (combinedRecoveryTimer !== null) {
        clearTimeout(combinedRecoveryTimer);
        combinedRecoveryTimer = null;
    }
    combinedRecoveryGeneration = generation;
    combinedRecoveryAttempts = 0;
    combinedRecoveryInFlight = false;
    combinedRecoveryAttemptFailure = null;
    combinedRecoveryShouldResume = false;
    combinedRecoveryPrefersFallback = false;
    combinedRecoveryFinalizing = false;
}

function invalidateContinuousSource() {
    continuousPlayIntentGeneration = null;
    audioSourceGeneration += 1;
    resetCombinedRecovery(audioSourceGeneration);
}

function pauseForUserAction(status, toastMessage, {
    actionLabel = 'Retry',
    onAction = retryAudioLoad
} = {}) {
    continuousPlayIntentGeneration = null;
    isPlaying = false;
    isPaused = false;
    try { speechPlayers.pause(); } catch { /* ignore */ }
    setPlayButtonState(false);
    setStatus(status);
    miniPlayer.update();
    mediaSession.updatePlaybackState();
    void releaseWakeLock();
    if (toastMessage) {
        toasts.show(toastMessage, {
            actionLabel,
            duration: 0,
            onAction: () => {
                onAction();
            }
        });
    }
}

async function probeChunkFallback(generation) {
    if (generation !== audioSourceGeneration) return false;
    const candidate = dialogueLines[currentLineIndex]?.audioUrl
        || dialogueLines.find((line) => line.audioUrl)?.audioUrl;
    if (!candidate) return false;
    try {
        const response = await fetch(candidate, {
            cache: 'no-store',
            headers: { Range: 'bytes=0-1023' }
        });
        if (!response.ok) return false;
        // Consume the probe so a successful response can warm the HTTP cache.
        await response.arrayBuffer();
        return generation === audioSourceGeneration;
    } catch {
        return false;
    }
}

function demoteToChunked(generation) {
    if (generation !== audioSourceGeneration || !speechPlayers.isContinuousReady()) return false;
    if (!dialogueLines.some((line) => line.audioUrl)) return false;
    const line = currentLineIndex;
    invalidateContinuousSource();
    speechPlayers.setEpisode({});
    currentLineIndex = line;
    console.warn('combined.mp3 unavailable after retries — using verified per-line audio');
    return true;
}

async function finalizeCombinedFailure(generation) {
    if (generation !== audioSourceGeneration || combinedRecoveryFinalizing) return;
    combinedRecoveryFinalizing = true;
    const shouldResume = combinedRecoveryShouldResume;
    const chunkReady = await probeChunkFallback(generation);
    if (generation !== audioSourceGeneration) return;
    combinedRecoveryFinalizing = false;
    if (chunkReady && demoteToChunked(generation)) {
        isPlaying = false;
        isPaused = false;
        if (shouldResume) void startPlayback();
        return;
    }
    pauseForUserAction(
        'Episode audio isn\'t loading — tap Retry',
        'Episode audio isn\'t loading — check your connection and try again'
    );
}

async function runCombinedRecoveryAttempt(generation) {
    if (generation !== audioSourceGeneration || combinedRecoveryGeneration !== generation) return;
    combinedRecoveryTimer = null;
    combinedRecoveryInFlight = true;
    combinedRecoveryAttemptFailure = null;
    const position = continuousPosition();
    const audio = speechPlayers.audio;
    if (combinedRecoveryPrefersFallback && combinedRecoveryAttempts > 1 && audio?.src) {
        // A format error can also be a transient range failure. Retry from the
        // network while keeping the saved MP3 available when the phone is offline.
        const retryUrl = new URL(audio.src, document.baseURI);
        retryUrl.searchParams.set('podlearnRetry', '1');
        audio.src = retryUrl.href;
    }
    try { audio?.load(); } catch { /* ignore */ }
    speechPlayers.seek(position);
    try {
        if (combinedRecoveryShouldResume) {
            continuousPlayIntentGeneration = generation;
            await speechPlayers.play();
            if (generation === audioSourceGeneration && !combinedRecoveryAttemptFailure) {
                continuousPlayIntentGeneration = null;
                resetCombinedRecovery(generation);
            }
        }
    } catch (error) {
        combinedRecoveryAttemptFailure = snapshotAudioFailure(error);
    } finally {
        if (generation !== audioSourceGeneration) return;
        combinedRecoveryInFlight = false;
    }
    if (combinedRecoveryAttemptFailure) {
        scheduleCombinedRecovery(combinedRecoveryAttemptFailure, {
            generation,
            resume: combinedRecoveryShouldResume
        });
    }
}

function scheduleCombinedRecovery(error, {
    generation = audioSourceGeneration,
    resume = false,
    immediate = false
} = {}) {
    if (generation !== audioSourceGeneration || !speechPlayers.isContinuousReady()) return false;
    const failure = snapshotAudioFailure(error);
    const action = classifyContinuousAudioFailure(failure);
    if (action === 'gesture') {
        resetCombinedRecovery(generation);
        pauseForUserAction('Tap play to continue', 'Next episode is ready — tap Play to continue', {
            actionLabel: 'Play',
            // Keep play() in the click activation instead of deferring it to a
            // retry timer; Safari otherwise rejects the handoff again.
            onAction: () => { void requestContinuousPlayback(); }
        });
        return true;
    }
    const hasCurrentIntent = resume
        || continuousPlayIntentGeneration === generation
        || (isPlaying && !isPaused);
    // Ignore preload/source-swap errors when nobody asked this generation to
    // play. A later explicit play() will surface a current, actionable error.
    if (!hasCurrentIntent) return false;
    if (combinedRecoveryGeneration !== generation) resetCombinedRecovery(generation);
    combinedRecoveryShouldResume = combinedRecoveryShouldResume || hasCurrentIntent;
    combinedRecoveryPrefersFallback = combinedRecoveryPrefersFallback || action === 'fallback';
    if (combinedRecoveryInFlight) {
        combinedRecoveryAttemptFailure = failure;
        return true;
    }
    if (combinedRecoveryTimer !== null || combinedRecoveryFinalizing) return true;
    if (combinedRecoveryAttempts >= COMBINED_RETRY_DELAYS_MS.length) {
        void finalizeCombinedFailure(generation);
        return true;
    }
    const delay = immediate ? 0 : COMBINED_RETRY_DELAYS_MS[combinedRecoveryAttempts];
    combinedRecoveryAttempts += 1;
    setStatus(combinedRecoveryAttempts === 1 ? 'Reconnecting audio…' : 'Retrying episode audio…');
    combinedRecoveryTimer = setTimeout(() => {
        void runCombinedRecoveryAttempt(generation);
    }, delay);
    return true;
}

speechPlayers.on('error', (error) => {
    const failure = snapshotAudioFailure(error);
    const generation = audioSourceGeneration;
    console.warn('Audio element error:', failure);
    scheduleCombinedRecovery(failure, {
        generation,
        resume: continuousPlayIntentGeneration === generation || (isPlaying && !isPaused)
    });
});

function retryAudioLoad() {
    if (!speechPlayers.isContinuousReady()) return;
    const generation = audioSourceGeneration;
    resetCombinedRecovery(generation);
    continuousPlayIntentGeneration = generation;
    scheduleCombinedRecovery({ name: 'NetworkError' }, {
        generation,
        resume: true,
        immediate: true
    });
}

function handlePlayFailure(error, generation = audioSourceGeneration) {
    if (generation !== audioSourceGeneration) return;
    const failure = snapshotAudioFailure(error);
    console.warn('play() failed:', failure);
    scheduleCombinedRecovery(failure, { generation, resume: true });
}

async function requestContinuousPlayback() {
    const generation = audioSourceGeneration;
    continuousPlayIntentGeneration = generation;
    try {
        await speechPlayers.play();
        // Native 'play' fires even when loading is about to fail. Only a
        // fulfilled play promise confirms playback for this source.
        if (generation === audioSourceGeneration) {
            continuousPlayIntentGeneration = null;
            resetCombinedRecovery(generation);
        }
    } catch (error) {
        handlePlayFailure(error, generation);
    }
}

async function retryEpisodeAudioSetup() {
    const episode = currentEpisode;
    const podcast = playerPodcast;
    if (!episode || !podcast) return;
    await openEpisode(episode, {
        podcast,
        promptResume: false,
        preferredLine: retryStartLine,
        playOnOpen: true
    });
}

async function startPlayback() {
    if (dialogueLines.length === 0) return false;
    dismissCompleteModal();
    if (episodeAudioLoadFailed) {
        setPlayButtonState(false);
        setStatus('Episode audio metadata isn\'t loading — tap Retry');
        toasts.show('Episode audio metadata isn\'t loading — check your connection and try again', {
            actionLabel: 'Retry',
            duration: 0,
            onAction: () => { void retryEpisodeAudioSetup(); }
        });
        return false;
    }

    if (episodeFinished) {
        episodeFinished = false;
        markProgressChanged();
        currentLineIndex = 0;
        if (speechPlayers.isContinuousReady()) speechPlayers.seek(0);
    }

    if (speechPlayers.isContinuousReady()) {
        // Continuous mode: combined.mp3 plays as a single <audio>; line tracking
        // happens in the 'linechange' event listener. Player events flip the UI.
        if (isPlaying && !isPaused) return true;
        await requestContinuousPlayback();
        syncMediaSession({ includeMetadata: true, includePosition: true });
        return isPlaying && !isPaused;
    }

    // Legacy chunked fallback (manifest lacks per-line durations).
    if (isPlaying && !isPaused) return true;
    const sessionId = playbackSessions.createSession();
    isPlaying = true;
    isPaused = false;
    setPlayButtonState(true);
    miniPlayer.update();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    await requestWakeLock();

    let consecutiveAudioFailures = 0;
    let lineFailureToast = null;
    let chunkStopStatus = 'Ready';
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
            lineFailureToast?.dismiss();
            lineFailureToast = null;
        } catch (e) {
            if (!playbackSessions.isActive(sessionId)) return;
            console.error('Speech error:', e);
            const failedLine = currentLineIndex;
            if (e?.name === 'NotAllowedError') {
                currentLineIndex = failedLine;
                isPlaying = false;
                chunkStopStatus = 'Tap play to continue';
                lineFailureToast?.dismiss();
                lineFailureToast = null;
                toasts.show('Next episode is ready — tap Play to continue', {
                    actionLabel: 'Play',
                    duration: 0,
                    onAction: () => {
                        void startPlayback();
                    }
                });
                break;
            }
            consecutiveAudioFailures++;
            if (consecutiveAudioFailures >= 3) {
                // Nothing is loading (offline, missing audio deploy, bad
                // episode) — stop at the start of the failing run instead of
                // silently "playing" the rest of the episode and marking it
                // complete with no sound.
                currentLineIndex = Math.max(0, failedLine - (consecutiveAudioFailures - 1));
                isPlaying = false;
                chunkStopStatus = 'Episode audio isn\'t loading — tap Retry';
                lineFailureToast?.dismiss();
                lineFailureToast = null;
                toasts.show("Episode audio isn't loading — check your connection and try again", {
                    actionLabel: 'Retry',
                    onAction: () => { void jumpToLine(currentLineIndex, true); }
                });
                break;
            }
            // Identical messages coalesce into one toast, so a run of failing
            // lines doesn't stack notifications.
            if (!lineFailureToast) {
                lineFailureToast = toasts.show('Audio failed for a line — skipping ahead', {
                    actionLabel: 'Retry',
                    onAction: () => { void jumpToLine(failedLine, true); }
                });
            }
        }
        if (!playbackSessions.isActive(sessionId)) break;
        if (isPlaying && !isPaused) {
            currentLineIndex++;
            markProgressChanged();
            if (!document.hidden) await new Promise(r => setTimeout(r, 120));
        }
    }
    if (!playbackSessions.isActive(sessionId)) return;

    if (currentLineIndex >= dialogueLines.length && isPlaying) {
        isPlaying = false;
        isPaused = false;
        episodeFinished = true;
        markProgressChanged();
        currentLineIndex = dialogueLines.length - 1;
        const sleepStop = sleep.isEpisodeEndStop();
        void releaseWakeLock();
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
        setStatus(chunkStopStatus);
        miniPlayer.update();
        syncMediaSession({ includeMetadata: true, includePosition: true });
    }
    return episodeFinished;
}

async function stopPlayback({ preserveOpenRequest = false } = {}) {
    dismissCompleteModal();
    if (!preserveOpenRequest) episodeOpenRequest += 1;
    invalidateContinuousSource();
    playbackSessions.invalidate();
    nowPlayingViz.stop();
    isPlaying = false;
    isPaused = false;
    speechPlayers.pause();
    speechPlayers.stopCurrentSpeech();
    sleep.restoreVolume();
    const releasing = releaseWakeLock();
    setPlayButtonState(false);
    saveState();
    miniPlayer.update();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    await releasing;
}

async function togglePlayPause() {
    // An explicit transport action supersedes a still-pending episode switch.
    episodeOpenRequest += 1;
    if (speechPlayers.isContinuousReady()) {
        if (!isPlaying || isPaused) {
            await startPlayback();
        } else {
            invalidateContinuousSource();
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
    if (episodeAudioLoadFailed) retryStartLine = target;

    if (speechPlayers.isContinuousReady()) {
        markProgressChanged();
        currentLineIndex = target;
        speechPlayers.seekToLine(target);
        updateProgress();
        // Seeking to a line is an explicit "take me there" — re-enter follow
        // mode so the transcript tracks playback from the new position.
        transcriptPanel.resync();
        miniPlayer.update();
        syncMediaSession({ includeMetadata: false, includePosition: true });
        if (autoStart || wasPlaying) {
            await requestContinuousPlayback();
        }
        saveState();
        return;
    }

    // Legacy chunked path.
    const seekSession = playbackSessions.createSession();
    episodeFinished = false;
    isPlaying = false;
    isPaused = false;
    speechPlayers.stopCurrentSpeech();
    await releaseWakeLock();
    if (!playbackSessions.isActive(seekSession)) return;
    currentLineIndex = target;
    markProgressChanged();
    updateProgress();
    transcriptPanel.resync();
    saveState();
    setPlayButtonState(false);
    setStatus('Ready');
    miniPlayer.update();
    syncMediaSession({ includeMetadata: true, includePosition: true });
    if (autoStart || wasPlaying) {
        void startPlayback();
    }
}

function seekToSeconds(position) {
    markProgressChanged();
    speechPlayers.seek(position);
    updateProgress();
    miniPlayer.updateProgress();
    saveState();
}

// Time-based skip. In continuous-mp3 mode we just advance audio.currentTime
// by the given delta. In the legacy chunked fallback we approximate via
// estimated seconds-per-line.
function seekBySeconds(delta) {
    if (speechPlayers.isContinuousReady()) {
        seekToSeconds(speechPlayers.getCurrentTime() + delta);
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
                seekToSeconds(fraction * dur);
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
    saveState({ autoPlayNext });
});

// ===== EPISODE COMPLETE MODAL & QUEUE AUTO-ADVANCE =====
// The 5s countdown is a courtesy for someone watching the screen, but it must
// never be what *carries* playback forward. Once an episode ends the page stops
// playing media, which drops the exemption that kept its timers running at full
// rate — so a pending setTimeout is exactly the thing a backgrounded tab is
// free to throttle or freeze. On a locked phone that reads as "auto-play
// randomly stops between episodes". When nobody can see the countdown anyway,
// skip it and advance straight from the 'ended' event, while the media element
// is still warm and still allowed to start the next source without a gesture.
let autoAdvanceTimer = null;

function cancelAutoAdvanceTimer() {
    if (autoAdvanceTimer !== null) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
}

function dismissCompleteModal() {
    cancelAutoAdvanceTimer();
    const modal = document.getElementById('complete-modal');
    if (modal.classList.contains('show')) modal.classList.remove('show');
}

function showCompleteModal({ allowAutoAdvance = true } = {}) {
    setPlayButtonState(false);
    setStatus('Episode complete! 🎉');
    hideUpNextBanner();
    // A previous episode's countdown must not survive into this one, or two
    // pending timers race and advance twice — silently skipping an episode.
    cancelAutoAdvanceTimer();

    const next = getNextUp();
    const playNextBtn = document.getElementById('play-next-episode');
    playNextBtn.style.display = '';

    if (autoPlayNext && allowAutoAdvance && next) {
        if (document.visibilityState === 'hidden') {
            autoAdvanceIfAwake();
            return;
        }
        document.getElementById('complete-message').textContent = `Starting "${next.episode.title}" in 5 seconds...`;
        playNextBtn.textContent = 'Play Now';
        document.getElementById('complete-modal').classList.add('show');

        autoAdvanceTimer = setTimeout(() => {
            autoAdvanceTimer = null;
            if (document.getElementById('complete-modal').classList.contains('show')) {
                autoAdvanceIfAwake();
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
function autoAdvanceIfAwake() {
    if (!sleep.checkExpiry()) void playNextEpisode();
}

async function playNextEpisode() {
    const next = getNextUp();
    if (!next) return;
    await playUpcomingEpisode(next.podcast, next.episode);
}

async function playUpcomingEpisode(podcast, episode, { resume = false } = {}) {
    dismissCompleteModal();
    const nextKey = epKeyOf(podcast, episode);
    const prefetchedAudioManifest = prebufferedNextAudio?.key === nextKey
        ? prebufferedNextAudio.audioManifest
        : null;
    if (currentPodcast?.id !== podcast.id) openPodcast(podcast);
    const loaded = await openEpisode(episode, {
        podcast,
        promptResume: resume,
        preferredLine: resume ? null : 0,
        prefetchedAudioManifest
    });
    if (!loaded) return;
    await startPlayback();
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
    const owner = playerPodcast;
    const prevEp = findAdjacentEpisode(owner, currentEpisode?.id, -1);
    if (prevEp) {
        if (currentPodcast?.id !== owner.id) openPodcast(owner);
        const loaded = await openEpisode(prevEp, {
            podcast: owner,
            promptResume: false,
            preferredLine: 0
        });
        if (loaded) await startPlayback();
    }
}

// The screen can go dark *during* the countdown — lock the phone the moment an
// episode ends and the pending timer inherits all the throttling we just took
// care to avoid. Nobody is reading a countdown on a dark screen, so collapse it
// into an immediate advance instead of waiting out a timer that may not fire.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (autoAdvanceTimer === null) return;
    cancelAutoAdvanceTimer();
    if (document.getElementById('complete-modal').classList.contains('show')) autoAdvanceIfAwake();
});

document.getElementById('play-next-episode').addEventListener('click', playNextEpisode);
document.getElementById('back-to-episodes').addEventListener('click', () => {
    dismissCompleteModal();
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
    const seasonNum = params.get('season');
    const lineNum = params.get('line');

    const podcasts = getPodcasts();
    if (podcastId && podcasts.length > 0) {
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast) {
            const episode = episodeNum
                ? podcast.episodes.find(e => e.id === parseInt(episodeNum))
                : null;
            if (episode) {
                // Episode identity wins if an explicit season query conflicts.
                library.selectSeasonForEpisode(podcast, episode);
                openPodcast(podcast, { transition: false });
                const preferredLine = lineNum === null ? null : Number.parseInt(lineNum, 10);
                void openEpisode(episode, {
                    podcast,
                    preferredLine,
                    promptResume: !Number.isInteger(preferredLine)
                });
            } else {
                const requestedSeason = parseInt(seasonNum, 10);
                if (Number.isInteger(requestedSeason)) {
                    library.selectSeason(podcast, requestedSeason);
                }
                openPodcast(podcast);
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

// Both the catalog and a controlling worker are needed to identify playable
// downloads. Either can become available first, including on an offline boot.
function reconcileDownloads() {
    if (!navigator.serviceWorker?.controller || !podcastsLoader.isLoaded()) return;
    void downloads.reconcile().catch(err => console.warn('Download reconciliation skipped:', err));
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', reconcileDownloads);
    document.getElementById('home-downloads')?.addEventListener('toggle', event => {
        if (event.currentTarget.open) reconcileDownloads();
    });
    window.addEventListener('online', reconcileDownloads);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reconcileDownloads();
    });
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
    if (!currentEpisode) return;

    console.log('Page hide - saving state, persisted:', e.persisted);
    saveState();
    syncMediaSession({ includeMetadata: true, includePosition: true });

    // Don't cancel speech - browser media policies will decide background behavior.
    console.log('Page hidden, playback managed by browser policy');
}, { passive: true });

// Fallback: beforeunload for saving state
window.addEventListener('beforeunload', () => {
    if (!currentEpisode) return;
    console.log('Before unload - saving state');
    saveState();
});

async function forceRefresh() {
    const btn = document.getElementById('refresh-btn');
    const label = btn.querySelector('span');
    label.textContent = 'Refreshing…';
    btn.disabled = true;
    try {
        await swClient.refresh();
    } catch {
        toasts.show('Couldn’t refresh the player. Try again when you’re online.');
    } finally {
        btn.disabled = false;
        label.textContent = 'Refresh';
    }
}

function applyUpdate() {
    swClient.applyUpdate();
}

document.getElementById('refresh-btn')?.addEventListener('click', forceRefresh);
document.getElementById('apply-update-btn')?.addEventListener('click', applyUpdate);
