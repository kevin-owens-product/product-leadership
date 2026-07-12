// Draggable scrubber for the player progress bar. Pointer events drive a
// drag-to-preview / commit-on-release interaction (Overcast-style); keyboard
// arrows do fine seeks. Pure math helpers are exported separately so they can
// be unit-tested headlessly.

export function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Map a pointer clientX to a 0..1 fraction of the bar rect.
export function fractionFromClientX(clientX, rect) {
  if (!rect || !(rect.width > 0)) return 0;
  return clamp01((clientX - rect.left) / rect.width);
}

// Keyboard interaction for the slider role. Returns:
//   { type: 'nudge', seconds }    — fine seek by N seconds (sign = direction)
//   { type: 'fraction', fraction } — absolute jump (Home/End)
//   null — key not handled
export function scrubKeyAction(key, shiftKey = false) {
  const fine = shiftKey ? 1 : 5;
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return { type: 'nudge', seconds: -fine };
    case 'ArrowRight':
    case 'ArrowUp':
      return { type: 'nudge', seconds: fine };
    case 'Home':
      return { type: 'fraction', fraction: 0 };
    case 'End':
      return { type: 'fraction', fraction: 1 };
    default:
      return null;
  }
}

// Given a TimeRanges-like object, return the buffered-until fraction for the
// range containing currentTime (0 when nothing relevant is buffered).
export function bufferedEndFraction(buffered, duration, currentTime = 0) {
  if (!buffered || typeof buffered.length !== 'number') return 0;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  for (let i = 0; i < buffered.length; i += 1) {
    let start;
    let end;
    try {
      start = buffered.start(i);
      end = buffered.end(i);
    } catch {
      return 0;
    }
    // Small tolerance so a range starting a hair after 0 still counts.
    if (start <= currentTime + 0.5 && end >= currentTime) {
      return clamp01(end / duration);
    }
  }
  return 0;
}

export function formatScrubTime(totalSeconds) {
  let t = Number(totalSeconds);
  if (!Number.isFinite(t) || t < 0) t = 0;
  const total = Math.round(t);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const m = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const s = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${m}:${s}` : `${m}:${s}`;
}

// Wire the scrubber DOM. `bar` is the track (role="slider"), `fill` the
// played-portion element, `handle` the thumb, `bubble` the floating time
// preview. Callbacks:
//   getFraction()          -> current playback position as 0..1
//   formatLabel(fraction)  -> preview/aria text for a position
//   onCommit(fraction)     -> user released a drag / Home/End key
//   onNudge(seconds)       -> arrow-key fine seek
export function createScrubber({ bar, fill, handle, bubble, getFraction, formatLabel, onCommit, onNudge }) {
  if (!bar) return { update: () => {}, isScrubbing: () => false };

  let dragging = false;
  let dragFraction = 0;

  function paint(fraction, label) {
    const pct = clamp01(fraction) * 100;
    if (fill) fill.style.width = `${pct}%`;
    if (handle) handle.style.left = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    if (label) bar.setAttribute('aria-valuetext', label);
  }

  function showBubble(fraction, label) {
    if (!bubble) return;
    bubble.hidden = false;
    bubble.textContent = label;
    bubble.style.left = `${clamp01(fraction) * 100}%`;
  }

  function hideBubble() {
    if (bubble) bubble.hidden = true;
  }

  function previewAt(clientX) {
    dragFraction = fractionFromClientX(clientX, bar.getBoundingClientRect());
    const label = formatLabel(dragFraction);
    paint(dragFraction, label);
    showBubble(dragFraction, label);
  }

  function endDrag(commit) {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('scrubbing');
    hideBubble();
    if (commit) {
      onCommit(dragFraction);
    } else {
      const fraction = getFraction();
      paint(fraction, formatLabel(fraction));
    }
  }

  bar.addEventListener('pointerdown', (e) => {
    // Primary button / touch only.
    if (typeof e.button === 'number' && e.button !== 0) return;
    dragging = true;
    bar.classList.add('scrubbing');
    if (typeof bar.setPointerCapture === 'function') {
      try { bar.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    previewAt(e.clientX);
    if (typeof e.preventDefault === 'function') e.preventDefault();
  });

  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    previewAt(e.clientX);
  });

  bar.addEventListener('pointerup', () => endDrag(true));
  bar.addEventListener('pointercancel', () => endDrag(false));

  bar.addEventListener('keydown', (e) => {
    const action = scrubKeyAction(e.key, e.shiftKey);
    if (!action) return;
    e.preventDefault();
    if (action.type === 'nudge') {
      onNudge(action.seconds);
    } else {
      onCommit(action.fraction);
    }
  });

  return {
    // Called from playback timeupdate; ignored mid-drag so the preview wins.
    update(fraction, label) {
      if (dragging) return;
      paint(fraction, label || formatLabel(fraction));
    },
    isScrubbing: () => dragging
  };
}
