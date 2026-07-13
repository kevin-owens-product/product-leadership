// Transcript panel: line rendering, follow-mode auto-scroll (with the
// "resync" pill), tap/keyboard seek, and transcript search with match
// navigation.

import { applyLiteralHighlight, includesQuery } from '../search/transcript-search.js?v=2.3.0%2B20260713T021738Z';
import { renderTranscriptLine } from './render.js?v=2.3.0%2B20260713T021738Z';
import { createTranscriptFollow } from './transcript-follow.js?v=2.3.0%2B20260713T021738Z';
import { prefersReducedMotion } from './motion.js?v=2.3.0%2B20260713T021738Z';

export function createTranscriptPanel({ getDialogueLines, onSeekLine, onAfterRender }) {
    let searchMatches = [];
    let searchIndex = 0;

    // Follow mode: the transcript tracks the current line until the user
    // scrolls away, which surfaces the "resync" pill; tapping the pill (or any
    // line) puts the transcript back in follow mode.
    const transcriptFollow = createTranscriptFollow({
        container: document.getElementById('transcript-content'),
        pill: document.getElementById('transcript-resync'),
        onResync: () => scrollCurrentIntoView(true)
    });

    function scrollCurrentIntoView(force = false) {
        if (!force && !transcriptFollow.isFollowing()) return;
        const currentEl = document.querySelector('.transcript-line.current');
        if (!currentEl) return;
        transcriptFollow.notifyAutoScroll();
        currentEl.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'center'
        });
    }

    function render() {
        const content = document.getElementById('transcript-content');
        content.innerHTML = '';
        // New episode content: return to follow mode with a fresh scroll baseline.
        transcriptFollow.resync();

        getDialogueLines().forEach((line, index) => {
            const div = document.createElement('div');
            div.className = `transcript-line ${line.type}`;
            div.dataset.index = index;
            // Each line is a real control: screen readers announce speaker + text
            // and can activate it to seek (keyboard handled by the delegated
            // keydown on the container below).
            div.tabIndex = 0;
            div.setAttribute('role', 'button');

            renderTranscriptLine(div, line);
            div.addEventListener('click', () => onSeekLine(index));
            content.appendChild(div);
        });

        onAfterRender();
    }

    // aria-current mirrors the visual highlight for screen readers.
    function setCurrentLine(currentLineIndex) {
        document.querySelectorAll('.transcript-line').forEach((el, i) => {
            const isCurrent = i === currentLineIndex;
            el.classList.toggle('current', isCurrent);
            if (isCurrent) el.setAttribute('aria-current', 'true');
            else el.removeAttribute('aria-current');
        });
    }

    function search(query) {
        searchMatches = [];
        searchIndex = 0;

        document.querySelectorAll('.transcript-line').forEach(el => {
            el.classList.remove('search-match', 'search-current');
            const textEl = el.querySelector('.text');
            if (textEl) {
                textEl.textContent = textEl.textContent; // Remove highlights
            }
        });
        if (!query) return;

        const queryLower = query.toLowerCase();
        getDialogueLines().forEach((line, index) => {
            if (includesQuery(line.text, queryLower)) {
                searchMatches.push(index);
                const el = document.querySelector(`.transcript-line[data-index="${index}"]`);
                if (el) {
                    el.classList.add('search-match');
                    const textEl = el.querySelector('.text');
                    if (textEl) {
                        applyLiteralHighlight(textEl, query);
                    }
                }
            }
        });

        if (searchMatches.length > 0) {
            highlightSearchResult(0);
        }
    }

    function highlightSearchResult(idx) {
        document.querySelectorAll('.transcript-line.search-current').forEach(el => {
            el.classList.remove('search-current');
        });

        if (searchMatches.length === 0) return;
        searchIndex = (idx + searchMatches.length) % searchMatches.length;

        const lineIdx = searchMatches[searchIndex];
        const el = document.querySelector(`.transcript-line[data-index="${lineIdx}"]`);
        if (el) {
            el.classList.add('search-current');
            // Browsing search results leaves follow mode (the pill offers the way
            // back) so playback auto-scroll doesn't yank the view away.
            transcriptFollow.suspend();
            el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
        }
    }

    function bind() {
        transcriptFollow.bind();

        // Keyboard activation for transcript lines (bound once; lines are
        // re-created per episode).
        document.getElementById('transcript-content').addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const lineEl = event.target.closest('.transcript-line');
            if (!lineEl) return;
            event.preventDefault();
            onSeekLine(parseInt(lineEl.dataset.index, 10));
        });

        document.getElementById('transcript-search-input').addEventListener('input', e => {
            search(e.target.value);
        });
        document.getElementById('search-prev').addEventListener('click', () => highlightSearchResult(searchIndex - 1));
        document.getElementById('search-next').addEventListener('click', () => highlightSearchResult(searchIndex + 1));
    }

    return {
        render,
        setCurrentLine,
        scrollCurrentIntoView,
        resync: () => transcriptFollow.resync(),
        bind
    };
}
