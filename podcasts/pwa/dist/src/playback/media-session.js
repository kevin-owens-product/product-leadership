// Media Session API wiring — lock screen controls, notification controls,
// and position state, for both continuous combined.mp3 playback and the
// legacy chunked fallback (which maps time offsets to transcript lines).

export function createMediaSessionController({
    speechPlayers,
    getState,
    estimateEpisodeDurationSeconds,
    getSkipForward,
    getSkipBackward,
    actions
}) {
    let handlersInitialized = false;

    function updatePlaybackState() {
        if (!('mediaSession' in navigator)) return;
        const { isPlaying, isPaused } = getState();
        navigator.mediaSession.playbackState = (isPlaying && !isPaused) ? 'playing' : 'paused';
    }

    function updateMetadata() {
        const { currentPodcast, currentEpisode } = getState();
        if (!currentPodcast || !currentEpisode) return;
        // Android can use the document title before the native media session
        // acquires audio focus. Keep it tied to the track while browsing shows.
        const label = `${currentEpisode.title} — ${currentPodcast.title}`;
        if (document.title !== label) document.title = label;
        if (!navigator.mediaSession || typeof window.MediaMetadata !== 'function') return;
        const fields = {
            title: currentEpisode.title,
            artist: currentPodcast.title,
            album: currentEpisode.season
                ? `${currentPodcast.title} · Season ${currentEpisode.season}`
                : currentPodcast.title
        };
        const cover = currentPodcast.coverUrl;
        try {
            const image = {
                src: new URL(cover || 'icon-512.png', document.baseURI).href,
                sizes: '512x512',
                type: cover ? 'image/jpeg' : 'image/png'
            };
            navigator.mediaSession.metadata = new window.MediaMetadata({ ...fields, artwork: [image] });
        } catch {
            // Some native media bridges accept the text fields alone.
            try {
                navigator.mediaSession.metadata = new window.MediaMetadata(fields);
            } catch (error) {
                console.debug('Media Session metadata unavailable:', error);
            }
        }
    }

    function updatePositionState() {
        if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
        const { currentEpisode, dialogueLines, currentLineIndex, speechRate, episodeAudioDuration } = getState();
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

    function initializeHandlers() {
        if (!('mediaSession' in navigator) || handlersInitialized) return;
        const setActionHandler = (action, handler) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (err) {
                console.debug(`Media Session action not supported: ${action}`, err);
            }
        };

        setActionHandler('play', () => {
            const { isPlaying, isPaused } = getState();
            if (!isPlaying || isPaused) {
                void actions.togglePlayPause();
            }
        });
        setActionHandler('pause', () => {
            const { isPlaying, isPaused } = getState();
            if (isPlaying && !isPaused) {
                void actions.togglePlayPause();
            }
        });
        setActionHandler('stop', () => {
            void actions.stopPlayback();
        });
        // A receiver may provide its own seek interval. When it omits one,
        // use the same preference and transport path as the on-screen button.
        function seekOffset(details, getDefault) {
            const offset = details?.seekOffset;
            return Number.isFinite(offset) && offset > 0 ? offset : getDefault();
        }
        setActionHandler('seekbackward', (details) => {
            actions.seekBySeconds(-seekOffset(details, getSkipBackward));
        });
        setActionHandler('seekforward', (details) => {
            actions.seekBySeconds(seekOffset(details, getSkipForward));
        });
        setActionHandler('seekto', (details) => {
            if (!Number.isFinite(details?.seekTime)) return;
            if (speechPlayers.isContinuousReady()) {
                actions.seekToSeconds(details.seekTime);
            } else {
                const { isPlaying, isPaused, dialogueLines } = getState();
                const duration = estimateEpisodeDurationSeconds();
                const targetLine = Math.round((details.seekTime / Math.max(1, duration)) * dialogueLines.length);
                void actions.jumpToLine(targetLine, isPlaying && !isPaused);
            }
        });
        setActionHandler('previoustrack', () => {
            void actions.playPreviousEpisode();
        });
        setActionHandler('nexttrack', () => {
            void actions.playNextEpisode();
        });

        handlersInitialized = true;
    }

    function sync({ includeMetadata = false, includePosition = false } = {}) {
        if (includeMetadata) {
            updateMetadata();
        }
        if (!navigator.mediaSession) return;
        initializeHandlers();
        updatePlaybackState();
        if (includePosition) {
            updatePositionState();
        }
    }

    return { sync, updatePlaybackState, updatePositionState };
}
