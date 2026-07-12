// Small queue-able toast/notification system. Replaces the silent
// `catch {}` / console.warn-only error paths: audio load failures, offline
// download failures, and app-update events all surface here, each with an
// optional action button (usually "Retry").
//
// Behavior:
//   - Up to `maxVisible` toasts on screen; further toasts queue FIFO and
//     appear as earlier ones dismiss.
//   - Auto-dismiss after a duration (longer when there's an action button);
//     `duration: 0` makes a toast sticky until acted on or dismissed.
//   - Duplicate messages don't stack — an identical visible toast just gets
//     its auto-dismiss timer refreshed (so a storm of the same error shows
//     one toast, not twenty).
//   - Each toast is `role="status"` so screen readers announce it politely;
//     entry animation is CSS-only and disabled under prefers-reduced-motion.

export const TOAST_DURATION_MS = 5000;
export const TOAST_ACTION_DURATION_MS = 8000;
export const MAX_VISIBLE_TOASTS = 2;

export function createToastManager({
  container,
  maxVisible = MAX_VISIBLE_TOASTS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id)
} = {}) {
  const pending = [];
  const visible = [];

  function resolveDuration(duration, hasAction) {
    if (duration === 0) return 0; // sticky
    if (Number.isFinite(duration) && duration > 0) return duration;
    return hasAction ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS;
  }

  function startTimer(entry) {
    if (!entry.duration) return;
    entry.timerId = setTimer(() => dismiss(entry), entry.duration);
  }

  function stopTimer(entry) {
    if (entry.timerId !== null) {
      clearTimer(entry.timerId);
      entry.timerId = null;
    }
  }

  function present(entry) {
    const doc = container.ownerDocument;
    const el = doc.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');

    const msg = doc.createElement('span');
    msg.className = 'toast-message';
    msg.textContent = entry.message;
    el.appendChild(msg);

    if (entry.actionLabel) {
      const action = doc.createElement('button');
      action.type = 'button';
      action.className = 'toast-action';
      action.textContent = entry.actionLabel;
      action.addEventListener('click', () => {
        dismiss(entry);
        if (typeof entry.onAction === 'function') entry.onAction();
      });
      el.appendChild(action);
    }

    const close = doc.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => dismiss(entry));
    el.appendChild(close);

    entry.el = el;
    visible.push(entry);
    container.appendChild(el);
    startTimer(entry);
  }

  function dismiss(entry) {
    stopTimer(entry);
    const pendingIdx = pending.indexOf(entry);
    if (pendingIdx >= 0) {
      pending.splice(pendingIdx, 1);
      return;
    }
    const idx = visible.indexOf(entry);
    if (idx < 0) return;
    visible.splice(idx, 1);
    if (entry.el && entry.el.parentNode) {
      entry.el.parentNode.removeChild(entry.el);
    }
    entry.el = null;
    while (pending.length > 0 && visible.length < maxVisible) {
      present(pending.shift());
    }
  }

  function show(message, { actionLabel = null, onAction = null, duration } = {}) {
    const text = String(message == null ? '' : message).trim();
    if (!text || !container) return { dismiss: () => {} };

    // Refresh instead of stacking an identical visible toast.
    const existing = visible.find((t) => t.message === text);
    if (existing) {
      stopTimer(existing);
      startTimer(existing);
      return { dismiss: () => dismiss(existing) };
    }

    const entry = {
      message: text,
      actionLabel,
      onAction,
      duration: resolveDuration(duration, Boolean(actionLabel)),
      el: null,
      timerId: null
    };
    if (visible.length >= maxVisible) {
      pending.push(entry);
    } else {
      present(entry);
    }
    return { dismiss: () => dismiss(entry) };
  }

  function dismissAll() {
    pending.length = 0;
    while (visible.length > 0) dismiss(visible[visible.length - 1]);
  }

  return {
    show,
    dismissAll,
    visibleCount: () => visible.length,
    pendingCount: () => pending.length
  };
}
