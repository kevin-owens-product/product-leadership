// Settings panel: theme toggle, configurable skip intervals, voice boost /
// silence trim toggles, and the clear-local-data escape hatch.

import { updateToggleButton } from './dom.js?v=2.7.3%2B20261121T204056Z';

function isSkipInterval(seconds) {
    return Number.isSafeInteger(seconds) && seconds > 0;
}

export function createSettingsPanel({ setStatus, stopPlayback, localStorageKeysToClear }) {
    let resettingLocalData = false;
    // Keep the phone and system media controls on the same validated values,
    // including when an older installation saved a blank or invalid setting.
    const skipIntervals = {};
    const skipInputs = [
        ['skip-forward-interval', 'skipForwardInterval'],
        ['skip-backward-interval', 'skipBackwardInterval'],
        ['skip-large-forward-interval', 'skipLargeForwardInterval'],
        ['skip-large-backward-interval', 'skipLargeBackwardInterval']
    ];
    for (const [id, key] of skipInputs) {
        const input = document.getElementById(id);
        input.value = localStorage.getItem(key) ?? input.defaultValue;
        skipIntervals[key] = isSkipInterval(input.valueAsNumber)
            ? input.valueAsNumber
            : Number(input.defaultValue);
    }
    let voiceBoostEnabled = localStorage.getItem('voiceBoostEnabled') === 'true';
    let silenceTrimEnabled = localStorage.getItem('silenceTrimEnabled') === 'true';
    let currentTheme = localStorage.getItem('theme') || 'dark';

    function updateSkipButtonTitles() {
        // All four skip buttons honor the user's configured intervals; hold any
        // of them to repeat-skip.
        const setSkipLabel = (id, seconds, direction) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const word = direction < 0 ? 'Back' : 'Forward';
            btn.title = `${word} ${seconds}s (hold to repeat)`;
            btn.setAttribute('aria-label', `${word} ${seconds} seconds, hold to repeat`);
            // The seconds sit inside the circular-arrow glyph; the arc itself
            // carries the direction, so the number is unsigned.
            const num = btn.querySelector('.skip-num');
            if (num) num.textContent = String(seconds);
            else btn.textContent = `${direction < 0 ? '−' : '+'}${seconds}`;
        };
        setSkipLabel('prev-btn', skipIntervals.skipLargeBackwardInterval, -1);
        setSkipLabel('back-btn', skipIntervals.skipBackwardInterval, -1);
        setSkipLabel('fwd-btn', skipIntervals.skipForwardInterval, 1);
        setSkipLabel('next-btn', skipIntervals.skipLargeForwardInterval, 1);
    }

    function bind() {
        // Initialize theme
        if (currentTheme === 'light') {
            document.body.classList.add('light-theme');
        }
        document.getElementById('theme-toggle').setAttribute(
            'aria-label',
            currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        );

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.classList.toggle('light-theme');
            document.getElementById('theme-toggle').querySelector('span').textContent =
                currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
            document.getElementById('theme-toggle').setAttribute(
                'aria-label',
                currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            );
            localStorage.setItem('theme', currentTheme);
        });

        for (const [id, key] of skipInputs) {
            const input = document.getElementById(id);
            input.addEventListener('change', () => {
                if (isSkipInterval(input.valueAsNumber)) {
                    skipIntervals[key] = input.valueAsNumber;
                    localStorage.setItem(key, String(input.valueAsNumber));
                    updateSkipButtonTitles();
                }
                input.value = skipIntervals[key];
            });
        }

        // Voice Boost Toggle
        document.getElementById('voice-boost-toggle').addEventListener('click', () => {
            voiceBoostEnabled = !voiceBoostEnabled;
            updateToggleButton('voice-boost-toggle', voiceBoostEnabled, voiceBoostEnabled ? 'On' : 'Off');
            localStorage.setItem('voiceBoostEnabled', voiceBoostEnabled);
            if (voiceBoostEnabled) {
                setStatus('Voice boost is handled in generated Supertonic audio');
            }
        });

        // Silence Trim Toggle
        document.getElementById('silence-trim-toggle').addEventListener('click', () => {
            silenceTrimEnabled = !silenceTrimEnabled;
            updateToggleButton('silence-trim-toggle', silenceTrimEnabled, silenceTrimEnabled ? 'On' : 'Off');
            localStorage.setItem('silenceTrimEnabled', silenceTrimEnabled);
        });

        document.getElementById('clear-local-data-btn').addEventListener('click', async () => {
            if (resettingLocalData) return;
            const confirmed = window.confirm(
                'Clear local app data and cache? This resets saved progress, bookmarks, queue, and settings on this device.'
            );
            if (!confirmed) return;

            resettingLocalData = true;
            try {
                await stopPlayback();
                if ('caches' in window) {
                    const names = await caches.keys();
                    const appCaches = names.filter(name => name.startsWith('podlearn-shell-') || name.startsWith('podlearn-offline-audio-'));
                    await Promise.all(appCaches.map(name => caches.delete(name)));
                }
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.getRegistration();
                    const appWorker = new URL('sw.js', window.location.href).href;
                    if ([reg?.active, reg?.waiting, reg?.installing].some(worker => worker?.scriptURL === appWorker)) {
                        await reg.unregister();
                    }
                }
                localStorageKeysToClear.forEach(key => localStorage.removeItem(key));
                window.location.replace(window.location.pathname);
            } catch (error) {
                resettingLocalData = false;
                setStatus('Could not clear local data. Try again.');
                console.warn('Local data reset failed:', error);
            }
        });
    }

    // Sync inputs + toggle labels to the stored values (called once at init,
    // mirroring the original bottom-of-file initialization block).
    function initControls() {
        for (const [id, key] of skipInputs) {
            document.getElementById(id).value = skipIntervals[key];
        }
        updateToggleButton('voice-boost-toggle', voiceBoostEnabled, voiceBoostEnabled ? 'On' : 'Off');
        updateToggleButton('silence-trim-toggle', silenceTrimEnabled, silenceTrimEnabled ? 'On' : 'Off');
        updateSkipButtonTitles();
    }

    return {
        bind,
        initControls,
        isResettingLocalData: () => resettingLocalData,
        updateSkipButtonTitles,
        skipForward: () => skipIntervals.skipForwardInterval,
        skipBackward: () => skipIntervals.skipBackwardInterval,
        skipLargeForward: () => skipIntervals.skipLargeForwardInterval,
        skipLargeBackward: () => skipIntervals.skipLargeBackwardInterval
    };
}
