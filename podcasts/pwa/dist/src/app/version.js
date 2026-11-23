// The badge describes the code running in this page. The service worker
// installs updates while its previous shell and downloaded audio remain usable.

export const VERSION_STORAGE_KEY = 'tlu_app_seen_version';
const BUILD_VERSION = '2.7.4+20261123T141526Z';

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

export async function checkForUpdates() {
    const runningVersion = BUILD_VERSION.includes('__') ? appVersion : BUILD_VERSION;
    setAppVersion(runningVersion);
    try {
        const response = await fetch('version.json?_=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (response.ok) {
            const data = await response.json();
            const version = data.buildVersion ?? data.version;
            const serverVersion = (typeof version === 'string' && version.trim())
                ? version.trim()
                : appVersion;
            if (navigator.serviceWorker?.controller && serverVersion !== runningVersion) {
                const registration = await navigator.serviceWorker.getRegistration();
                await registration?.update();
            } else if (BUILD_VERSION.includes('__')) {
                // Unbuilt source has no bundle version to display.
                setAppVersion(serverVersion);
            }
        }
    } catch (e) {
        console.log('Version check skipped (offline?):', e.message);
    }
    updateVersionBadge();
}
