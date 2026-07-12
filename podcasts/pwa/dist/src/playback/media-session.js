// Media Session API wiring — lock screen controls, notification controls,
// and position state, for both continuous combined.mp3 playback and the
// legacy chunked fallback (which maps time offsets to transcript lines).

export function createMediaSessionController({
    speechPlayers,
    getState,
    getArtwork,
    estimateEpisodeDurationSeconds,
    estimateLineJumpFromSeconds,
    actions
}) {
    let handlersInitialized = false;

    function updatePlaybackState() {
        if (!('mediaSession' in navigator)) return;
        const { isPlaying, isPaused } = getState();
        navigator.mediaSession.playbackState = (isPlaying && !isPaused) ? 'playing' : 'paused';
    }

    function updateMetadata() {
        if (!('mediaSession' in navigator)) return;
        const { currentPodcast, currentEpisode } = getState();
        if (!currentPodcast || !currentEpisode) return;
        if (typeof window.MediaMetadata !== 'function') return;
        const artwork = getArtwork(currentPodcast);
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentEpisode.title,
            artist: currentPodcast.title,
            album: 'PodLearn',
            artwork: artwork
                ? [{ src: artwork, sizes: '1024x1024', type: 'image/png' }]
                : [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }]
        });
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
        setActionHandler('seekbackward', (details) => {
            const offset = Number(details?.seekOffset) || 10;
            if (speechPlayers.isContinuousReady()) {
                speechPlayers.seek(speechPlayers.getCurrentTime() - offset);
                updatePositionState();
            } else {
                const { isPlaying, isPaused, currentLineIndex } = getState();
                const linesToJump = estimateLineJumpFromSeconds(offset);
                void actions.jumpToLine(currentLineIndex - linesToJump, isPlaying && !isPaused);
            }
        });
        setActionHandler('seekforward', (details) => {
            const offset = Number(details?.seekOffset) || 10;
            if (speechPlayers.isContinuousReady()) {
                speechPlayers.seek(speechPlayers.getCurrentTime() + offset);
                updatePositionState();
            } else {
                const { isPlaying, isPaused, currentLineIndex } = getState();
                const linesToJump = estimateLineJumpFromSeconds(offset);
                void actions.jumpToLine(currentLineIndex + linesToJump, isPlaying && !isPaused);
            }
        });
        setActionHandler('seekto', (details) => {
            if (!Number.isFinite(details?.seekTime)) return;
            if (speechPlayers.isContinuousReady()) {
                speechPlayers.seek(details.seekTime);
                updatePositionState();
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
        if (!('mediaSession' in navigator)) return;
        initializeHandlers();
        if (includeMetadata) {
            updateMetadata();
        }
        updatePlaybackState();
        if (includePosition) {
            updatePositionState();
        }
    }

    return { sync, updatePlaybackState, updatePositionState };
}
