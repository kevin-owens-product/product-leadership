// Per-podcast lockscreen/mini-player artwork, generated on a canvas and
// cached as data URLs per podcast id.

import { shadeHex } from './format.js?v=2.3.0%2B20260712T183210Z';

// Default accent — keep in sync with --accent in styles/base.css.
export const DEFAULT_ACCENT = '#5a5df0';

const podcastArtworkCache = new Map();

export function generatePodcastArtwork(podcast) {
    if (!podcast) return null;
    const cached = podcastArtworkCache.get(podcast.id);
    if (cached) return cached;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const color = podcast.color || DEFAULT_ACCENT;
    // Background: vertical gradient from podcast color to a darker shade
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shadeHex(color, -0.35));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Big emoji centered
    const icon = podcast.icon || '🎙️';
    ctx.font = '300px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, size / 2, size / 2 - 30);
    // Title bar across the bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, size - 96, size, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 36px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const title = (podcast.title || '').slice(0, 26);
    ctx.fillText(title, size / 2, size - 48);
    let dataUrl;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
        console.warn('Artwork generation failed:', err);
        return null;
    }
    podcastArtworkCache.set(podcast.id, dataUrl);
    return dataUrl;
}
