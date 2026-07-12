// Sleep timer controller: state, volume fade, expiry, and the player UI
// surfaces (modal, status chip, header badge).
//
// The timer is either a wall-clock end time (minute presets) or an
// end-of-episode stop. Not persisted — a reload cancels the timer, which is
// what every polished podcast app does.

import { sleepFadeVolume, sleepRemainingSeconds } from './sleep-timer.js?v=2.3.0%2B20260712T213026Z';
import { formatClock } from '../ui/format.js?v=2.3.0%2B20260712T213026Z';

export function createSleepController({
    speechPlayers,
    getSpeechRate,
    getEpisodeAudioDuration,
    setStatus,
    saveState,
    stopPlayback,
    syncMediaSession
}) {
    let sleepTimerEndTime = null;
    let sleepAtEpisodeEnd = false;
    // Remembers the user's volume so we can restore it after the fade-out.
    let sleepBaseVolume = null;

    function isActive() {
        return sleepTimerEndTime !== null || sleepAtEpisodeEnd;
    }

    function isEpisodeEndStop() {
        return sleepAtEpisodeEnd;
    }

    function currentRemaining() {
        const continuous = speechPlayers.isContinuousReady();
        return sleepRemainingSeconds({
            endTime: sleepTimerEndTime,
            atEpisodeEnd: sleepAtEpisodeEnd,
            now: Date.now(),
            positionSeconds: continuous ? speechPlayers.getCurrentTime() : 0,
            durationSeconds: continuous ? (speechPlayers.getDuration() || getEpisodeAudioDuration()) : 0,
            playbackRate: getSpeechRate()
        });
    }

    // Gentle fade over the final SLEEP_FADE_SECONDS before the timer stops
    // playback. The user's volume is captured on the way into the fade window
    // and restored once playback stops (or the timer is cancelled). Note: iOS
    // Safari ignores element volume, so the fade is a desktop/Android nicety.
    function applyFade() {
        if (!isActive()) return;
        const audioEl = speechPlayers.audio;
        if (!audioEl) return;
        const remaining = currentRemaining();
        const factor = sleepFadeVolume(remaining);
        if (factor >= 1) {
            // Seeking back out of the fade window: undo any partial fade so
            // the rest of the episode doesn't play at the faded volume.
            restoreVolume();
            return;
        }
        if (sleepBaseVolume === null) sleepBaseVolume = audioEl.volume;
        try { audioEl.volume = sleepBaseVolume * factor; } catch { /* ignore */ }
    }

    function restoreVolume() {
        if (sleepBaseVolume === null) return;
        const audioEl = speechPlayers.audio;
        if (audioEl) {
            try { audioEl.volume = sleepBaseVolume; } catch { /* ignore */ }
        }
        sleepBaseVolume = null;
    }

    function checkExpiry() {
        if (sleepTimerEndTime !== null && Date.now() >= sleepTimerEndTime) {
            void finish();
            return true;
        }
        return false;
    }

    // Timer fired: pause (keeping position) rather than stop, restore the faded
    // volume, and make sure the lockscreen reflects the paused state.
    async function finish() {
        sleepTimerEndTime = null;
        sleepAtEpisodeEnd = false;
        if (speechPlayers.isContinuousReady()) {
            speechPlayers.pause();
        } else {
            await stopPlayback();
        }
        restoreVolume();
        setStatus('Sleep timer ended');
        updateUI();
        saveState();
        syncMediaSession({ includePosition: true });
    }

    // End-of-episode mode resolved naturally (the episode finished). Clears the
    // timer and restores volume; returns true if a sleep stop was consumed.
    function consumeEpisodeEndStop() {
        if (!sleepAtEpisodeEnd) return false;
        sleepAtEpisodeEnd = false;
        restoreVolume();
        setStatus('Sleep timer ended');
        updateUI();
        return true;
    }

    function setMinutes(mins) {
        restoreVolume();
        sleepAtEpisodeEnd = false;
        sleepTimerEndTime = Date.now() + mins * 60 * 1000;
        updateUI();
    }

    function setEpisodeEnd() {
        restoreVolume();
        sleepTimerEndTime = null;
        sleepAtEpisodeEnd = true;
        updateUI();
    }

    function cancel() {
        sleepTimerEndTime = null;
        sleepAtEpisodeEnd = false;
        restoreVolume();
        updateUI();
    }

    // Keeps the modal display, the status-row chip, and the header button badge
    // in sync — the "visible state" of the timer in the player UI.
    function updateUI() {
        const display = document.getElementById('timer-display');
        const chip = document.getElementById('sleep-chip');
        const chipText = document.getElementById('sleep-chip-text');
        const headerBtn = document.getElementById('sleep-timer-btn');
        const active = isActive();
        headerBtn?.classList.toggle('sleep-active', active);

        if (!active) {
            if (display) {
                display.textContent = 'No timer set';
                display.classList.remove('active');
            }
            if (chip) chip.hidden = true;
            document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
            return;
        }

        const remaining = currentRemaining();
        if (sleepAtEpisodeEnd) {
            const suffix = Number.isFinite(remaining) ? ` (~${formatClock(remaining)} left)` : '';
            if (display) display.textContent = `Stopping at end of episode${suffix}`;
            if (chipText) chipText.textContent = Number.isFinite(remaining) ? formatClock(remaining) : 'End of ep.';
        } else {
            if (display) display.textContent = `Stopping in ${formatClock(remaining)}`;
            if (chipText) chipText.textContent = formatClock(remaining);
        }
        if (display) display.classList.add('active');
        if (chip) chip.hidden = false;
    }

    function bind() {
        document.getElementById('sleep-timer-btn').addEventListener('click', () => {
            document.getElementById('sleep-modal').classList.add('show');
        });

        document.getElementById('sleep-chip')?.addEventListener('click', () => {
            document.getElementById('sleep-modal').classList.add('show');
        });

        document.getElementById('close-sleep-modal').addEventListener('click', () => {
            document.getElementById('sleep-modal').classList.remove('show');
        });

        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.dataset.episodeEnd) {
                    setEpisodeEnd();
                } else {
                    setMinutes(parseInt(btn.dataset.minutes));
                }
            });
        });

        document.getElementById('cancel-timer').addEventListener('click', cancel);

        // 1 Hz countdown refresh; also catches expiry while paused (timeupdate
        // events stop when the audio element is paused).
        setInterval(() => {
            if (!isActive()) return;
            if (checkExpiry()) return;
            updateUI();
        }, 1000);
    }

    return {
        isActive,
        isEpisodeEndStop,
        applyFade,
        restoreVolume,
        checkExpiry,
        consumeEpisodeEndStop,
        bind
    };
}
