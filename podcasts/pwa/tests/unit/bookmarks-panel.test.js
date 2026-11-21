import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createBookmarksPanel } from '../../src/ui/bookmarks-panel.js';

test('bookmark saves the episode and position displayed when the note opens', (t) => {
    const dom = new JSDOM(`<div id="bookmarks-list"></div><div id="bookmark-modal">
        <span id="bookmark-position-text"></span><span id="bookmark-context"></span>
        <input id="bookmark-note-input"><button id="save-bookmark"></button>
        <button id="cancel-bookmark"></button></div>`);
    globalThis.document = dom.window.document;
    t.after(() => { delete globalThis.document; dom.window.close(); });
    let episode = 'show-1';
    let line = 3;
    let state = {};
    const panel = createBookmarksPanel({
        loadState: () => state,
        saveAppState: updated => { state = updated; },
        getEpisodeKey: () => episode,
        getDialogueLines: () => Array.from({ length: 10 }, (_, i) => ({ text: `Line ${i + 1}` })),
        getCurrentLineIndex: () => line
    });
    panel.bind();
    panel.render();
    document.getElementById('add-bookmark-btn').click();
    assert.equal(document.getElementById('bookmark-position-text').textContent, 'Line 4 of 10');
    episode = 'show-2';
    line = 7;
    document.getElementById('bookmark-note-input').value = 'A note';
    document.getElementById('save-bookmark').click();
    assert.equal(state.bookmarks['show-1'][0].lineIndex, 3);
    assert.equal(state.bookmarks['show-1'][0].note, 'A note');
    assert.equal(state.bookmarks['show-2'], undefined);
});
