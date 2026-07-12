// Swipe gestures on the player screen: swipe right = large skip back,
// swipe left = large skip forward. Touches that start on the scrubber belong
// to the drag interaction and are never interpreted as swipes.

export function initSwipeGestures({ onSwipeBack, onSwipeForward }) {
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 80;

    document.getElementById('player-view').addEventListener('touchstart', e => {
        // Touches that start on the scrubber belong to the drag interaction —
        // never interpret them as a swipe skip.
        if (e.target.closest('#progress-bar')) {
            touchStartX = 0;
            return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.getElementById('player-view').addEventListener('touchmove', e => {
        if (!touchStartX) return;
        const diffX = e.touches[0].clientX - touchStartX;
        const diffY = Math.abs(e.touches[0].clientY - touchStartY);

        // Only show hint if horizontal swipe
        if (Math.abs(diffX) > 30 && diffY < 50) {
            if (diffX > 0) {
                document.getElementById('swipe-left').classList.add('show');
                document.getElementById('swipe-right').classList.remove('show');
            } else {
                document.getElementById('swipe-right').classList.add('show');
                document.getElementById('swipe-left').classList.remove('show');
            }
        }
    }, { passive: true });

    document.getElementById('player-view').addEventListener('touchend', e => {
        document.getElementById('swipe-left').classList.remove('show');
        document.getElementById('swipe-right').classList.remove('show');

        if (!touchStartX) return;
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY);

        if (Math.abs(diffX) > swipeThreshold && diffY < 50) {
            if (diffX > 0) {
                onSwipeBack(); // Swipe right = large skip back
            } else {
                onSwipeForward(); // Swipe left = large skip forward
            }
        }
        touchStartX = 0;
    }, { passive: true });
}
