// Share & export: timestamp/episode share links plus bookmark/progress JSON
// exports, all launched from the share modal.

import { buildBookmarksExport, buildProgressExport, downloadJSON } from '../share-export/export.js';

export function createSharePanel({
    loadState,
    getCurrentPodcast,
    getCurrentEpisode,
    getCurrentLineIndex,
    getDialogueLines
}) {
    function bind() {
        document.getElementById('share-btn').addEventListener('click', () => {
            document.getElementById('share-modal').classList.add('show');
        });

        document.getElementById('close-share-modal').addEventListener('click', () => {
            document.getElementById('share-modal').classList.remove('show');
        });

        document.getElementById('share-timestamp-btn').addEventListener('click', () => {
            const currentPodcast = getCurrentPodcast();
            const currentEpisode = getCurrentEpisode();
            const currentLineIndex = getCurrentLineIndex();
            const url = new URL(window.location.href);
            url.searchParams.set('podcast', currentPodcast.id);
            url.searchParams.set('episode', currentEpisode.id);
            url.searchParams.set('line', currentLineIndex);

            if (navigator.share) {
                navigator.share({
                    title: `${currentEpisode.title} - ${currentPodcast.title}`,
                    text: `Listen from line ${currentLineIndex}`,
                    url: url.toString()
                });
            } else {
                navigator.clipboard.writeText(url.toString());
                alert('Link copied to clipboard!');
            }
        });

        document.getElementById('share-episode-btn').addEventListener('click', () => {
            const currentPodcast = getCurrentPodcast();
            const currentEpisode = getCurrentEpisode();
            const url = new URL(window.location.href);
            url.searchParams.set('podcast', currentPodcast.id);
            url.searchParams.set('episode', currentEpisode.id);

            if (navigator.share) {
                navigator.share({
                    title: `${currentEpisode.title} - ${currentPodcast.title}`,
                    text: currentEpisode.subtitle,
                    url: url.toString()
                });
            } else {
                navigator.clipboard.writeText(url.toString());
                alert('Link copied to clipboard!');
            }
        });

        document.getElementById('export-bookmarks-btn').addEventListener('click', () => {
            const currentPodcast = getCurrentPodcast();
            const currentEpisode = getCurrentEpisode();
            const data = buildBookmarksExport({
                state: loadState(),
                currentPodcast,
                currentEpisode,
                dialogueLines: getDialogueLines()
            });
            downloadJSON(`bookmarks-${currentPodcast.id}-${currentEpisode.id}.json`, data);
        });

        document.getElementById('export-progress-btn').addEventListener('click', () => {
            const data = buildProgressExport(loadState());
            downloadJSON('podcast-progress.json', data);
        });
    }

    return { bind };
}
