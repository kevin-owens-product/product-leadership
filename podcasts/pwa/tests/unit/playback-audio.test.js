import test from 'node:test';
import assert from 'node:assert/strict';

import { createSpeechPlayers } from '../../src/playback/audio.js';

test('audio segment completion does not trigger interruption handler', async () => {
  const OriginalAudio = global.Audio;

  class FakeAudio {
    constructor() {
      this.ended = false;
      this.playbackRate = 1;
      this.preload = 'auto';
      this.src = '';
    }

    setAttribute() {}

    pause() {
      if (typeof this.onpause === 'function') this.onpause();
    }

    play() {
      if (typeof this.onplay === 'function') this.onplay();

      // Simulate browser order where pause can happen as media naturally ends.
      if (typeof this.onpause === 'function') this.onpause();
      this.ended = true;
      if (typeof this.onended === 'function') this.onended();

      return Promise.resolve();
    }
  }

  global.Audio = FakeAudio;

  let audioElement = null;
  let interruptions = 0;

  const players = createSpeechPlayers({
    synth: { cancel() {}, speak() {} },
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1,
    getAudioElement: () => audioElement,
    setAudioElement: (el) => {
      audioElement = el;
    },
    getUseAudio: () => true,
    getAudioManifest: () => [{ file: 'line-0001.mp3', text: 'Hello world', speaker: 'alex' }],
    getCurrentLineIndex: () => 0,
    buildAudioUrl: (fileName) => `/audio/test/${fileName}`,
    setupWebAudio: async () => {},
    isVoiceBoostEnabled: () => false,
    updateMediaSession: () => {},
    onInterrupted: () => {
      interruptions += 1;
    },
    onFallbackToTTS: () => {}
  });

  try {
    await players.speak('Hello world', 'alex');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(interruptions, 0);
  } finally {
    global.Audio = OriginalAudio;
  }
});

test('audio player reuses one media element across segments', async () => {
  const OriginalAudio = global.Audio;
  let createdAudioCount = 0;

  class FakeAudio {
    constructor() {
      createdAudioCount += 1;
      this.ended = false;
      this.src = '';
      this.playbackRate = 1;
      this.preload = 'auto';
    }

    setAttribute() {}

    pause() {}

    play() {
      this.ended = true;
      if (typeof this.onended === 'function') this.onended();
      return Promise.resolve();
    }
  }

  global.Audio = FakeAudio;

  let audioElement = null;
  let lineIndex = 0;
  const manifest = [
    { file: 'line-0001.mp3', text: 'One', speaker: 'alex' },
    { file: 'line-0002.mp3', text: 'Two', speaker: 'sam' }
  ];

  const players = createSpeechPlayers({
    synth: { cancel() {}, speak() {} },
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1,
    getAudioElement: () => audioElement,
    setAudioElement: (el) => {
      audioElement = el;
    },
    getUseAudio: () => true,
    getAudioManifest: () => manifest,
    getCurrentLineIndex: () => lineIndex,
    buildAudioUrl: (fileName) => `/audio/test/${fileName}`,
    setupWebAudio: async () => {},
    isVoiceBoostEnabled: () => false,
    updateMediaSession: () => {},
    onInterrupted: () => {},
    onFallbackToTTS: () => {}
  });

  try {
    await players.speak(manifest[0].text, manifest[0].speaker);
    lineIndex = 1;
    await players.speak(manifest[1].text, manifest[1].speaker);

    assert.equal(createdAudioCount, 1);
    assert.equal(audioElement.src, '/audio/test/line-0002.mp3');
  } finally {
    global.Audio = OriginalAudio;
  }
});
