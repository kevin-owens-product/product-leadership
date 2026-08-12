// Chapters: the chapter list panel, the current-chapter badge, and the tick
// marks on the scrubber track.

import { renderChapterItem } from './render.js?v=2.3.0%2B20260811T211033Z';
import { activateCardWithKeyboard } from './dom.js?v=2.3.0%2B20260811T211033Z';

export function createChaptersPanel({
    getChapters,
    getCurrentLineIndex,
    getDialogueLineCount,
    getLineOffsets,
    getEpisodeAudioDuration,
    jumpToLine
}) {
    function render() {
        const container = document.getElementById('chapters-list');
        container.innerHTML = '';

        const chapters = getChapters();
        if (chapters.length === 0) {
            container.innerHTML = '<div class="no-items">No chapters found</div>';
            return;
        }

        chapters.forEach((chap, idx) => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.dataset.index = idx;
            item.tabIndex = 0;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `Play chapter ${idx + 1}: ${chap.title}`);

            renderChapterItem(item, chap, idx);

            const activate = () => {
                jumpToLine(chap.lineIndex, true);
            };
            item.addEventListener('click', activate);
            activateCardWithKeyboard(item, activate);

            container.appendChild(item);
        });

        updateCurrent();
    }

    function updateCurrent() {
        const chapters = getChapters();
        const currentLineIndex = getCurrentLineIndex();

        // Find current chapter based on line
        let currentChapIdx = 0;
        for (let i = chapters.length - 1; i >= 0; i--) {
            if (currentLineIndex >= chapters[i].lineIndex) {
                currentChapIdx = i;
                break;
            }
        }

        // Update chapter list highlighting
        document.querySelectorAll('.chapter-item').forEach((el, idx) => {
            const isCurrent = idx === currentChapIdx;
            el.classList.toggle('current', isCurrent);
            if (isCurrent) el.setAttribute('aria-current', 'true');
            else el.removeAttribute('aria-current');
        });

        // Update badge
        if (chapters.length > 0 && chapters[currentChapIdx]) {
            document.getElementById('current-chapter-badge').textContent =
                `Chapter ${currentChapIdx + 1}: ${chapters[currentChapIdx].title}`;
        } else {
            document.getElementById('current-chapter-badge').textContent = '';
        }
    }

    // Chapter tick marks on the scrubber track.
    function renderMarkers() {
        const bar = document.getElementById('progress-bar');
        if (!bar) return;
        bar.querySelectorAll('.chapter-marker').forEach((el) => el.remove());
        const chapters = getChapters();
        if (!Array.isArray(chapters) || chapters.length <= 1) return;
        const lineOffsets = getLineOffsets();
        const episodeAudioDuration = getEpisodeAudioDuration();
        const total = episodeAudioDuration > 0
            ? episodeAudioDuration
            : (lineOffsets.length > 0 ? lineOffsets[lineOffsets.length - 1] : 0);
        const lineCount = getDialogueLineCount() || 1;
        chapters.forEach((chap, idx) => {
            if (idx === 0) return; // skip the marker at 0%
            let pct;
            if (total > 0 && Number.isInteger(chap.lineIndex) && chap.lineIndex < lineOffsets.length) {
                pct = (lineOffsets[chap.lineIndex] / total) * 100;
            } else if (Number.isInteger(chap.lineIndex)) {
                pct = (chap.lineIndex / lineCount) * 100;
            } else {
                return;
            }
            if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return;
            const marker = document.createElement('div');
            marker.className = 'chapter-marker';
            marker.style.left = `${pct}%`;
            marker.title = chap.title || `Chapter ${idx + 1}`;
            bar.appendChild(marker);
        });
    }

    return { render, updateCurrent, renderMarkers };
}
