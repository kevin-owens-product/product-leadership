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

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      announceUpdate();
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
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
