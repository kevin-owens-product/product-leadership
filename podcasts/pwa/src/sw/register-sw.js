export function registerServiceWorker() {
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
          const banner = document.getElementById('update-banner');
          if (banner) banner.style.display = 'flex';
        }
      });
    });
  }).catch((err) => console.log('SW error:', err));

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      const banner = document.getElementById('update-banner');
      if (banner) banner.style.display = 'flex';
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
