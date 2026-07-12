// Sleep-timer math, kept pure so it's unit-testable. The player owns the
// actual state (end time / end-of-episode flag) and the <audio> element;
// these helpers just answer "how long until the timer stops playback?" and
// "how loud should we be right now?" for the gentle fade-out.

export const SLEEP_FADE_SECONDS = 20;

export const SLEEP_TIMER_MINUTES = [5, 15, 30, 45, 60];

// Volume multiplier for the fade-out over the final `fadeWindow` seconds.
// 1 outside the window, linearly down to 0 at expiry.
export function sleepFadeVolume(remainingSeconds, fadeWindow = SLEEP_FADE_SECONDS) {
  if (!Number.isFinite(remainingSeconds)) return 1;
  if (remainingSeconds >= fadeWindow) return 1;
  if (remainingSeconds <= 0) return 0;
  return remainingSeconds / fadeWindow;
}

// Seconds of wall-clock listening left before the sleep timer stops playback.
// Minute timers count down in real time; end-of-episode mode converts the
// remaining audio time through the playback rate. Infinity means "no timer"
// (or end-of-episode with no usable duration, e.g. the chunked fallback —
// playback then simply stops on the 'ended' event without a fade).
export function sleepRemainingSeconds({
  endTime = null,
  atEpisodeEnd = false,
  now = Date.now(),
  positionSeconds = 0,
  durationSeconds = 0,
  playbackRate = 1
} = {}) {
  if (endTime !== null && Number.isFinite(endTime)) {
    return Math.max(0, (endTime - now) / 1000);
  }
  if (atEpisodeEnd && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    const rate = Math.max(0.5, Number(playbackRate) || 1);
    return Math.max(0, (durationSeconds - positionSeconds) / rate);
  }
  return Infinity;
}
