// Per-show playback-speed memory. Stored as a single localStorage map so
// each podcast keeps its own preferred rate (like Overcast's per-show speed).

import { safeJSONParse } from './storage.js?v=2.3.0%2B20260713T053743Z';

export const SPEED_PREFS_KEY = 'speedByShow';
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 4;

export function clampSpeed(rate, fallback = 1) {
  const r = Number(rate);
  if (!Number.isFinite(r)) return fallback;
  // Snap to the slider's 0.1 grid to avoid float dust like 1.7000000000000002.
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(r * 10) / 10));
}

function loadMap(storage) {
  const parsed = safeJSONParse(storage.getItem(SPEED_PREFS_KEY), {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

export function getShowSpeed(podcastId, fallback = 1, storage = localStorage) {
  if (!podcastId) return fallback;
  const map = loadMap(storage);
  const stored = Number(map[podcastId]);
  if (!Number.isFinite(stored)) return fallback;
  return clampSpeed(stored, fallback);
}

export function setShowSpeed(podcastId, rate, storage = localStorage) {
  if (!podcastId) return;
  const map = loadMap(storage);
  map[podcastId] = clampSpeed(rate);
  try {
    storage.setItem(SPEED_PREFS_KEY, JSON.stringify(map));
  } catch {
    // Quota/private-mode failures are non-fatal; speed just won't persist.
  }
}
