// Library screens: the podcasts home grid and the per-show episode list,
// including search, status filters, and sorting.

import { updateVersionBadge } from '../app/version.js?v=2.3.0%2B20260713T101637Z';
import { renderPodcastCard, renderEpisodeCard } from './render.js?v=2.3.0%2B20260713T101637Z';
import { activateCardWithKeyboard } from './dom.js?v=2.3.0%2B20260713T101637Z';

export function createLibrary({
    getPodcasts,
    isLoaded,
    loadState,
    getCurrentPodcast,
    downloads,
    onOpenPodcast,
    onOpenEpisode
}) {
    let currentFilter = 'all';
    let currentSort = 'default';

    // Content-shaped skeleton placeholders (same markup as the initial
    // index.html state; see .skeleton-* in components.css).
    function skeletonCards(count, { art = true } = {}) {
        const card = `
            <div class="skeleton-card${art ? '' : ' row'}" aria-hidden="true">
                ${art ? '<div class="skeleton-block skeleton-art"></div>' : ''}
                <div class="skeleton-lines">
                    ${art ? '' : '<div class="skeleton-block skeleton-line half"></div>'}
                    <div class="skeleton-block skeleton-line title"></div>
                    <div class="skeleton-block skeleton-line wide"></div>
                    ${art ? '<div class="skeleton-block skeleton-line half"></div>' : ''}
                </div>
            </div>`;
        return card.repeat(count);
    }

    function renderPodcastsList(filter = '') {
        // Update version badge
        updateVersionBadge();

        const podcasts = getPodcasts();
        if (podcasts.length === 0) {
            if (!isLoaded()) {
                document.getElementById('podcasts-list').innerHTML =
                    `<div role="status" aria-label="Loading podcasts">${skeletonCards(3)}</div>`;
                document.getElementById('podcast-count').textContent = 'Loading...';
            } else {
                document.getElementById('podcasts-list').innerHTML = '<p class="loading-text">No podcasts found. Try refreshing.</p>';
                document.getElementById('podcast-count').textContent = '0 podcasts loaded';
            }
            return;
        }

        // Show podcast count
        const totalEpisodes = podcasts.reduce((sum, p) => sum + p.episodes.length, 0);
        document.getElementById('podcast-count').textContent = `${podcasts.length} podcasts · ${totalEpisodes} episodes`;

        const state = loadState();
        const listEl = document.getElementById('podcasts-list');
        listEl.innerHTML = '';

        const filterLower = filter.toLowerCase();

        let matched = 0;
        podcasts.forEach(podcast => {
            if (filter && !podcast.title.toLowerCase().includes(filterLower) &&
                !podcast.subtitle.toLowerCase().includes(filterLower)) {
                return;
            }
            matched++;

            // Calculate podcast progress
            let totalProgress = 0;
            const epCount = podcast.episodes.length;
            podcast.episodes.forEach(ep => {
                const epKey = `${podcast.id}-${ep.id}`;
                const progress = state.episodeProgress?.[epKey] || { percent: 0 };
                const isComplete = state.completedEpisodes?.includes(epKey);
                totalProgress += isComplete ? 100 : progress.percent;
            });
            const avgProgress = epCount > 0 ? Math.round(totalProgress / epCount) : 0;

            const card = document.createElement('div');
            card.className = 'podcast-card';
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            // Lets the home←list shared-element morph find its landing card.
            card.dataset.podcastId = podcast.id;
            // No aria-label: the accessible name comes from the card's visible
            // content (title, subtitle, counts), so what sighted users see is
            // exactly what screen readers announce (WCAG 2.5.3 label-in-name).
            renderPodcastCard(card, podcast, epCount, avgProgress);

            // The card's artwork tile seeds the card→header morph.
            const open = () => onOpenPodcast(podcast, card.querySelector('.podcast-icon'));
            card.addEventListener('click', open);
            activateCardWithKeyboard(card, open);
            listEl.appendChild(card);
        });

        if (filter && matched === 0) {
            const empty = document.createElement('div');
            empty.className = 'no-items';
            empty.textContent = `No podcasts match "${filter}".`;
            listEl.appendChild(empty);
        }

        // Add "Create Podcast" card
        const addCard = document.createElement('div');
        addCard.className = 'add-podcast-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', 'Create your own podcast');
        addCard.innerHTML = `
        <div class="add-podcast-icon">+</div>
        <div class="add-podcast-text">Create Your Own Podcast</div>
    `;
        const openCreateModal = () => {
            document.getElementById('create-modal').classList.add('show');
        };
        addCard.addEventListener('click', openCreateModal);
        activateCardWithKeyboard(addCard, openCreateModal);
        listEl.appendChild(addCard);
    }

    function renderEpisodeList(filter = '') {
        const currentPodcast = getCurrentPodcast();
        if (!currentPodcast || !currentPodcast.episodes) {
            document.getElementById('episode-list').innerHTML = '<p class="loading-text">No episodes found</p>';
            return;
        }

        const episodes = currentPodcast.episodes;
        const state = loadState();
        const listEl = document.getElementById('episode-list');
        listEl.innerHTML = '';

        const filterLower = filter.toLowerCase();
        let totalProgress = 0;
        let shown = 0;

        episodes.forEach(ep => {
            // Filter
            if (filter && !ep.title.toLowerCase().includes(filterLower) &&
                !ep.subtitle.toLowerCase().includes(filterLower)) {
                return;
            }
            shown++;

            const epKey = `${currentPodcast.id}-${ep.id}`;
            const progress = state.episodeProgress?.[epKey] || { percent: 0 };
            const isComplete = state.completedEpisodes?.includes(epKey);
            const inProgress = progress.percent > 0 && progress.percent < 98;

            totalProgress += isComplete ? 100 : progress.percent;

            const card = document.createElement('div');
            card.className = 'episode-card' + (isComplete ? ' completed' : '') + (inProgress ? ' in-progress' : '');
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            // Name from visible content (see podcast cards above).
            const downloadState = downloads.isDownloading(currentPodcast, ep)
                ? 'downloading'
                : downloads.isDownloaded(currentPodcast, ep) ? 'downloaded' : 'none';
            renderEpisodeCard(card, ep, progress, isComplete, inProgress, downloadState);
            const handleEpisodeCardActivation = (event) => {
                const btn = event.target.closest('.ep-download-btn');
                if (btn) {
                    event.stopPropagation();
                    const state = btn.classList.contains('downloaded')
                        ? 'downloaded'
                        : btn.classList.contains('downloading') ? 'downloading' : 'none';
                    if (state === 'downloading') return;
                    if (state === 'downloaded') {
                        void downloads.remove(currentPodcast, ep);
                    } else {
                        void downloads.download(currentPodcast, ep);
                    }
                    return;
                }
                onOpenEpisode(ep);
            };
            card.addEventListener('click', handleEpisodeCardActivation);
            activateCardWithKeyboard(card, handleEpisodeCardActivation);
            listEl.appendChild(card);
        });

        if (shown === 0) {
            const empty = document.createElement('div');
            empty.className = 'no-items';
            empty.textContent = filter
                ? `No episodes match "${filter}".`
                : 'No episodes match this filter.';
            listEl.appendChild(empty);
        }

        // Update total progress badge
        const avgProgress = episodes.length > 0 ? Math.round(totalProgress / episodes.length) : 0;
        document.getElementById('total-progress-badge').textContent = `${avgProgress}% Complete`;
    }

    // Re-render the episode list preserving the current search box value —
    // used when download state changes.
    function refreshEpisodeList() {
        renderEpisodeList(document.getElementById('episode-search')?.value || '');
    }

    function filterAndSortEpisodes() {
        if (!getCurrentPodcast()) return;
        const container = document.getElementById('episode-list');
        const cards = Array.from(container.querySelectorAll('.episode-card'));

        // Filter
        let visible = 0;
        cards.forEach(card => {
            const status = card.classList.contains('completed') ? 'completed' :
                          card.classList.contains('in-progress') ? 'in-progress' : 'unplayed';
            const show = currentFilter === 'all' ||
                        (currentFilter === 'completed' && status === 'completed') ||
                        (currentFilter === 'in-progress' && status === 'in-progress') ||
                        (currentFilter === 'unplayed' && status === 'unplayed');
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        // Empty state for filters that match nothing
        let emptyEl = container.querySelector('.no-items.filter-empty');
        if (visible === 0 && cards.length > 0) {
            if (!emptyEl) {
                emptyEl = document.createElement('div');
                emptyEl.className = 'no-items filter-empty';
                container.appendChild(emptyEl);
            }
            const labels = {
                unplayed: 'No unplayed episodes — you\'ve started or finished them all.',
                'in-progress': 'No episodes in progress.',
                completed: 'No completed episodes yet.',
            };
            emptyEl.textContent = labels[currentFilter] || 'No episodes match this filter.';
        } else if (emptyEl) {
            emptyEl.remove();
        }

        // Sort
        if (currentSort !== 'default') {
            const sortedCards = cards.sort((a, b) => {
                const aNum = parseInt(a.querySelector('.ep-number').textContent.match(/\d+/)[0]);
                const bNum = parseInt(b.querySelector('.ep-number').textContent.match(/\d+/)[0]);
                const aTitle = a.querySelector('.ep-title').textContent;
                const bTitle = b.querySelector('.ep-title').textContent;
                const aProgress = parseFloat(a.querySelector('.ep-progress-bar').style.width) || 0;
                const bProgress = parseFloat(b.querySelector('.ep-progress-bar').style.width) || 0;

                switch(currentSort) {
                    case 'newest': return bNum - aNum;
                    case 'oldest': return aNum - bNum;
                    case 'title': return aTitle.localeCompare(bTitle);
                    case 'progress': return bProgress - aProgress;
                    default: return 0;
                }
            });
            sortedCards.forEach(card => container.appendChild(card));
        }
    }

    function bind() {
        document.getElementById('podcast-search').addEventListener('input', e => {
            renderPodcastsList(e.target.value);
        });

        document.getElementById('episode-search').addEventListener('input', e => {
            renderEpisodeList(e.target.value);
        });

        document.getElementById('close-create-modal').addEventListener('click', () => {
            document.getElementById('create-modal').classList.remove('show');
        });

        // Episode Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterAndSortEpisodes();
            });
        });

        document.getElementById('episode-sort').addEventListener('change', e => {
            currentSort = e.target.value;
            filterAndSortEpisodes();
        });
    }

    return { renderPodcastsList, renderEpisodeList, refreshEpisodeList, bind };
}
