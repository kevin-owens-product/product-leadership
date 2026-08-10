// Ambient now-playing halo.
//
// This deliberately does not inspect or route the podcast <audio> element.
// A MediaElementAudioSourceNode permanently moves an element's output through
// an AudioContext; mobile browsers are allowed to suspend that context while
// the PWA is backgrounded. The media element can then report that it is
// playing while producing no sound until the app becomes visible again.
//
// The halo is decorative, so a lightweight CSS animation keyed to the real
// play/pause events is the safer trade-off. Native media output remains under
// Android/iOS audio-focus control and can continue across episode transitions.

export function createNowPlayingVisualizer({
  container,
  barCount = 20,
  prefersReducedMotion = () => false
} = {}) {
  let running = false;
  let barsBuilt = false;

  function buildBars() {
    if (!container || barsBuilt || prefersReducedMotion()) return false;
    const doc = container.ownerDocument;
    for (let i = 0; i < barCount; i++) {
      const bar = doc.createElement('span');
      bar.className = 'viz-bar';
      // Deterministic variation keeps the halo organic without sampling the
      // media stream. CSS owns the animation and may throttle it freely.
      bar.style.setProperty('--viz-delay', `${-((i * 73) % 620)}ms`);
      bar.style.setProperty('--viz-duration', `${560 + ((i * 97) % 520)}ms`);
      bar.style.setProperty('--viz-peak', (0.42 + ((i * 37) % 56) / 100).toFixed(2));
      container.appendChild(bar);
    }
    barsBuilt = true;
    return true;
  }

  function start() {
    if (!buildBars() && (!container || prefersReducedMotion())) return;
    container.classList.add('live');
    running = true;
  }

  function stop() {
    running = false;
    if (container) container.classList.remove('live');
  }

  return {
    start,
    stop,
    isRunning: () => running,
    isSupported: () => Boolean(container) && !prefersReducedMotion(),
    // Kept as an observable guard for regression tests: podcast playback must
    // never be coupled to a Web Audio context again.
    hasContext: () => false
  };
}
