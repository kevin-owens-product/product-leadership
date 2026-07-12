// Long-press repeat helper for the skip buttons: hold to keep skipping.
// Timers are injectable so the state machine is unit-testable headlessly.

export function createRepeatSkipper({
  action,
  initialDelayMs = 550,
  repeatIntervalMs = 350,
  timers = globalThis
} = {}) {
  let timeoutId = null;
  let intervalId = null;
  let repeated = false;

  function press() {
    release();
    repeated = false;
    timeoutId = timers.setTimeout(() => {
      timeoutId = null;
      repeated = true;
      action();
      intervalId = timers.setInterval(action, repeatIntervalMs);
    }, initialDelayMs);
  }

  // Ends the press. Returns true when the hold already fired repeat skips,
  // so the caller can suppress the trailing click event.
  function release() {
    if (timeoutId !== null) {
      timers.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (intervalId !== null) {
      timers.clearInterval(intervalId);
      intervalId = null;
    }
    const wasRepeating = repeated;
    repeated = false;
    return wasRepeating;
  }

  return { press, release, isRepeating: () => repeated };
}
