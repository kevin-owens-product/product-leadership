// podcasts.js loader — the episode catalog is a classic script that sets
// window.PODCASTS. Loaded with a cache-buster pinned to the deployed build.

import { getAppVersion } from './version.js?v=2.3.0%2B20260712T203412Z';

// build-episodes.js substitutes the real version into the placeholder below
// (same mechanism as sw.js); when running unbuilt source, fall back to the
// last-seen app version so the URL is still stable across reloads.
const BUILD_VERSION = '2.3.0+20260712T203412Z';

export function getPodcasts() {
    return Array.isArray(window.PODCASTS) ? window.PODCASTS : [];
}

export function createPodcastsLoader({ toasts, onLoaded }) {
    let loaded = false;

    function load() {
        const cacheKey = BUILD_VERSION.includes('__') ? getAppVersion() : BUILD_VERSION;
        const script = document.createElement('script');
        script.src = 'podcasts.js?v=' + encodeURIComponent(cacheKey);
        script.onload = function() {
            const podcasts = getPodcasts();
            console.log('podcasts.js loaded, PODCASTS:', podcasts.length + ' podcasts');
            loaded = true;
            // Re-render now that podcasts are loaded
            onLoaded();
        };
        script.onerror = function() {
            console.error('Failed to load podcasts.js');
            script.remove();
            document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">Failed to load podcasts. Try refreshing.</p>';
            toasts.show('Couldn’t load the podcast library', {
                actionLabel: 'Retry',
                onAction: load
            });
        };
        document.head.appendChild(script);
    }

    return {
        load,
        isLoaded: () => loaded
    };
}
