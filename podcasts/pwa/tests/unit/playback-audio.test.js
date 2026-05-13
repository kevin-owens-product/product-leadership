import test from 'node:test';
import assert from 'node:assert/strict';

import { createSpeechPlayers } from '../../src/playback/audio.js';

test('speak plays generated Supertonic audio when audioUrl is provided', async () => {
  const OriginalAudio = global.Audio;

  const audioInstances = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.preload = '';
      this.playbackRate = 1;
      this.paused = true;
      this.onended = null;
      this.onerror = null;
      audioInstances.push(this);
    }
    play() {
      this.paused = false;
      queueMicrotask(() => {
        if (typeof this.onended === 'function') this.onended();
      });
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }

  global.Audio = FakeAudio;

  let synthSpeakCalls = 0;
  const synth = {
    cancel() {},
    speak() { synthSpeakCalls += 1; }
  };

  const players = createSpeechPlayers({
    synth,
    getSpeechRate: () => 1.5
  });

  try {
    await players.speak('ignored text', 'alex', { audioUrl: 'audio/show/ep/0000.mp3' });
    assert.equal(audioInstances.length, 1);
    assert.equal(audioInstances[0].src, 'audio/show/ep/0000.mp3');
    assert.equal(audioInstances[0].playbackRate, 1.5);
    assert.equal(synthSpeakCalls, 0);
  } finally {
    global.Audio = OriginalAudio;
  }
});

test('speak rejects when generated Supertonic audio is missing', async () => {
  const players = createSpeechPlayers({
    synth: { cancel() {}, speak() {} },
    getSpeechRate: () => 1
  });

  await assert.rejects(
    () => players.speak('hello without generated audio', 'alex'),
    /Missing generated Supertonic audio/
  );
});

test('speak rejects when generated audio fails', async () => {
  const OriginalAudio = global.Audio;

  class FakeAudio {
    constructor() {
      this.onended = null;
      this.onerror = null;
    }
    play() {
      queueMicrotask(() => {
        if (typeof this.onerror === 'function') this.onerror(new Error('boom'));
      });
      return Promise.resolve();
    }
    pause() {}
  }

  global.Audio = FakeAudio;

  let synthSpeakCalls = 0;
  const players = createSpeechPlayers({
    synth: {
      cancel() {},
      speak() { synthSpeakCalls += 1; }
    },
    getSpeechRate: () => 1
  });

  try {
    await assert.rejects(
      () => players.speak('hello with broken generated audio', 'alex', { audioUrl: 'broken.mp3' }),
      /Failed to play broken\.mp3/
    );
    assert.equal(synthSpeakCalls, 0);
  } finally {
    global.Audio = OriginalAudio;
  }
});

test('pause and resume control active generated audio', async () => {
  const OriginalAudio = global.Audio;

  let activeAudio = null;
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.onended = null;
      this.onerror = null;
      activeAudio = this;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }

  global.Audio = FakeAudio;

  const players = createSpeechPlayers({
    synth: { cancel() {}, speak() {} },
    getSpeechRate: () => 1
  });

  try {
    const playback = players.speak('ignored text', 'alex', { audioUrl: 'audio/show/ep/0000.mp3' });
    await new Promise(resolve => queueMicrotask(resolve));

    players.pauseCurrentSpeech();
    assert.equal(activeAudio.paused, true);

    players.resumeCurrentSpeech();
    assert.equal(activeAudio.paused, false);

    activeAudio.onended();
    await playback;
  } finally {
    global.Audio = OriginalAudio;
  }
});

test('stopCurrentSpeech cancels synth and clears generated audio', async () => {
  const OriginalAudio = global.Audio;

  let cancelled = 0;
  let paused = 0;
  let activeAudio = null;
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.onended = null;
      this.onerror = null;
      activeAudio = this;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      paused += 1;
    }
  }

  global.Audio = FakeAudio;

  const players = createSpeechPlayers({
    synth: {
      cancel() {
        cancelled += 1;
      },
      speak() {}
    },
    getSpeechRate: () => 1
  });

  try {
    const playback = players.speak('ignored text', 'alex', { audioUrl: 'audio/show/ep/0000.mp3' });
    await new Promise(resolve => queueMicrotask(resolve));

    players.stopCurrentSpeech();
    assert.equal(cancelled, 1);
    assert.equal(paused, 1);
    assert.equal(activeAudio.src, '');

    activeAudio.onended();
    await playback;
  } finally {
    global.Audio = OriginalAudio;
  }
});
