// Continuous-audio playback. A single shared <audio> element is bound to the
// episode's combined.mp3 so iOS/Android see uninterrupted media playback (works
// in background and on lockscreen). The dialogue UI tracks the current line by
// mapping audio.currentTime through a precomputed lineOffsets array.
//
// Falls back to per-chunk playback (one Audio per dialogue line) when the
// manifest doesn't ship a combined.mp3 or per-line durations — used as a
// graceful degradation path during the rollout.

export function createSpeechPlayers({ getSpeechRate }) {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.playsInline = true;
  if (typeof audio.setAttribute === 'function') {
    audio.setAttribute('playsinline', 'playsinline');
  }
  audio.crossOrigin = 'anonymous';

  let lineOffsets = [];      // cumulative seconds per dialogue line (length === N lines)
  let totalDuration = 0;     // sum of line durations (seconds)
  let activeChunkAudio = null; // for the legacy chunked fallback

  const handlers = {
    timeupdate: [],
    ended: [],
    play: [],
    pause: [],
    error: [],
    linechange: [],
    progress: []
  };
  let lastEmittedLine = -1;

  function on(event, handler) {
    if (handlers[event]) handlers[event].push(handler);
  }

  function emit(event, ...args) {
    const list = handlers[event];
    if (!list) return;
    for (const h of list) {
      try { h(...args); } catch (err) { console.error(`audio handler ${event} threw:`, err); }
    }
  }

  function syncRate() {
    const rate = Math.max(0.5, Math.min(4, Number(getSpeechRate()) || 1));
    if (Math.abs(audio.playbackRate - rate) > 0.01) {
      try { audio.playbackRate = rate; } catch { /* ignore */ }
    }
  }

  function lineFromTime(t) {
    if (lineOffsets.length === 0) return 0;
    let lo = 0;
    let hi = lineOffsets.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lineOffsets[mid] <= t) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return ans;
  }

  const addAudioListener = (ev, fn) => {
    if (typeof audio.addEventListener === 'function') audio.addEventListener(ev, fn);
  };

  addAudioListener('timeupdate', () => {
    syncRate();
    const t = audio.currentTime || 0;
    const line = lineFromTime(t);
    if (line !== lastEmittedLine) {
      lastEmittedLine = line;
      emit('linechange', line, t);
    }
    emit('timeupdate', t, audio.duration || totalDuration);
  });
  addAudioListener('ended', () => emit('ended'));
  // Buffered-range changes (used by the scrubber's buffered indicator).
  addAudioListener('progress', () => emit('progress'));
  addAudioListener('play', () => emit('play'));
  addAudioListener('pause', () => emit('pause'));
  addAudioListener('error', () => emit('error', audio.error));

  // ---- continuous-audio mode ----

  function setEpisode({ combinedUrl, lineOffsets: offsets, totalDuration: dur } = {}) {
    lineOffsets = Array.isArray(offsets) ? offsets.slice() : [];
    totalDuration = typeof dur === 'number' ? dur : (lineOffsets.length > 0 ? lineOffsets[lineOffsets.length - 1] : 0);
    lastEmittedLine = -1;
    if (combinedUrl) {
      if (audio.src !== combinedUrl) {
        audio.src = combinedUrl;
        try { audio.load(); } catch { /* ignore */ }
      }
    } else {
      try { audio.pause(); } catch { /* ignore */ }
      if (typeof audio.removeAttribute === 'function') {
        audio.removeAttribute('src');
      } else {
        audio.src = '';
      }
      try { audio.load(); } catch { /* ignore */ }
    }
    syncRate();
  }

  function isContinuousReady() {
    return Boolean(audio.src) && lineOffsets.length > 0;
  }

  function play() {
    syncRate();
    const promise = audio.play();
    return promise && typeof promise.then === 'function' ? promise : Promise.resolve();
  }

  function pause() {
    try { audio.pause(); } catch { /* ignore */ }
  }

  function stop() {
    try { audio.pause(); } catch { /* ignore */ }
    try { audio.currentTime = 0; } catch { /* ignore */ }
  }

  function seek(time) {
    const t = Math.max(0, Number(time) || 0);
    const cap = audio.duration || totalDuration || t;
    try { audio.currentTime = Math.min(cap, t); } catch { /* ignore */ }
  }

  function seekToLine(index) {
    if (lineOffsets.length === 0) return;
    const safe = Math.max(0, Math.min(lineOffsets.length - 1, index | 0));
    seek(lineOffsets[safe]);
  }

  function getCurrentLine() {
    return lineFromTime(audio.currentTime || 0);
  }

  function getCurrentTime() {
    return audio.currentTime || 0;
  }

  function getDuration() {
    return totalDuration || audio.duration || 0;
  }

  function isPaused() {
    return audio.paused;
  }

  function setRate(rate) {
    const r = Math.max(0.5, Math.min(4, Number(rate) || 1));
    try { audio.playbackRate = r; } catch { /* ignore */ }
  }

  // ---- legacy chunked fallback (if no combined.mp3 / durations) ----

  function stopCurrentSpeech() {
    // Only touch the shared element if it's actually engaged — otherwise
    // legacy callers (and unit-test mocks that count pause()s) would see a
    // spurious pause every time stopCurrentSpeech is called.
    if (audio.src && !audio.paused) stop();
    if (activeChunkAudio) {
      try { activeChunkAudio.pause(); } catch { /* ignore */ }
      activeChunkAudio.src = '';
      activeChunkAudio = null;
    }
  }

  function pauseCurrentSpeech() {
    if (audio.src && !audio.paused) pause();
    if (activeChunkAudio && !activeChunkAudio.paused) {
      try { activeChunkAudio.pause(); } catch { /* ignore */ }
    }
  }

  function resumeCurrentSpeech() {
    if (audio.src && audio.paused) void play();
    if (activeChunkAudio && activeChunkAudio.paused) {
      const p = activeChunkAudio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  function playGeneratedAudio(url) {
    return new Promise((resolve, reject) => {
      const chunk = new Audio(url);
      chunk.preload = 'auto';
      chunk.playbackRate = Math.max(0.5, Math.min(4, Number(getSpeechRate()) || 1));
      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        if (activeChunkAudio === chunk) activeChunkAudio = null;
        if (value === undefined) fn(); else fn(value);
      };
      chunk.onended = () => settle(resolve);
      chunk.onerror = () => settle(reject, new Error(`Failed to play ${url}`));
      activeChunkAudio = chunk;
      const startPromise = chunk.play();
      if (startPromise && typeof startPromise.catch === 'function') {
        startPromise.catch((err) => settle(reject, err));
      }
    });
  }

  async function speak(text, speaker, options = {}) {
    if (!options || !options.audioUrl) {
      throw new Error(`Missing generated Supertonic audio for ${speaker || 'line'}: ${String(text || '').slice(0, 80)}`);
    }
    return playGeneratedAudio(options.audioUrl);
  }

  return {
    // continuous mode
    setEpisode,
    isContinuousReady,
    play,
    pause,
    stop,
    seek,
    seekToLine,
    getCurrentLine,
    getCurrentTime,
    getDuration,
    isPaused,
    setRate,
    on,
    audio,
    // legacy chunked fallback
    speak,
    stopCurrentSpeech,
    pauseCurrentSpeech,
    resumeCurrentSpeech,
    playGeneratedAudio
  };
}
