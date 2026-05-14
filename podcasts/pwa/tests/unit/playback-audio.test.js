import test from 'node:test';
import assert from 'node:assert/strict';

import { createSpeechPlayers } from '../../src/playback/audio.js';

// Comprehensive Audio mock that covers what audio.js touches: setAttribute,
// addEventListener, src/load, currentTime, paused, playbackRate, play/pause.
function installFakeAudio() {
  const previous = global.Audio;
  const created = [];

  class FakeAudio {
    constructor(src) {
      this._listeners = new Map();
      this.src = src || '';
      this.preload = '';
      this.playsInline = false;
      this.crossOrigin = '';
      this.playbackRate = 1;
      this.currentTime = 0;
      this.duration = 0;
      this.paused = true;
      this.error = null;
      this.onended = null;
      this.onerror = null;
      created.push(this);
    }
    setAttribute() {}
    removeAttribute() {}
    load() {}
    play() {
      this.paused = false;
      this._dispatch('play');
      return Promise.resolve();
    }
    triggerEnded() {
      if (typeof this.onended === 'function') this.onended();
      this._dispatch('ended');
    }
    pause() {
      if (!this.paused) {
        this.paused = true;
        this._dispatch('pause');
      }
    }
    addEventListener(event, fn) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(fn);
    }
    removeEventListener(event, fn) {
      const list = this._listeners.get(event);
      if (!list) return;
      this._listeners.set(event, list.filter((h) => h !== fn));
    }
    _dispatch(event, ...args) {
      const list = this._listeners.get(event);
      if (!list) return;
      list.forEach((fn) => fn(...args));
    }
  }

  global.Audio = FakeAudio;
  return {
    created,
    sharedAudio: () => created[0],
    chunkAudios: () => created.slice(1),
    restore: () => { global.Audio = previous; }
  };
}

test('speak plays generated chunk audio when audioUrl is provided', async () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1.5 });
    const playback = players.speak('ignored text', 'alex', { audioUrl: 'audio/show/ep/0000.mp3' });
    await new Promise((r) => queueMicrotask(r));
    const chunks = env.chunkAudios();
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].src, 'audio/show/ep/0000.mp3');
    assert.equal(chunks[0].playbackRate, 1.5);
    chunks[0].triggerEnded();
    await playback;
  } finally {
    env.restore();
  }
});

test('speak rejects when generated Supertonic audio url is missing', async () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    await assert.rejects(
      () => players.speak('hello without generated audio', 'alex'),
      /Missing generated Supertonic audio/
    );
  } finally {
    env.restore();
  }
});

test('speak rejects when generated audio fails', async () => {
  const env = installFakeAudio();
  // Override play() on chunks to fail.
  const Original = global.Audio;
  class FailingAudio extends Original {
    play() {
      queueMicrotask(() => {
        if (typeof this.onerror === 'function') this.onerror(new Error('boom'));
      });
      return Promise.resolve();
    }
  }
  global.Audio = FailingAudio;
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    await assert.rejects(
      () => players.speak('boom', 'alex', { audioUrl: 'broken.mp3' }),
      /Failed to play broken\.mp3/
    );
  } finally {
    env.restore();
  }
});

test('pauseCurrentSpeech / resumeCurrentSpeech toggle active chunk audio', async () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    const playback = players.speak('x', 'alex', { audioUrl: 'a/0000.mp3' });
    await new Promise((r) => queueMicrotask(r));
    const chunk = env.chunkAudios()[0];
    players.pauseCurrentSpeech();
    assert.equal(chunk.paused, true);
    players.resumeCurrentSpeech();
    assert.equal(chunk.paused, false);
    chunk.onended();
    await playback;
  } finally {
    env.restore();
  }
});

test('stopCurrentSpeech clears chunk audio src', async () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    const playback = players.speak('x', 'alex', { audioUrl: 'a/0000.mp3' });
    await new Promise((r) => queueMicrotask(r));
    const chunk = env.chunkAudios()[0];
    players.stopCurrentSpeech();
    assert.equal(chunk.paused, true);
    assert.equal(chunk.src, '');
    chunk.onended();
    await playback;
  } finally {
    env.restore();
  }
});

test('setEpisode binds combined.mp3 src and lineOffsets, isContinuousReady reflects both', () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    assert.equal(players.isContinuousReady(), false);
    players.setEpisode({
      combinedUrl: 'audio/show/ep/combined.mp3',
      lineOffsets: [0, 4.5, 11.2, 18.0],
      totalDuration: 24.0
    });
    assert.equal(env.sharedAudio().src, 'audio/show/ep/combined.mp3');
    assert.equal(players.isContinuousReady(), true);
    assert.equal(players.getDuration(), 24.0);
  } finally {
    env.restore();
  }
});

test('seekToLine sets currentTime to the line offset and getCurrentLine reads it back', () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    players.setEpisode({
      combinedUrl: 'audio/show/ep/combined.mp3',
      lineOffsets: [0, 4.5, 11.2, 18.0],
      totalDuration: 24.0
    });
    const shared = env.sharedAudio();
    shared.duration = 24.0;
    players.seekToLine(2);
    assert.equal(shared.currentTime, 11.2);
    assert.equal(players.getCurrentLine(), 2);
    players.seekToLine(0);
    assert.equal(shared.currentTime, 0);
    assert.equal(players.getCurrentLine(), 0);
  } finally {
    env.restore();
  }
});

test('linechange event fires once per crossed line as currentTime advances', () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    players.setEpisode({
      combinedUrl: 'audio/show/ep/combined.mp3',
      lineOffsets: [0, 4.5, 11.2, 18.0],
      totalDuration: 24.0
    });
    const shared = env.sharedAudio();
    shared.duration = 24.0;
    const seen = [];
    players.on('linechange', (lineIndex) => seen.push(lineIndex));
    shared.currentTime = 0; shared._dispatch('timeupdate');
    shared.currentTime = 3; shared._dispatch('timeupdate');
    shared.currentTime = 5; shared._dispatch('timeupdate');
    shared.currentTime = 6; shared._dispatch('timeupdate');
    shared.currentTime = 12; shared._dispatch('timeupdate');
    shared.currentTime = 22; shared._dispatch('timeupdate');
    assert.deepEqual(seen, [0, 1, 2, 3]);
  } finally {
    env.restore();
  }
});

test('on("ended") fires when the shared element ends', () => {
  const env = installFakeAudio();
  try {
    const players = createSpeechPlayers({ getSpeechRate: () => 1 });
    players.setEpisode({
      combinedUrl: 'audio/show/ep/combined.mp3',
      lineOffsets: [0, 5],
      totalDuration: 10
    });
    let endedCount = 0;
    players.on('ended', () => { endedCount += 1; });
    env.sharedAudio()._dispatch('ended');
    assert.equal(endedCount, 1);
  } finally {
    env.restore();
  }
});
