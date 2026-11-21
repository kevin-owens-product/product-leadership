// Library screens: the podcasts home grid and the per-show episode list,
// including search, status filters, and sorting.

import { updateVersionBadge } from '../app/version.js';
import { formatDurationLabel, renderPodcastCard, renderEpisodeCard, renderContinueCard } from './render.js';
import { activateCardWithKeyboard } from './dom.js';
import {
    getContinueListening,
    getPodcastSeasons,
    getSeasonListeningAction,
    getSeasonStats,
    isEpisodeComplete,
    resolveSeasonNumber,
    seasonNumberForEpisode
} from './seasons.js';

export function createLibrary({
    getPodcasts,
    isLoaded,
    loadState,
    getCurrentPodcast,
    getPlaybackContext = () => null,
    persistSeasonSelection = () => {},
    downloads,
    newEpisodes = { isNew: () => false, countNew: () => 0 },
    toasts = { show: () => {} },
    isQueued,
    onAddToQueue,
    onOpenPodcast,
    onOpenEpisode,
    onResumeEpisode = () => {}
}) {
    let currentFilter = 'all';
    let currentSort = 'default';
    let lastRenderedPodcastId = null;
    let searchAllSeasons = false;
    const selectedSeasonByPodcast = new Map();
    let visibleDownloads = [];

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
        renderDownloads();
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
        renderContinueShelf(podcasts, state, filter);
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
            renderPodcastCard(card, podcast, epCount, avgProgress, {
                newCount: newEpisodes.countNew(podcast, state)
            });

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

    function renderDownloads() {
        const list = document.getElementById('downloads-list');
        const verified = downloads.hasVerifiedDownloads();
        const supported = 'serviceWorker' in navigator;
        const entries = [];
        if (verified) {
            for (const podcast of getPodcasts()) {
                for (const episode of podcast.episodes) {
                    if (downloads.isDownloaded(podcast, episode)) entries.push({ podcast, episode });
                }
            }
        }
        document.getElementById('downloads-count').textContent = verified || !supported ? ` (${entries.length})` : '';
        const status = document.getElementById('downloads-status');
        status.hidden = entries.length > 0;
        if (!status.hidden) {
            if (!supported) status.textContent = 'This browser can’t save episodes for offline listening.';
            else if (!verified && !navigator.serviceWorker.controller) status.textContent = 'Offline storage is not available in this tab yet.';
            else if (!verified) status.textContent = 'Checking saved episodes…';
            else status.textContent = 'No episodes downloaded. Use the download button beside an episode to listen offline.';
        }
        const showCount = entries.filter(entry => entry.podcast.id === getCurrentPodcast()?.id).length;
        const badge = document.getElementById('show-download-count');
        badge.hidden = showCount === 0;
        badge.textContent = showCount ? `${showCount} downloaded` : '';

        // Leave the rows in place during unrelated library updates so keyboard
        // and screen-reader users keep their position in the list.
        if (entries.length === visibleDownloads.length && entries.every((entry, i) =>
            entry.episode === visibleDownloads[i].episode && entry.podcast === visibleDownloads[i].podcast)) return;
        const focusedButton = list.contains(document.activeElement) ? document.activeElement : null;
        const focusIndex = focusedButton ? Array.from(list.children).indexOf(focusedButton.closest('li')) : -1;
        const focusEntry = visibleDownloads[focusIndex];
        visibleDownloads = entries;
        list.replaceChildren();
        for (const { podcast, episode } of entries) {
            const row = document.createElement('li');
            const play = document.createElement('button');
            play.type = 'button';
            play.className = 'download-play';
            play.textContent = episode.title;
            play.setAttribute('aria-label', `Play ${episode.title} from ${podcast.title}`);
            const meta = document.createElement('small');
            const duration = formatDurationLabel(episode.durationSeconds);
            meta.textContent = duration ? `${podcast.title} · ${duration}` : podcast.title;
            play.appendChild(meta);
            play.addEventListener('click', () => onResumeEpisode(podcast, episode));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'bulk-btn';
            remove.textContent = 'Remove';
            remove.setAttribute('aria-label', `Remove download of ${episode.title} from ${podcast.title}`);
            remove.addEventListener('click', () => { void downloads.remove(podcast, episode); });
            row.append(play, remove);
            list.appendChild(row);
        }
        if (focusIndex >= 0) {
            const retained = entries.findIndex(entry => entry.episode === focusEntry.episode && entry.podcast === focusEntry.podcast);
            const row = list.children[retained >= 0 ? retained : Math.min(focusIndex, entries.length - 1)];
            const focusTarget = row?.querySelector(focusedButton.classList.contains('download-play') ? '.download-play' : '.bulk-btn')
                || document.querySelector('#home-downloads summary');
            focusTarget.focus({ preventScroll: true });
        }
    }

    // Half-finished episodes from any show, one tap to resume. Hidden while
    // searching so the results sit right under the search box.
    function renderContinueShelf(podcasts, state, filter) {
        const shelf = document.getElementById('continue-listening');
        const row = document.getElementById('continue-listening-row');
        if (!shelf || !row) return;
        const items = filter ? [] : getContinueListening(podcasts, state, 8);
        row.replaceChildren();
        shelf.hidden = items.length === 0;
        for (const { podcast, episode, percent } of items) {
            const card = document.createElement('div');
            card.className = 'continue-card';
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.dataset.podcastId = podcast.id;
            card.dataset.episodeId = String(episode.id);
            renderContinueCard(card, podcast, episode, percent);
            const resume = () => onResumeEpisode(podcast, episode);
            card.addEventListener('click', resume);
            activateCardWithKeyboard(card, resume);
            row.appendChild(card);
        }
    }

    // "Download season" / "Download all" plus the podcast-app feed link.
    // Sizes come from the catalog (audioBytes), so the label can say how much
    // storage a batch takes before anything is fetched.
    let bulkProgress = null;
    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '';
        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
        return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
    }

    // A Retry toast can outlive this view. Keep its original show, season
    // and failed episode objects even if the visible button now says Remove.
    let downloadBatch = Promise.resolve();
    function requestBulkDownload(podcast, episodes, scopeLabel) {
        const run = downloadBatch.then(async () => {
            const pending = episodes.filter((episode) => !downloads.isDownloaded(podcast, episode));
            if (!pending.length) return;
            bulkProgress = { podcastId: podcast.id, scopeLabel, done: 0, total: pending.length };
            refreshEpisodeList();
            let result;
            try {
                result = await downloads.downloadMany(podcast, pending, {
                    onProgress: (done, total) => {
                        Object.assign(bulkProgress, { done, total });
                        refreshEpisodeList();
                    }
                });
            } finally {
                bulkProgress = null;
                refreshEpisodeList();
            }
            if (result.failed > 0) {
                toasts.show(`${podcast.title} · ${scopeLabel}: downloaded ${result.ok} of ${result.ok + result.failed}`, {
                    actionLabel: 'Retry',
                    onAction: () => requestBulkDownload(podcast, result.failedEpisodes, scopeLabel)
                });
            } else if (result.ok > 0) {
                toasts.show(`${podcast.title} · ${scopeLabel} saved for offline listening`);
            }
        });
        // A retry requested during another transfer runs after it finishes.
        downloadBatch = run.catch((err) => console.warn('Episode batch failed:', err));
        return run;
    }

    function renderBulkActions(podcast, scopeEpisodes, scopeLabel) {
        const row = document.getElementById('bulk-actions');
        const button = document.getElementById('bulk-download-btn');
        const label = document.getElementById('bulk-download-label');
        const feedBtn = document.getElementById('feed-btn');
        if (!row || !button || !label) return;
        const withAudio = scopeEpisodes.filter((episode) => Number(episode.audioBytes) > 0);
        if (feedBtn) feedBtn.hidden = !podcast.feedUrl;
        if (withAudio.length === 0) {
            button.hidden = true;
            row.hidden = !podcast.feedUrl;
            return;
        }
        row.hidden = false;
        button.hidden = false;
        const pending = withAudio.filter((episode) => !downloads.isDownloaded(podcast, episode));
        const busy = bulkProgress?.podcastId === podcast.id && bulkProgress.scopeLabel === scopeLabel;
        button.disabled = Boolean(busy) || (downloads.isBatchRunning?.() && !busy);
        button.classList.toggle('downloaded', pending.length === 0);
        delete button.dataset.mode;
        if (busy) {
            label.textContent = `Downloading ${Math.min(bulkProgress.done + 1, bulkProgress.total)} of ${bulkProgress.total}…`;
        } else if (pending.length === 0) {
            label.textContent = `${scopeLabel} downloaded · Remove`;
            button.dataset.mode = 'remove';
        } else {
            const bytes = pending.reduce((sum, episode) => sum + (Number(episode.audioBytes) || 0), 0);
            const count = `${pending.length} ${pending.length === 1 ? 'episode' : 'episodes'}`;
            label.textContent = `Download ${scopeLabel.toLowerCase()} · ${count} · ${formatBytes(bytes)}`;
            button.dataset.mode = 'download';
        }
        button.onclick = async () => {
            const mode = button.dataset.mode;
            if (mode === 'remove') {
                await downloads.removeMany(podcast, withAudio);
                toasts.show(`Removed ${scopeLabel.toLowerCase()} downloads`);
                return;
            }
            if (mode === 'download') await requestBulkDownload(podcast, pending, scopeLabel);
        };
        if (feedBtn) {
            feedBtn.onclick = async () => {
                const feedUrl = new URL(podcast.feedUrl, location.href).toString();
                let copied = false;
                try {
                    await navigator.clipboard.writeText(feedUrl);
                    copied = true;
                } catch {
                    copied = false;
                }
                toasts.show(copied
                    ? 'Feed link copied. In Apple Podcasts use Follow a Show by URL; in Overcast use Add URL'
                    : `Feed link: ${feedUrl}`, {
                    actionLabel: 'Open',
                    onAction: () => { location.href = feedUrl.replace(/^https?:/, 'podcast:'); }
                });
            };
        }
    }

    function resetEpisodeControlsForPodcast(podcast) {
        if (lastRenderedPodcastId === podcast.id) return false;
        lastRenderedPodcastId = podcast.id;
        currentFilter = 'all';
        currentSort = 'default';
        searchAllSeasons = false;
        const search = document.getElementById('episode-search');
        if (search) search.value = '';
        const sort = document.getElementById('episode-sort');
        if (sort) sort.value = 'default';
        document.querySelectorAll('.filter-btn').forEach((button) => {
            const active = button.dataset.filter === 'all';
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        return true;
    }

    function getSelectedSeason(podcast, seasons, state) {
        const rememberedInSession = selectedSeasonByPodcast.get(podcast.id);
        if (seasons.some((season) => season.number === rememberedInSession)) return rememberedInSession;
        const playback = getPlaybackContext() || null;
        const selected = resolveSeasonNumber({ podcast, state, playback });
        if (selected != null) selectedSeasonByPodcast.set(podcast.id, selected);
        return selected;
    }

    function selectSeason(podcast, seasonNumber, {
        persist = true,
        render = false,
        scroll = false,
        focusTab = false,
        updateUrl = false
    } = {}) {
        const seasons = getPodcastSeasons(podcast);
        if (!seasons.some((season) => season.number === seasonNumber)) return false;
        const deck = document.getElementById('season-deck');
        const deckRect = deck?.getBoundingClientRect();
        const deckWasVisible = Boolean(deckRect
            && deckRect.bottom > 0
            && deckRect.top < window.innerHeight);
        selectedSeasonByPodcast.set(podcast.id, seasonNumber);
        searchAllSeasons = false;
        if (persist) persistSeasonSelection(podcast.id, seasonNumber);
        if (updateUrl && window.history?.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.set('podcast', podcast.id);
            url.searchParams.set('season', String(seasonNumber));
            url.searchParams.delete('episode');
            url.searchParams.delete('line');
            window.history.replaceState(window.history.state, '', url);
        }
        if (render && getCurrentPodcast()?.id === podcast.id) {
            renderEpisodeList(document.getElementById('episode-search')?.value || '');
            if (scroll && !deckWasVisible) {
                document.getElementById('episode-list')?.scrollIntoView({
                    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
            if (focusTab) {
                document.querySelector(`.season-tab[data-season="${seasonNumber}"]`)?.focus({ preventScroll: true });
            }
        }
        return true;
    }

    function selectSeasonForEpisode(podcast, episode, options = {}) {
        const seasonNumber = seasonNumberForEpisode(podcast, episode);
        if (seasonNumber == null) return false;
        return selectSeason(podcast, seasonNumber, options);
    }

    function renderSeasonTabs(podcast, seasons, selectedSeason, state) {
        const nav = document.getElementById('season-nav');
        const tabs = document.getElementById('season-tabs');
        const selectWrap = document.getElementById('season-select-wrap');
        const select = document.getElementById('season-select');
        nav.hidden = false;
        tabs.replaceChildren();
        select.replaceChildren();

        if (seasons.length <= 3) {
            tabs.hidden = false;
            selectWrap.hidden = true;
            seasons.forEach((season, index) => {
                const stats = getSeasonStats(podcast.id, season.episodes, state);
                const button = document.createElement('button');
                const selected = season.number === selectedSeason;
                button.type = 'button';
                button.className = `season-tab${selected ? ' active' : ''}`;
                button.dataset.season = String(season.number);
                button.id = `season-tab-${podcast.id}-${season.number}`;
                button.setAttribute('role', 'tab');
                button.setAttribute('aria-controls', 'episode-list');
                button.setAttribute('aria-selected', String(selected));
                button.tabIndex = selected ? 0 : -1;
                button.setAttribute('aria-label', `Season ${season.number}: ${season.title}, ${stats.completed} of ${stats.total} played`);
                const name = document.createElement('span');
                name.className = 'season-tab-name';
                name.textContent = `Season ${season.number}`;
                const progress = document.createElement('span');
                progress.className = 'season-tab-progress';
                progress.textContent = stats.completed === stats.total
                    ? 'Complete'
                    : `${stats.completed}/${stats.total}`;
                button.append(name, progress);
                button.addEventListener('click', () => {
                    selectSeason(podcast, season.number, {
                        render: true,
                        scroll: true,
                        focusTab: true,
                        updateUrl: true
                    });
                });
                button.addEventListener('keydown', (event) => {
                    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
                    if (!keys.includes(event.key)) return;
                    event.preventDefault();
                    let targetIndex = index;
                    if (event.key === 'ArrowLeft') targetIndex = (index - 1 + seasons.length) % seasons.length;
                    if (event.key === 'ArrowRight') targetIndex = (index + 1) % seasons.length;
                    if (event.key === 'Home') targetIndex = 0;
                    if (event.key === 'End') targetIndex = seasons.length - 1;
                    selectSeason(podcast, seasons[targetIndex].number, {
                        render: true,
                        scroll: true,
                        focusTab: true,
                        updateUrl: true
                    });
                });
                tabs.appendChild(button);
            });
            const selectedTab = tabs.querySelector('[aria-selected="true"]');
            if (selectedTab) {
                const panel = document.getElementById('episode-list');
                panel.setAttribute('role', 'tabpanel');
                panel.removeAttribute('aria-label');
                panel.setAttribute('aria-labelledby', selectedTab.id);
            }
        } else {
            tabs.hidden = true;
            selectWrap.hidden = false;
            seasons.forEach((season) => {
                const stats = getSeasonStats(podcast.id, season.episodes, state);
                const option = document.createElement('option');
                option.value = String(season.number);
                option.textContent = `Season ${season.number}: ${season.title} · ${stats.completed}/${stats.total}`;
                option.selected = season.number === selectedSeason;
                select.appendChild(option);
            });
            const panel = document.getElementById('episode-list');
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-label', `Season ${selectedSeason} episodes`);
            panel.removeAttribute('aria-labelledby');
        }
    }

    function renderSeasonDeck(podcast, seasons, selectedSeason, state) {
        const deck = document.getElementById('season-deck');
        const selected = seasons.find((season) => season.number === selectedSeason);
        if (!selected) {
            deck.hidden = true;
            return;
        }
        const stats = getSeasonStats(podcast.id, selected.episodes, state);
        const action = getSeasonListeningAction({ podcast, seasons, selectedSeason, state });
        deck.hidden = false;
        document.getElementById('season-kicker').textContent = `Season ${selected.number} of ${seasons.length}`;
        document.getElementById('season-heading').textContent = selected.title;
        document.getElementById('season-description').textContent = selected.description;
        document.getElementById('season-progress-label').textContent = `${stats.completed} of ${stats.total} played · ${stats.percent}%`;
        document.getElementById('season-duration-label').textContent = formatDurationLabel(stats.durationSeconds) || '';
        document.getElementById('season-progress-fill').style.width = `${stats.percent}%`;

        const button = document.getElementById('continue-episode');
        const label = document.getElementById('continue-episode-label');
        const title = document.getElementById('continue-episode-title');
        const meta = document.getElementById('continue-episode-meta');
        button.disabled = !action.episode;
        button.dataset.kind = action.kind;
        delete button.dataset.episodeId;
        delete button.dataset.season;
        if (!action.episode) {
            label.textContent = action.kind === 'series-complete' ? 'Series complete' : 'Season complete';
            title.textContent = action.kind === 'series-complete'
                ? 'All episodes played'
                : 'Choose another season to keep listening';
            meta.textContent = '';
            return;
        }

        button.dataset.episodeId = String(action.episode.id);
        button.dataset.season = String(action.season.number);
        if (action.kind === 'continue') label.textContent = `Continue Episode ${action.episode.id}`;
        else if (action.kind === 'start') label.textContent = `Start Season ${action.season.number}`;
        else label.textContent = `Play Episode ${action.episode.id}`;
        title.textContent = action.episode.title;
        const progress = state.episodeProgress?.[`${podcast.id}-${action.episode.id}`]?.percent || 0;
        const remaining = action.kind === 'continue' && Number.isFinite(action.episode.durationSeconds)
            ? formatDurationLabel(action.episode.durationSeconds * (100 - progress) / 100)
            : null;
        meta.textContent = remaining
            ? `${remaining} left`
            : (formatDurationLabel(action.episode.durationSeconds) || action.season.title);
    }

    function hideSeasonChrome() {
        document.getElementById('season-nav').hidden = true;
        document.getElementById('season-deck').hidden = true;
        const panel = document.getElementById('episode-list');
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Episodes');
        panel.removeAttribute('aria-labelledby');
    }

    function updateStatusFilterCounts(podcast, episodes, state, hasSeasons) {
        const counts = { all: episodes.length, unplayed: 0, 'in-progress': 0, completed: 0 };
        episodes.forEach((episode) => {
            const key = `${podcast.id}-${episode.id}`;
            const progress = Number(state.episodeProgress?.[key]?.percent) || 0;
            if (isEpisodeComplete(state, podcast.id, episode)) counts.completed += 1;
            else if (progress > 0) counts['in-progress'] += 1;
            else counts.unplayed += 1;
        });
        const labels = { all: 'All', unplayed: 'Unplayed', 'in-progress': 'In Progress', completed: 'Completed' };
        document.querySelectorAll('.filter-btn').forEach((button) => {
            const key = button.dataset.filter;
            button.textContent = hasSeasons ? `${labels[key]} ${counts[key]}` : labels[key];
        });
    }

    function renderEpisodeList(filter = null) {
        renderDownloads();
        const currentPodcast = getCurrentPodcast();
        if (!currentPodcast || !Array.isArray(currentPodcast.episodes)) {
            document.getElementById('episode-list').innerHTML = '<p class="loading-text">No episodes found</p>';
            hideSeasonChrome();
            const bulk = document.getElementById('bulk-actions');
            if (bulk) bulk.hidden = true;
            return;
        }

        const changedPodcast = resetEpisodeControlsForPodcast(currentPodcast);
        const query = changedPodcast
            ? ''
            : (filter == null ? (document.getElementById('episode-search')?.value || '') : filter);
        const state = loadState();
        const seasons = getPodcastSeasons(currentPodcast);
        const hasSeasons = seasons.length > 1;
        const selectedSeason = hasSeasons ? getSelectedSeason(currentPodcast, seasons, state) : null;
        const selected = seasons.find((season) => season.number === selectedSeason);
        const seasonEpisodes = selected?.episodes || currentPodcast.episodes;

        if (hasSeasons) {
            renderSeasonTabs(currentPodcast, seasons, selectedSeason, state);
            renderSeasonDeck(currentPodcast, seasons, selectedSeason, state);
        } else {
            hideSeasonChrome();
            searchAllSeasons = false;
        }
        renderBulkActions(
            currentPodcast,
            seasonEpisodes,
            hasSeasons ? `Season ${selectedSeason}` : 'All episodes'
        );
        const allStats = getSeasonStats(currentPodcast.id, currentPodcast.episodes, state);
        document.getElementById('total-progress-badge').textContent = `${allStats.percent}% Complete`;

        const queryLower = query.trim().toLowerCase();
        const matchesQuery = (episode) => !queryLower
            || (episode.title || '').toLowerCase().includes(queryLower)
            || (episode.subtitle || '').toLowerCase().includes(queryLower);
        const selectedMatches = seasonEpisodes.filter(matchesQuery);
        const allMatches = currentPodcast.episodes.filter(matchesQuery);
        const statusOf = (episode) => {
            const key = `${currentPodcast.id}-${episode.id}`;
            const progress = Number(state.episodeProgress?.[key]?.percent) || 0;
            return isEpisodeComplete(state, currentPodcast.id, episode)
                ? 'completed'
                : progress > 0 ? 'in-progress' : 'unplayed';
        };
        const matchesStatus = (episode) => currentFilter === 'all' || currentFilter === statusOf(episode);
        const scopedMatches = searchAllSeasons && queryLower ? allMatches : selectedMatches;
        const selectedResults = selectedMatches.filter(matchesStatus);
        const allResults = allMatches.filter(matchesStatus);
        updateStatusFilterCounts(currentPodcast, scopedMatches, state, hasSeasons);
        let episodes = searchAllSeasons && queryLower ? allResults : selectedResults;

        episodes = [...episodes].sort((a, b) => {
            if (currentSort === 'newest') return b.id - a.id;
            if (currentSort === 'oldest') return a.id - b.id;
            if (currentSort === 'title') return (a.title || '').localeCompare(b.title || '');
            if (currentSort === 'progress') {
                const aProgress = Number(state.episodeProgress?.[`${currentPodcast.id}-${a.id}`]?.percent) || 0;
                const bProgress = Number(state.episodeProgress?.[`${currentPodcast.id}-${b.id}`]?.percent) || 0;
                return bProgress - aProgress;
            }
            return currentPodcast.episodes.indexOf(a) - currentPodcast.episodes.indexOf(b);
        });

        const listEl = document.getElementById('episode-list');
        listEl.replaceChildren();
        if (searchAllSeasons && queryLower) {
            listEl.setAttribute('role', 'region');
            listEl.setAttribute('aria-label', 'All seasons search results');
            listEl.removeAttribute('aria-labelledby');
            const scope = document.createElement('div');
            scope.className = 'season-search-scope';
            const text = document.createElement('span');
            text.textContent = `Showing matches across all ${seasons.length} seasons`;
            const back = document.createElement('button');
            back.type = 'button';
            back.textContent = `Back to Season ${selectedSeason}`;
            back.addEventListener('click', () => {
                searchAllSeasons = false;
                renderEpisodeList(query);
            });
            scope.append(text, back);
            listEl.appendChild(scope);
        } else if (hasSeasons && queryLower) {
            const outsideMatches = allResults.filter((episode) => episode.season !== selectedSeason);
            if (outsideMatches.length > 0) {
                const scope = document.createElement('div');
                scope.className = 'season-search-scope';
                const text = document.createElement('span');
                text.textContent = `${selectedResults.length} ${selectedResults.length === 1 ? 'match' : 'matches'} in Season ${selectedSeason}`;
                const expand = document.createElement('button');
                expand.id = 'search-all-seasons';
                expand.type = 'button';
                expand.textContent = `See ${outsideMatches.length} more across all seasons`;
                expand.addEventListener('click', () => {
                    searchAllSeasons = true;
                    renderEpisodeList(query);
                });
                scope.append(text, expand);
                listEl.appendChild(scope);
            }
        }

        episodes.forEach((episode) => {
            const key = `${currentPodcast.id}-${episode.id}`;
            const progress = state.episodeProgress?.[key] || { percent: 0 };
            const complete = isEpisodeComplete(state, currentPodcast.id, episode);
            const inProgress = !complete && progress.percent > 0;
            const card = document.createElement('div');
            card.className = 'episode-card' + (complete ? ' completed' : '') + (inProgress ? ' in-progress' : '');
            card.dataset.episodeId = String(episode.id);
            if (hasSeasons) card.dataset.season = String(episode.season);
            const downloadState = downloads.isDownloading(currentPodcast, episode)
                ? 'downloading'
                : downloads.isDownloaded(currentPodcast, episode) ? 'downloaded' : 'none';
            const renderCard = () => renderEpisodeCard(card, episode, progress, complete, inProgress, downloadState, {
                seasonNumber: hasSeasons ? episode.season : null,
                isNew: newEpisodes.isNew(currentPodcast, episode, state),
                queued: isQueued(currentPodcast, episode)
            });
            renderCard();
            const handleEpisodeCardActivation = (event) => {
                const queueButton = event.target.closest('.ep-queue-btn');
                if (queueButton) {
                    if (queueButton.getAttribute('aria-disabled') === 'true') return;
                    onAddToQueue(currentPodcast, episode);
                    renderCard();
                    card.querySelector('.ep-queue-btn').focus({ preventScroll: true });
                    return;
                }
                const button = event.target.closest('.ep-download-btn');
                if (button) {
                    event.stopPropagation();
                    const downloadStatus = button.classList.contains('downloaded')
                        ? 'downloaded'
                        : button.classList.contains('downloading') ? 'downloading' : 'none';
                    if (downloadStatus === 'downloading') return;
                    if (downloadStatus === 'downloaded') void downloads.remove(currentPodcast, episode);
                    else void downloads.download(currentPodcast, episode);
                    return;
                }
                onOpenEpisode(episode);
            };
            card.addEventListener('click', handleEpisodeCardActivation);
            listEl.appendChild(card);
        });

        if (episodes.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'no-items';
            const labels = {
                unplayed: 'No unplayed episodes — you\'ve started or finished them all.',
                'in-progress': 'No episodes in progress.',
                completed: 'No completed episodes yet.'
            };
            empty.textContent = queryLower
                ? `No episodes match "${query}" ${searchAllSeasons ? `across all ${seasons.length} seasons` : `in ${hasSeasons ? `Season ${selectedSeason}` : 'this show'}`}.`
                : (labels[currentFilter] || 'No episodes match this filter.');
            listEl.appendChild(empty);
        }

        const status = document.getElementById('episode-results-status');
        if (status) {
            status.textContent = hasSeasons
                ? `${searchAllSeasons ? 'All seasons' : `Season ${selectedSeason}`}, ${episodes.length} episodes shown.`
                : `${episodes.length} episodes shown.`;
        }
    }

    // Re-render the episode list preserving season, search, filter, and sort —
    // used when download or playback state changes.
    function refreshEpisodeList() {
        renderEpisodeList(document.getElementById('episode-search')?.value || '');
    }

    function bind() {
        document.getElementById('podcast-search').addEventListener('input', e => {
            renderPodcastsList(e.target.value);
        });

        document.getElementById('episode-search').addEventListener('input', e => {
            if (!e.target.value.trim()) searchAllSeasons = false;
            renderEpisodeList(e.target.value);
        });

        document.getElementById('close-create-modal').addEventListener('click', () => {
            document.getElementById('create-modal').classList.remove('show');
        });

        // Episode Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach((button) => {
                    const active = button === btn;
                    button.classList.toggle('active', active);
                    button.setAttribute('aria-pressed', String(active));
                });
                renderEpisodeList(document.getElementById('episode-search')?.value || '');
            });
        });

        document.getElementById('episode-sort').addEventListener('change', e => {
            currentSort = e.target.value;
            renderEpisodeList(document.getElementById('episode-search')?.value || '');
        });

        document.getElementById('season-select').addEventListener('change', (event) => {
            const podcast = getCurrentPodcast();
            if (!podcast) return;
            selectSeason(podcast, Number(event.target.value), {
                render: true,
                scroll: true,
                updateUrl: true
            });
        });

        document.getElementById('continue-episode').addEventListener('click', (event) => {
            const podcast = getCurrentPodcast();
            const episodeId = Number(event.currentTarget.dataset.episodeId);
            const seasonNumber = Number(event.currentTarget.dataset.season);
            if (!podcast || !Number.isInteger(episodeId)) return;
            const episode = podcast.episodes.find((candidate) => candidate.id === episodeId);
            if (!episode) return;
            if (Number.isInteger(seasonNumber)) selectSeason(podcast, seasonNumber);
            if (event.currentTarget.dataset.kind === 'continue') onResumeEpisode(podcast, episode);
            else onOpenEpisode(episode);
        });
    }

    return {
        renderPodcastsList,
        renderEpisodeList,
        refreshEpisodeList,
        selectSeason,
        selectSeasonForEpisode,
        bind
    };
}
