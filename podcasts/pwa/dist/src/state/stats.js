// Listening statistics: total time, completed episodes, streaks, average
// speed — persisted via state/storage.js and surfaced in the stats modal.

import { loadListeningStats, saveListeningStats, withStorageLock } from './storage.js?v=2.7.4%2B20261123T141526Z';

export function createStatsTracker({ now = () => performance.now() } = {}) {
    let activeAudio = null;
    let lastSample = 0;
    let sampleRate = 1;
    let pendingWrite;

    function checkpoint() {
        if (!activeAudio) return;
        const t = now();
        const secondsListened = (t - lastSample) / 1000;
        lastSample = t;
        if (secondsListened <= 0) return;
        // Older records have one speed sample per ten seconds of playback.
        const weight = secondsListened / 10;
        const weightedSpeed = sampleRate * weight;
        const date = new Date();
        const today = date.toDateString();
        date.setDate(date.getDate() - 1);
        const yesterday = date.toDateString();
        pendingWrite = withStorageLock('listeningStats', () => {
            const stats = loadListeningStats();
            stats.totalTime += secondsListened;
            stats.speedSum += weightedSpeed;
            stats.speedCount += weight;
            if (stats.lastListenDate !== today) {
                stats.currentStreak = stats.lastListenDate === yesterday ? stats.currentStreak + 1 : 1;
                stats.lastListenDate = today;
            }
            saveListeningStats(stats);
        });
    }

    function stopTracking() {
        checkpoint();
        activeAudio = null;
        return pendingWrite;
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
        pendingWrite = withStorageLock('listeningStats', () => {
            const stats = loadListeningStats();
            stats.episodesCompleted += 1;
            saveListeningStats(stats);
        });
    }

    async function updateDisplay() {
        checkpoint();
        await pendingWrite;
        const listeningStats = loadListeningStats();
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
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) checkpoint();
        });
        window.addEventListener('pagehide', checkpoint);
    }

    return { trackAudio, stopTracking, noteEpisodeCompleted, updateDisplay, bind };
}
