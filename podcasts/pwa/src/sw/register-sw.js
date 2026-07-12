export function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (!('serviceWorker' in navigator)) {
    return { registration: null, unregister: async () => {} };
  }

  let swRegistration = null;
  let reloadedForUpdate = false;

  const reloadOnce = () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  };

  // A new version is installed and waiting: show the home-screen banner and
  // let the app surface it wherever the user actually is (toast with an
  // Update action — the banner only exists on the home view).
  const announceUpdate = () => {
    const banner = document.getElementById('update-banner');
    if (banner) banner.style.display = 'flex';
    if (typeof onUpdateAvailable === 'function') onUpdateAvailable();
  };

  navigator.serviceWorker.register('sw.js').then((reg) => {
    swRegistration = reg;
    const homeBadge = document.getElementById('offline-badge-home');
    const playerBadge = document.getElementById('offline-badge');
    if (homeBadge) homeBadge.style.display = 'inline-flex';
    if (playerBadge) playerBadge.style.display = 'inline-flex';

    setInterval(() => reg.update(), 60000);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          announceUpdate();
        }
      });
    });
  }).catch((err) => console.log('SW error:', err));

  // True when this page loaded under an existing service worker. When false,
  // the activation we're about to observe is the very first install — the
  // page already has the freshest assets, so it's neither an "update" to
  // announce nor a reason to reload. (Two flags: controlledAtLoad stays
  // fixed for the SW_UPDATED gate, because the first claim flips
  // hadController before the activate-time postMessage arrives.)
  const controlledAtLoad = Boolean(navigator.serviceWorker.controller);
  let hadController = controlledAtLoad;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED' && controlledAtLoad) {
      announceUpdate();
    }
  });

  // Reload when a NEW service worker takes over from an old one (an update
  // was applied), but not on the very first claim after install — reloading
  // a page that was just fetched from the network doubles every first
  // visit's load time (and tanks LCP).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    reloadOnce();
  });

  return {
    get registration() {
      return swRegistration;
    },
    unregister: async () => {
      if (swRegistration) {
        await swRegistration.unregister();
      }
    }
  };
}
