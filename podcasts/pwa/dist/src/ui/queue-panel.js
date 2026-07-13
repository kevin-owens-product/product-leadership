// Play queue: persisted list of upcoming episodes + the queue panel UI.

import { loadQueue, saveQueue } from '../state/storage.js?v=2.3.0%2B20260713T021738Z';
import { renderQueueItem } from './render.js?v=2.3.0%2B20260713T021738Z';
import { activateCardWithKeyboard } from './dom.js?v=2.3.0%2B20260713T021738Z';

export function createQueuePanel({ getPodcasts, isCurrentItem, onOpenItem }) {
    const playQueue = loadQueue();

    function add(podcast, episode) {
        playQueue.push({ podcastId: podcast.id, episodeNum: episode.id, addedAt: Date.now() });
        saveQueue(playQueue);
        update();
    }

    function removeAt(index) {
        playQueue.splice(index, 1);
        saveQueue(playQueue);
        update();
    }

    function update() {
        const queueList = document.getElementById('queue-list');
        if (playQueue.length === 0) {
            queueList.innerHTML = '<div class="no-items">Queue is empty</div>';
            return;
        }

        queueList.innerHTML = playQueue.map((item, index) => {
            const podcast = getPodcasts().find(p => p.id === item.podcastId);
            const episode = podcast?.episodes.find(e => e.id === item.episodeNum);
            if (!podcast || !episode) return '';

            const isPlaying = isCurrentItem(item);

            return renderQueueItem(item, episode, podcast, isPlaying, index);
        }).join('');

        // Add click + keyboard handlers (items are role="button" divs)
        const openQueueItem = (index) => {
            const queueItem = playQueue[index];
            if (!queueItem) return;
            const podcast = getPodcasts().find(p => p.id === queueItem.podcastId);
            if (!podcast) return;
            const episode = podcast.episodes.find(e => e.id === queueItem.episodeNum);
            if (!episode) return;
            onOpenItem(podcast, episode);
        };
        queueList.querySelectorAll('.queue-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('queue-remove')) {
                    openQueueItem(index);
                }
            });
            activateCardWithKeyboard(item, () => openQueueItem(index));
        });

        queueList.querySelectorAll('.queue-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeAt(parseInt(btn.dataset.index));
            });
        });
    }

    return {
        add,
        removeAt,
        update,
        getQueue: () => playQueue
    };
}
