// Micro-interaction helpers: View Transitions between screens, skip-button
// ripple + seconds flyout, and a shared reduced-motion check. Every effect
// is <= 200ms and becomes a no-op when the user prefers reduced motion.
// DOM factories take their document from the target element so the module
// stays unit-testable under jsdom.

export function prefersReducedMotion(win) {
  const w = win || globalThis;
  try {
    return Boolean(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

// Run a view-swapping DOM mutation inside a View Transition when supported
// (and motion is allowed); otherwise apply it immediately. Returns true when
// a transition was started, false when the change was applied directly.
export function transitionViews(apply, doc) {
  const d = doc || globalThis.document;
  if (d && typeof d.startViewTransition === 'function' && !prefersReducedMotion(d.defaultView)) {
    d.startViewTransition(apply);
    return true;
  }
  apply();
  return false;
}

// Format a signed skip delta for the flyout: -30 → "−30s", 10 → "+10s".
export function formatSkipDelta(seconds) {
  const n = Math.round(Number(seconds) || 0);
  return `${n < 0 ? '−' : '+'}${Math.abs(n)}s`;
}

// Expanding ripple from the press point. Requires the button to be
// position:relative with overflow:hidden (see .ctrl-btn CSS). The element
// removes itself on animationend, with a timer as a safety net for
// environments that never fire CSS animation events.
export function spawnRipple(button, event) {
  if (!button || !button.ownerDocument) return null;
  const doc = button.ownerDocument;
  if (prefersReducedMotion(doc.defaultView)) return null;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height, 1);
  const hasPoint = event && Number.isFinite(event.clientX) &&
    (event.clientX !== 0 || event.clientY !== 0);
  const x = hasPoint ? event.clientX - rect.left : rect.width / 2;
  const y = hasPoint ? event.clientY - rect.top : rect.height / 2;
  const ripple = doc.createElement('span');
  ripple.className = 'skip-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;
  ripple.setAttribute('aria-hidden', 'true');
  ripple.addEventListener('animationend', () => ripple.remove());
  setTimeout(() => ripple.remove(), 400);
  button.appendChild(ripple);
  return ripple;
}

// Floating "−30s" / "+10s" label that rises from a skip button and fades.
// Appended to <body> (position:fixed) so the button's overflow:hidden ripple
// clip cannot swallow it.
export function showSkipFlyout(button, seconds) {
  if (!button || !button.ownerDocument) return null;
  const doc = button.ownerDocument;
  if (prefersReducedMotion(doc.defaultView)) return null;
  const rect = button.getBoundingClientRect();
  const fly = doc.createElement('span');
  fly.className = 'skip-flyout';
  fly.textContent = formatSkipDelta(seconds);
  fly.style.left = `${rect.left + rect.width / 2}px`;
  fly.style.top = `${rect.top - 6}px`;
  fly.setAttribute('aria-hidden', 'true');
  fly.addEventListener('animationend', () => fly.remove());
  setTimeout(() => fly.remove(), 400);
  doc.body.appendChild(fly);
  return fly;
}
