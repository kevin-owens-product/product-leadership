// Settings panel: theme toggle, configurable skip intervals, voice boost /
// silence trim toggles, and the clear-local-data escape hatch.

import { updateToggleButton } from './dom.js?v=2.3.0%2B20260716T163603Z';

export function createSettingsPanel({ setStatus, stopPlayback, localStorageKeysToClear }) {
    let skipForwardInterval = parseInt(localStorage.getItem('skipForwardInterval') || '10');
    let skipBackwardInterval = parseInt(localStorage.getItem('skipBackwardInterval') || '10');
    let skipLargeForwardInterval = parseInt(localStorage.getItem('skipLargeForwardInterval') || '30');
    let skipLargeBackwardInterval = parseInt(localStorage.getItem('skipLargeBackwardInterval') || '30');
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
        setSkipLabel('prev-btn', skipLargeBackwardInterval, -1);
        setSkipLabel('back-btn', skipBackwardInterval, -1);
        setSkipLabel('fwd-btn', skipForwardInterval, 1);
        setSkipLabel('next-btn', skipLargeForwardInterval, 1);
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

        // Skip interval inputs
        document.getElementById('skip-forward-interval').addEventListener('change', e => {
            skipForwardInterval = parseInt(e.target.value);
            localStorage.setItem('skipForwardInterval', skipForwardInterval);
            updateSkipButtonTitles();
        });

        document.getElementById('skip-backward-interval').addEventListener('change', e => {
            skipBackwardInterval = parseInt(e.target.value);
            localStorage.setItem('skipBackwardInterval', skipBackwardInterval);
            updateSkipButtonTitles();
        });

        document.getElementById('skip-large-forward-interval').addEventListener('change', e => {
            skipLargeForwardInterval = parseInt(e.target.value);
            localStorage.setItem('skipLargeForwardInterval', skipLargeForwardInterval);
            updateSkipButtonTitles();
        });

        document.getElementById('skip-large-backward-interval').addEventListener('change', e => {
            skipLargeBackwardInterval = parseInt(e.target.value);
            localStorage.setItem('skipLargeBackwardInterval', skipLargeBackwardInterval);
            updateSkipButtonTitles();
        });

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
            const confirmed = window.confirm(
                'Clear local app data and cache? This resets saved progress, bookmarks, queue, and settings on this device.'
            );
            if (!confirmed) return;

            await stopPlayback();

            localStorageKeysToClear.forEach((key) => {
                localStorage.removeItem(key);
            });

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
            }

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
            }

            window.location.href = window.location.pathname;
        });
    }

    // Sync inputs + toggle labels to the stored values (called once at init,
    // mirroring the original bottom-of-file initialization block).
    function initControls() {
        document.getElementById('skip-forward-interval').value = skipForwardInterval;
        document.getElementById('skip-backward-interval').value = skipBackwardInterval;
        document.getElementById('skip-large-forward-interval').value = skipLargeForwardInterval;
        document.getElementById('skip-large-backward-interval').value = skipLargeBackwardInterval;
        updateToggleButton('voice-boost-toggle', voiceBoostEnabled, voiceBoostEnabled ? 'On' : 'Off');
        updateToggleButton('silence-trim-toggle', silenceTrimEnabled, silenceTrimEnabled ? 'On' : 'Off');
        updateSkipButtonTitles();
    }

    return {
        bind,
        initControls,
        updateSkipButtonTitles,
        skipForward: () => skipForwardInterval,
        skipBackward: () => skipBackwardInterval,
        skipLargeForward: () => skipLargeForwardInterval,
        skipLargeBackward: () => skipLargeBackwardInterval
    };
}
