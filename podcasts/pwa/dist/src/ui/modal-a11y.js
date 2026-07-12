// Modal accessibility: focus management + ESC/Tab handling for any
// .modal-overlay that toggles the `.show` class. Bound once at startup.

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initModalA11y() {
    const modalReturnFocus = new WeakMap();

    function focusableIn(el) {
        return Array.from(el.querySelectorAll(FOCUSABLE_SELECTOR)).filter((n) => n.offsetParent !== null || n === document.activeElement);
    }

    function onModalShown(modal) {
        modalReturnFocus.set(modal, document.activeElement);
        const first = focusableIn(modal)[0];
        if (first) {
            try { first.focus({ preventScroll: true }); } catch (_) { first.focus(); }
        }
    }

    function onModalHidden(modal) {
        const returnTo = modalReturnFocus.get(modal);
        modalReturnFocus.delete(modal);
        if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
            try { returnTo.focus({ preventScroll: true }); } catch (_) { returnTo.focus(); }
        }
    }

    document.querySelectorAll('.modal-overlay').forEach((modal) => {
        const mo = new MutationObserver(() => {
            if (modal.classList.contains('show')) onModalShown(modal);
            else onModalHidden(modal);
        });
        mo.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    // Tab / Shift-Tab focus trap + Escape close for any visible modal.
    document.addEventListener('keydown', (e) => {
        const open = Array.from(document.querySelectorAll('.modal-overlay.show'));
        if (open.length === 0) return;
        const modal = open[open.length - 1];

        if (e.key === 'Escape') {
            // Prefer the modal's explicit cancel/close/dismiss button so its handler runs.
            const closeBtn = modal.querySelector(
                '[id^="cancel-"], [id^="close-"], [id^="dismiss-"]'
            );
            if (closeBtn) {
                e.preventDefault();
                closeBtn.click();
            } else {
                e.preventDefault();
                modal.classList.remove('show');
            }
            return;
        }

        if (e.key === 'Tab') {
            const focusables = focusableIn(modal);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}
