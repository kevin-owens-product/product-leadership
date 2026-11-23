// Play queue: persisted list of upcoming episodes + the queue panel UI.

import { loadQueue, saveQueue, withStorageLock } from '../state/storage.js';
import { renderQueueItem } from './render.js';

export function createQueuePanel({ getPodcasts, isCurrentItem, onOpenItem, onExternalChange }) {
    let playQueue = loadQueue();

    function matches(item, podcastId, episodeNum) {
        return item?.podcastId === podcastId && item.episodeNum === episodeNum;
    }

    function contains(podcast, episode) {
        return playQueue.some(item => matches(item, podcast.id, episode.id));
    }

    function add(podcast, episode) {
        return withStorageLock('playQueue', () => {
            playQueue = loadQueue();
            if (contains(podcast, episode)) return;
            playQueue.push({ podcastId: podcast.id, episodeNum: episode.id, addedAt: Date.now() });
            saveQueue(playQueue);
            update();
        });
    }

    function removeItem({ podcastId, episodeNum }) {
        return withStorageLock('playQueue', () => {
            const latest = loadQueue();
            playQueue = latest.filter(item => !matches(item, podcastId, episodeNum));
            if (playQueue.length === latest.length) return;
            saveQueue(playQueue);
            update();
        });
    }

    window.addEventListener('storage', event => {
        if (event.key !== 'playQueue' && event.key !== null) return;
        playQueue = loadQueue();
        update();
        onExternalChange?.();
    });

    function update() {
        const queueList = document.getElementById('queue-list');
        const entries = [];
        for (const item of playQueue) {
            const podcast = getPodcasts().find(p => p.id === item?.podcastId);
            const episode = podcast?.episodes.find(e => e.id === item.episodeNum);
            if (episode) entries.push({ item, podcast, episode });
        }
        if (entries.length === 0) {
            queueList.innerHTML = '<div class="no-items">Queue is empty</div>';
            return;
        }

        queueList.innerHTML = entries.map(({ item, episode, podcast }, index) => {
            return renderQueueItem(item, episode, podcast, isCurrentItem(item), index);
        }).join('');

        queueList.querySelectorAll('.queue-item').forEach((row, index) => {
            const { item, episode, podcast } = entries[index];
            row.addEventListener('click', (e) => {
                if (e.target.closest('.queue-remove')) removeItem(item);
                else onOpenItem(podcast, episode);
            });
        });
    }

    return {
        add,
        contains,
        removeItem,
        update,
        getQueue: () => playQueue
    };
}
