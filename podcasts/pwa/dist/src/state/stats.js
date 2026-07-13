// Listening statistics: total time, completed episodes, streaks, average
// speed — persisted via state/storage.js and surfaced in the stats modal.

import { loadListeningStats, saveListeningStats } from './storage.js?v=2.3.0%2B20260713T021738Z';

export function createStatsTracker({ getSpeechRate, isListening }) {
    const listeningStats = loadListeningStats();

    function recordListening(secondsListened) {
        listeningStats.totalTime += secondsListened;
        listeningStats.speedSum += getSpeechRate();
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

    function noteEpisodeCompleted() {
        listeningStats.episodesCompleted += 1;
        saveListeningStats(listeningStats);
    }

    function updateDisplay() {
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

        // Track time listened
        let lastStatsUpdate = Date.now();
        setInterval(() => {
            if (isListening()) {
                const now = Date.now();
                const elapsed = (now - lastStatsUpdate) / 1000;
                recordListening(elapsed);
                lastStatsUpdate = now;
            }
        }, 10000); // Update every 10 seconds
    }

    return { recordListening, noteEpisodeCompleted, updateDisplay, bind };
}
