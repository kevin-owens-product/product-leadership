// Bookmarks: per-episode saved positions with notes, stored in app state.

import { renderBookmarkItem } from './render.js?v=2.3.0%2B20260802T162221Z';
import { activateCardWithKeyboard } from './dom.js?v=2.3.0%2B20260802T162221Z';

export function createBookmarksPanel({
    loadState,
    saveAppState,
    getEpisodeKey,
    getDialogueLines,
    getCurrentLineIndex,
    jumpToLine
}) {
    function getBookmarks() {
        const state = loadState();
        return state.bookmarks || {};
    }

    function saveBookmark(epKey, lineIndex, note) {
        const state = loadState();
        if (!state.bookmarks) state.bookmarks = {};
        if (!state.bookmarks[epKey]) state.bookmarks[epKey] = [];

        state.bookmarks[epKey].push({
            lineIndex,
            note: note || '',
            timestamp: Date.now()
        });

        // Sort by line index
        state.bookmarks[epKey].sort((a, b) => a.lineIndex - b.lineIndex);

        saveAppState(state);
    }

    function deleteBookmark(epKey, timestamp) {
        const state = loadState();
        if (state.bookmarks && state.bookmarks[epKey]) {
            state.bookmarks[epKey] = state.bookmarks[epKey].filter(b => b.timestamp !== timestamp);
        }
        saveAppState(state);
    }

    function render() {
        const container = document.getElementById('bookmarks-list');
        container.innerHTML = '';

        // Add bookmark button first
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bookmark-btn';
        addBtn.id = 'add-bookmark-btn';
        addBtn.textContent = '+ Add Bookmark Here';
        addBtn.addEventListener('click', showAddModal);
        container.appendChild(addBtn);

        const epKey = getEpisodeKey();
        if (!epKey) return;

        const bookmarks = getBookmarks();
        const epBookmarks = bookmarks[epKey] || [];

        if (epBookmarks.length === 0) {
            // NOTE: using innerHTML += here re-serializes and re-parses every child,
            // which silently drops the click listener attached to addBtn above.
            // Use appendChild so the listener survives.
            const empty = document.createElement('div');
            empty.className = 'no-items';
            empty.textContent = 'No bookmarks yet';
            container.appendChild(empty);
            return;
        }

        const dialogueLines = getDialogueLines();
        epBookmarks.forEach(bm => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';

            // Get preview text from dialogue
            const line = dialogueLines[bm.lineIndex];
            const preview = line ? line.text.substring(0, 60) + (line.text.length > 60 ? '...' : '') : '';

            renderBookmarkItem(item, bm, preview);

            const bookmarkContent = item.querySelector('.bookmark-content');
            bookmarkContent.addEventListener('click', () => {
                jumpToLine(bm.lineIndex, true);
            });
            // .bookmark-content is rendered as role="button" tabindex="0".
            activateCardWithKeyboard(bookmarkContent, () => jumpToLine(bm.lineIndex, true));

            item.querySelector('.bookmark-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBookmark(epKey, bm.timestamp);
                render();
            });

            container.appendChild(item);
        });
    }

    function showAddModal() {
        const modal = document.getElementById('bookmark-modal');
        const dialogueLines = getDialogueLines();
        const currentLineIndex = getCurrentLineIndex();
        document.getElementById('bookmark-position-text').textContent =
            `Line ${currentLineIndex + 1} of ${dialogueLines.length}`;

        const line = dialogueLines[currentLineIndex];
        document.getElementById('bookmark-context').textContent =
            line ? `${line.speaker ? line.speaker + ': ' : ''}${line.text.substring(0, 100)}...` : '';

        document.getElementById('bookmark-note-input').value = '';
        modal.classList.add('show');
        document.getElementById('bookmark-note-input').focus();
    }

    function bind() {
        document.getElementById('save-bookmark').addEventListener('click', () => {
            const epKey = getEpisodeKey();
            if (!epKey) return;
            const note = document.getElementById('bookmark-note-input').value;
            saveBookmark(epKey, getCurrentLineIndex(), note);
            document.getElementById('bookmark-modal').classList.remove('show');
            render();
        });

        document.getElementById('cancel-bookmark').addEventListener('click', () => {
            document.getElementById('bookmark-modal').classList.remove('show');
        });
    }

    return { render, bind };
}
