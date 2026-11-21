export function registerServiceWorker({ onUpdateAvailable } = {}) {
  const reload = () => window.location.reload();
  if (!('serviceWorker' in navigator)) {
    return { registration: null, refresh: reload, applyUpdate: reload };
  }

  const serviceWorker = navigator.serviceWorker;
  let registration = null;
  let requestedUpdate = false;
  let announcedWorker = null;
  let hadController = Boolean(serviceWorker.controller);

  function announceUpdate(worker) {
    if (!worker || worker === announcedWorker) return;
    announcedWorker = worker;
    const banner = document.getElementById('update-banner');
    if (banner) banner.style.display = 'flex';
    onUpdateAvailable?.();
  }

  function watchInstallation(worker) {
    if (!worker) return;
    const installed = () => {
      if (worker.state === 'installed' && serviceWorker.controller) announceUpdate(worker);
    };
    worker.addEventListener('statechange', installed);
    installed();
  }

  serviceWorker.addEventListener('controllerchange', () => {
    if (requestedUpdate) {
      requestedUpdate = false;
      reload();
    } else if (hadController) {
      // Another tab applied an update. This tab can keep playing until its
      // listener chooses to reload it.
      announceUpdate(serviceWorker.controller);
    }
    hadController = Boolean(serviceWorker.controller);
  });

  const registered = serviceWorker.register('sw.js').then((reg) => {
    registration = reg;
    setInterval(() => reg.update().catch(() => {}), 60000);
    reg.addEventListener('updatefound', () => watchInstallation(reg.installing));
    watchInstallation(reg.installing);
    announceUpdate(reg.waiting);
    return reg;
  }).catch((err) => {
    console.log('SW error:', err);
    return null;
  });

  async function applyUpdate() {
    const reg = await registered;
    if (reg?.waiting) {
      requestedUpdate = true;
      reg.waiting.postMessage('SKIP_WAITING');
    } else {
      reload();
    }
  }

  async function refresh() {
    const reg = await registered;
    if (reg && !reg.waiting) {
      await reg.update();
      const worker = reg.installing;
      if (worker) {
        await new Promise((resolve, reject) => {
          const check = () => {
            if (worker.state === 'redundant') {
              worker.removeEventListener('statechange', check);
              reject(new Error('App update could not be installed'));
            } else if (['installed', 'activating', 'activated'].includes(worker.state)) {
              worker.removeEventListener('statechange', check);
              resolve();
            }
          };
          worker.addEventListener('statechange', check);
          check();
        });
      }
    }
    return applyUpdate();
  }

  return { get registration() { return registration; }, applyUpdate, refresh };
}
