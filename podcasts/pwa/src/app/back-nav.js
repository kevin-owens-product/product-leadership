// Android hardware back / edge-swipe navigates browser history. A single-page
// app that never pushes a history entry has nothing to pop, so the gesture
// unloads the page — on an installed PWA that reads as the app crashing rather
// than as navigation. The fix is to own an entry the gesture can consume.
//
// We keep exactly *one* sentinel entry on the stack whenever the app has
// somewhere to go back to. popstate consumes it, we perform one level of
// in-app back, then re-arm if there is still somewhere to go. The stack
// therefore never grows past two entries no matter how deep the user is, and
// the last back — the one taken at the root screen — finds no sentinel and
// leaves the app, which is what a user expects from the root of an app.

const SENTINEL = 'podlearn-back';

/**
 * @param {object} opts
 * @param {() => boolean} opts.canGoBack  Is there anything to go back to?
 * @param {() => void} opts.goBack        Perform exactly one level of back.
 * @param {Window} [opts.win]
 * @returns {{ sync: () => void, destroy: () => void }} `sync` reconciles the
 *   sentinel with the current UI; call it after anything that changes depth.
 */
export function initBackNav({ canGoBack, goBack, win = typeof window !== 'undefined' ? window : null } = {}) {
    const noop = { sync: () => {}, destroy: () => {} };
    if (!win || !win.history || typeof win.history.pushState !== 'function') return noop;

    let armed = false;
    // Set while we pop our own sentinel during cleanup, so the popstate that
    // results is recognised as bookkeeping rather than a user gesture.
    let selfPopping = false;

    function arm() {
        if (armed) return;
        win.history.pushState({ [SENTINEL]: true }, '');
        armed = true;
    }

    // Leaving the app at the root screen with a stale sentinel still on the
    // stack costs the user a dead back press before the app will close, so
    // drop it as soon as there is nothing left to go back to.
    function disarm() {
        if (!armed) return;
        selfPopping = true;
        armed = false;
        win.history.back();
    }

    function sync() {
        if (canGoBack()) arm();
        else disarm();
    }

    function onPopState() {
        // Whatever entry we owned is already gone by the time this runs.
        armed = false;
        if (selfPopping) {
            selfPopping = false;
            return;
        }
        if (!canGoBack()) return; // At the root: let the browser leave.
        goBack();
        sync();
    }

    win.addEventListener('popstate', onPopState);
    return {
        sync,
        destroy() {
            win.removeEventListener('popstate', onPopState);
        }
    };
}

/**
 * Back semantics for the player, in the order a user expects to unwind them.
 * Deliberately the same precedence Escape already uses for overlays, so the
 * hardware gesture and the keyboard agree.
 *
 * @param {Document} doc
 * @returns {'overlay'|'player'|'list'|null} What a back press would undo.
 */
export function backTarget(doc) {
    if (doc.querySelector('.modal-overlay.show')) return 'overlay';
    if (doc.getElementById('player-view')?.classList.contains('active')) return 'player';
    if (doc.getElementById('list-view')?.classList.contains('active')) return 'list';
    return null;
}

/**
 * Undo exactly one level. Overlays close through their own dismiss control
 * where they have one, so their handlers run (a modal that only had its class
 * stripped would skip whatever cleanup its close button does).
 *
 * @param {Document} doc
 */
export function performBack(doc) {
    switch (backTarget(doc)) {
        case 'overlay': {
            const open = doc.querySelectorAll('.modal-overlay.show');
            const modal = open[open.length - 1];
            const dismiss = modal.querySelector('[id^="cancel-"], [id^="close-"], [id^="dismiss-"]');
            if (dismiss) dismiss.click();
            else modal.classList.remove('show');
            return;
        }
        case 'player':
            doc.getElementById('back-to-list')?.click();
            return;
        case 'list':
            doc.getElementById('back-to-podcasts')?.click();
            return;
        default:
    }
}
