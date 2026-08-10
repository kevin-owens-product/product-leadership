// Keyboard shortcuts (desktop): Space play/pause, ←/→ seek, ↑/↓ speed, and
// the `?` overlay listing them, plus hardware media keys.
//
// Never fires while typing in a field or when focus is on an interactive
// control (buttons keep their native Space/Enter activation; the scrubber
// slider handles its own arrow keys).

const SHORTCUT_IGNORE_SELECTOR =
    'input, textarea, select, button, a, [contenteditable="true"], [role="slider"], [role="button"]';

export function initKeyboardShortcuts({
    hasEpisode,
    togglePlayPause,
    seekBySeconds,
    getSkipBackward,
    getSkipForward,
    getSpeechRate,
    applySpeechRate,
    playNextEpisode,
    playPreviousEpisode
}) {
    function toggleShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (!modal) return;
        modal.classList.toggle('show');
    }

    document.getElementById('close-shortcuts-modal')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal')?.classList.remove('show');
    });

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target instanceof Element && target.closest(SHORTCUT_IGNORE_SELECTOR)) return;

        if (event.key === '?') {
            event.preventDefault();
            toggleShortcutsModal();
            return;
        }

        // Playback shortcuts stay quiet while any modal is open (the modal focus
        // trap owns the keyboard) or before an episode is loaded.
        if (document.querySelector('.modal-overlay.show')) return;
        if (!hasEpisode()) return;

        switch (event.key) {
            case ' ':
                event.preventDefault();
                void togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                seekBySeconds(-getSkipBackward());
                break;
            case 'ArrowRight':
                event.preventDefault();
                seekBySeconds(getSkipForward());
                break;
            case 'ArrowUp':
                event.preventDefault();
                applySpeechRate(Math.round((getSpeechRate() + 0.1) * 10) / 10);
                break;
            case 'ArrowDown':
                event.preventDefault();
                applySpeechRate(Math.round((getSpeechRate() - 0.1) * 10) / 10);
                break;
        }
    });

    window.addEventListener('keydown', (event) => {
        const key = event.code || event.key;
        if (key === 'MediaPlayPause') {
            event.preventDefault();
            void togglePlayPause();
            return;
        }
        if (key === 'MediaTrackNext') {
            event.preventDefault();
            void playNextEpisode();
            return;
        }
        if (key === 'MediaTrackPrevious') {
            event.preventDefault();
            void playPreviousEpisode();
        }
    });
}
