// Persistent bottom mini player shown on non-player screens whenever an
// episode is loaded (playing OR paused — like Overcast/Pocket Casts).

import { setPlayButtonState } from './dom.js?v=2.3.0%2B20260713T065224Z';
import { generatePodcastArtwork } from './artwork.js?v=2.3.0%2B20260713T065224Z';

export function createMiniPlayer({
    getPlayerPodcast,
    getCurrentPodcast,
    getCurrentEpisode,
    getPlaybackFraction,
    isPlayingActive,
    onToggle,
    onExpand
}) {
    function update() {
        const pod = getPlayerPodcast() || getCurrentPodcast();
        const currentEpisode = getCurrentEpisode();
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
        setPlayButtonState(isPlayingActive());
        updateProgress();
    }

    // Progress hairline across the top of the mini player.
    function updateProgress() {
        const fill = document.getElementById('mini-progress-fill');
        if (!fill) return;
        fill.style.width = `${(getPlaybackFraction() * 100).toFixed(2)}%`;
    }

    function bind() {
        // Whole-bar taps expand; #mini-player-open (a real button) carries the
        // keyboard/screen-reader semantics and its clicks bubble to here, so
        // Enter/Space need no separate handler.
        document.getElementById('mini-player').addEventListener('click', (e) => {
            if (e.target.closest('.mini-ctrl-btn')) return;
            onExpand();
        });

        document.getElementById('mini-play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            onToggle();
        });
    }

    return { update, updateProgress, bind };
}
