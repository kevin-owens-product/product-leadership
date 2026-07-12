// App-version state: the localStorage-persisted "seen" version, the header
// badge, and the boot-time update check that clears caches and reloads when
// the server's version.json disagrees with the version we last ran.

export const VERSION_STORAGE_KEY = 'tlu_app_seen_version';

let appVersion = localStorage.getItem(VERSION_STORAGE_KEY) || '0.0.0';

export function getAppVersion() {
    return appVersion;
}

export function updateVersionBadge() {
    const badge = document.getElementById('version-badge');
    if (badge) {
        // Strip the build-id suffix (everything after the '+') for display;
        // the full version still lives in localStorage / version.json.
        const display = appVersion.split('+')[0];
        badge.textContent = 'v' + display;
        badge.title = 'v' + appVersion;
    }
}

export function setAppVersion(version) {
    if (typeof version !== 'string' || !version.trim()) return;
    appVersion = version.trim();
    localStorage.setItem(VERSION_STORAGE_KEY, appVersion);
    updateVersionBadge();
}

// Runs immediately at boot - fetches version from server bypassing all caches.
// If version mismatch, clears everything and reloads.
export async function checkForUpdates() {
    try {
        const response = await fetch('version.json?_=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (response.ok) {
            const data = await response.json();
            const serverVersion = (typeof data.version === 'string' && data.version.trim())
                ? data.version.trim()
                : appVersion;
            const localVersion = localStorage.getItem(VERSION_STORAGE_KEY);
            console.log('Version check - Local:', localVersion || appVersion, 'Server:', serverVersion);

            if (localVersion && serverVersion !== localVersion) {
                console.log('Update available! Clearing caches and reloading...');
                localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);

                // Unregister all service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                }

                // Clear all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        await caches.delete(name);
                    }
                }

                // Hard reload
                window.location.reload();
                return;
            }

            setAppVersion(serverVersion);
        }
    } catch (e) {
        console.log('Version check skipped (offline?):', e.message);
    }
    updateVersionBadge();
}
