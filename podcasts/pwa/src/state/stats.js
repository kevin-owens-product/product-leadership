// Listening statistics: total time, completed episodes, streaks, average
// speed — persisted via state/storage.js and surfaced in the stats modal.

import { loadListeningStats, saveListeningStats } from './storage.js';

export function createStatsTracker({ now = () => performance.now() } = {}) {
    const listeningStats = loadListeningStats();
    let activeAudio = null;
    let lastSample = 0;
    let sampleRate = 1;

    function checkpoint() {
        if (!activeAudio) return;
        const t = now();
        const secondsListened = (t - lastSample) / 1000;
        lastSample = t;
        if (secondsListened <= 0) return;
        listeningStats.totalTime += secondsListened;
        // Older records have one speed sample per ten seconds of playback.
        const weight = secondsListened / 10;
        listeningStats.speedSum += sampleRate * weight;
        listeningStats.speedCount += weight;

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

    function stopTracking() {
        checkpoint();
        activeAudio = null;
    }

    function trackAudio(audio) {
        function startTracking() {
            if (audio.paused || audio.ended || activeAudio === audio) return;
            checkpoint();
            activeAudio = audio;
            lastSample = now();
            sampleRate = audio.playbackRate;
        }
        audio.addEventListener?.('playing', startTracking);
        audio.addEventListener?.('seeked', () => {
            // An already buffered seek can resume without another playing event.
            if (audio.readyState >= 3) startTracking();
        });
        for (const event of ['waiting', 'pause', 'ended', 'error', 'emptied', 'seeking']) {
            audio.addEventListener?.(event, () => {
                if (activeAudio === audio) stopTracking();
            });
        }
        audio.addEventListener?.('ratechange', () => {
            if (activeAudio !== audio) return;
            checkpoint();
            sampleRate = audio.playbackRate;
        });
    }

    function noteEpisodeCompleted() {
        listeningStats.episodesCompleted += 1;
        saveListeningStats(listeningStats);
    }

    function updateDisplay() {
        checkpoint();
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

    function bind() {
        document.getElementById('stats-btn').addEventListener('click', () => {
            updateDisplay();
            document.getElementById('stats-modal').classList.add('show');
        });

        document.getElementById('close-stats-modal').addEventListener('click', () => {
            document.getElementById('stats-modal').classList.remove('show');
        });

        setInterval(checkpoint, 10000);
        window.addEventListener('pagehide', checkpoint);
    }

    return { trackAudio, stopTracking, noteEpisodeCompleted, updateDisplay, bind };
}
