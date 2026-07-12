// Shared DOM micro-helpers for interactive cards, toggle buttons, and the
// morphing play/pause buttons.

// Enter/Space activates card-like role="button" elements without stealing
// activation from real controls nested inside them.
export function activateCardWithKeyboard(card, callback) {
    card.addEventListener('keydown', (event) => {
        if (event.target.closest('button, input, select, textarea, a')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        callback(event);
    });
}

export function setPressedState(elementOrId, pressed) {
    const el = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
    if (!el) return;
    el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

export function updateToggleButton(id, pressed, labelText) {
    const button = document.getElementById(id);
    if (!button) return;
    button.classList.toggle('active', pressed);
    setPressedState(button, pressed);
    const label = button.querySelector('span');
    if (label) label.textContent = labelText;
}

// Both play/pause buttons (player + mini) share the same morphing SVG icon;
// the `.playing` class drives the CSS cross-morph (≤200ms, disabled under
// prefers-reduced-motion).
export function setPlayButtonState(playing) {
    ['play-btn', 'mini-play-btn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('playing', Boolean(playing));
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    });
}
