// Ambient now-playing visualizer. A Web Audio AnalyserNode taps the shared
// <audio> element and drives a small strip of DOM bars using transform/opacity
// only (GPU-friendly; no canvas, no layout thrash).
//
// iOS Safari care:
// - The AudioContext is created lazily via ensureContext(), which callers must
//   invoke from a user gesture (the play button handler). Creating or resuming
//   a context outside a gesture is silently ignored by iOS.
// - Once createMediaElementSource() routes the element through the context,
//   audio dies whenever the context is not 'running' (iOS "interrupted" state
//   after calls/Siri/lock). We watch statechange + the element's play events
//   and resume the context so lockscreen/background playback keeps working.
// - If any part of the wiring throws, we fall back to routing the source
//   straight to the destination (never silence playback) and mark the
//   visualizer unsupported.
// - Under prefers-reduced-motion the context is never created and the strip
//   stays hidden (CSS hides it too), so playback is untouched.

// Map analyser frequency bins onto `barCount` levels in 0..1 with exponential
// smoothing against the previous levels. Low bins (voice energy) dominate, so
// bins are distributed evenly across the lower ~70% of the spectrum.
export function computeBarLevels(freqData, barCount, prevLevels = null, smoothing = 0.45) {
  const bars = Math.max(1, barCount | 0);
  const levels = new Array(bars).fill(0);
  const len = freqData ? freqData.length : 0;
  if (len === 0) return levels;
  const usable = Math.max(bars, Math.floor(len * 0.7));
  const binsPerBar = usable / bars;
  for (let b = 0; b < bars; b++) {
    const start = Math.floor(b * binsPerBar);
    const end = Math.min(len, Math.max(start + 1, Math.floor((b + 1) * binsPerBar)));
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i];
    const raw = sum / ((end - start) * 255);
    const prev = prevLevels && Number.isFinite(prevLevels[b]) ? prevLevels[b] : 0;
    const s = Math.max(0, Math.min(1, Number(smoothing) || 0));
    levels[b] = prev * s + raw * (1 - s);
  }
  return levels;
}

// Inline style values for one bar at a given level. Kept pure for tests:
// transform + opacity only, with a visible rest state so the strip reads as
// an intentional element even during silence.
export function barStyleForLevel(level) {
  const l = Math.max(0, Math.min(1, Number(level) || 0));
  const scale = 0.12 + l * 0.88;
  const opacity = 0.3 + l * 0.6;
  return {
    transform: `scaleY(${scale.toFixed(3)})`,
    opacity: opacity.toFixed(3)
  };
}

export function createNowPlayingVisualizer({
  audio,
  container,
  barCount = 20,
  prefersReducedMotion = () => false,
  getAudioContextCtor = () => globalThis.AudioContext || globalThis.webkitAudioContext,
  requestFrame = (cb) => globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(cb) : setTimeout(cb, 33),
  cancelFrame = (id) => globalThis.cancelAnimationFrame ? globalThis.cancelAnimationFrame(id) : clearTimeout(id)
} = {}) {
  let ctx = null;
  let analyser = null;
  let freqData = null;
  let levels = null;
  let unsupported = false;
  let running = false;
  let frameId = null;
  let bars = [];

  function buildBars() {
    if (!container || bars.length > 0) return;
    const doc = container.ownerDocument;
    for (let i = 0; i < barCount; i++) {
      const bar = doc.createElement('span');
      bar.className = 'viz-bar';
      const style = barStyleForLevel(0);
      bar.style.transform = style.transform;
      bar.style.opacity = style.opacity;
      container.appendChild(bar);
      bars.push(bar);
    }
  }

  function resumeIfNeeded() {
    if (!ctx) return;
    // 'interrupted' is iOS-specific; both it and 'suspended' silence the
    // routed element, so try to resume whenever the element wants to play.
    if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => { /* retried on next play/statechange */ });
    }
  }

  // Must be called from a user gesture. Safe to call repeatedly.
  function ensureContext() {
    if (ctx) { resumeIfNeeded(); return true; }
    if (unsupported || prefersReducedMotion()) return false;
    const Ctor = getAudioContextCtor();
    if (!Ctor || !audio) { unsupported = true; return false; }
    let source = null;
    try {
      ctx = new Ctor();
      source = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
      if ('onstatechange' in ctx || typeof ctx.addEventListener === 'function') {
        const onState = () => { if (!audio.paused) resumeIfNeeded(); };
        if (typeof ctx.addEventListener === 'function') ctx.addEventListener('statechange', onState);
        else ctx.onstatechange = onState;
      }
      resumeIfNeeded();
      buildBars();
      return true;
    } catch (err) {
      // Never leave the element routed into a dead-end graph: if the source
      // node exists, wire it straight to the destination so audio keeps
      // playing; the visualizer just stays off.
      try { if (source && ctx) source.connect(ctx.destination); } catch { /* ignore */ }
      analyser = null;
      freqData = null;
      unsupported = true;
      console.warn('Now-playing visualizer unavailable:', err);
      return false;
    }
  }

  function renderFrame() {
    frameId = null;
    if (!running) return;
    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      levels = computeBarLevels(freqData, bars.length, levels);
      for (let i = 0; i < bars.length; i++) {
        const style = barStyleForLevel(levels[i]);
        bars[i].style.transform = style.transform;
        bars[i].style.opacity = style.opacity;
      }
    }
    frameId = requestFrame(renderFrame);
  }

  function start() {
    if (prefersReducedMotion() || unsupported || !analyser) return;
    if (container) container.classList.add('live');
    if (running) return;
    running = true;
    frameId = requestFrame(renderFrame);
  }

  function stop() {
    running = false;
    if (frameId !== null) { cancelFrame(frameId); frameId = null; }
    if (container) container.classList.remove('live');
    // Settle bars back to the rest state instead of freezing mid-frame.
    levels = null;
    for (const bar of bars) {
      const style = barStyleForLevel(0);
      bar.style.transform = style.transform;
      bar.style.opacity = style.opacity;
    }
  }

  return {
    ensureContext,
    resumeIfNeeded,
    start,
    stop,
    isRunning: () => running,
    isSupported: () => !unsupported,
    hasContext: () => Boolean(ctx)
  };
}
