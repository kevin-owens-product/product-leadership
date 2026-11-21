// Play queue: persisted list of upcoming episodes + the queue panel UI.

import { loadQueue, saveQueue } from '../state/storage.js?v=2.7.3%2B20261121T204056Z';
import { renderQueueItem } from './render.js?v=2.7.3%2B20261121T204056Z';

export function createQueuePanel({ getPodcasts, isCurrentItem, onOpenItem }) {
    const playQueue = loadQueue();

    function contains(podcast, episode) {
        return playQueue.some(item => item?.podcastId === podcast.id && item.episodeNum === episode.id);
    }

    function add(podcast, episode) {
        if (contains(podcast, episode)) return;
        playQueue.push({ podcastId: podcast.id, episodeNum: episode.id, addedAt: Date.now() });
        saveQueue(playQueue);
        update();
    }

    function removeItem(item) {
        const index = playQueue.indexOf(item);
        if (index < 0) return;
        playQueue.splice(index, 1);
        saveQueue(playQueue);
        update();
    }

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
                else onOpenItem(podcast, episode, item);
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
