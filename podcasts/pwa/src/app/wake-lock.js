// Wake Lock API for keeping the screen on during playback.

export function createWakeLockManager({ shouldReacquire }) {
    let wakeLock = null;

    // Request wake lock to prevent device from sleeping
    async function request() {
        if (!('wakeLock' in navigator)) {
            console.log('Wake Lock API not supported');
            return;
        }

        // Don't request if already acquired
        if (wakeLock && !wakeLock.released) {
            console.log('Wake Lock already active');
            return;
        }

        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock acquired');

            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');

                // Auto re-acquire if playback is still active
                if (shouldReacquire()) {
                    console.log('Re-acquiring Wake Lock for active playback');
                    setTimeout(() => request(), 100);
                }
            });
        } catch (err) {
            console.warn('Wake Lock request failed:', err);
        }
    }

    // Release wake lock when playback stops
    async function release() {
        if (wakeLock && !wakeLock.released) {
            try {
                await wakeLock.release();
                wakeLock = null;
                console.log('Wake Lock released manually');
            } catch (err) {
                console.warn('Wake Lock release failed:', err);
            }
        }
    }

    return { request, release };
}
