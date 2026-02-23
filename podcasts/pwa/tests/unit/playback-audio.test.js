import test from 'node:test';
import assert from 'node:assert/strict';

import { createSpeechPlayers } from '../../src/playback/audio.js';

test('audio segment completion does not trigger interruption handler', async () => {
  const OriginalAudio = global.Audio;

  class FakeAudio {
    constructor() {
      this.handlers = new Map();
      this.ended = false;
      this.playbackRate = 1;
      this.preload = 'auto';
      this.src = '';
    }

    setAttribute() {}

    addEventListener(event, handler) {
      if (!this.handlers.has(event)) this.handlers.set(event, []);
      this.handlers.get(event).push(handler);
    }

    emit(event) {
      const listeners = this.handlers.get(event) || [];
      listeners.forEach(listener => listener());
    }

    pause() {
      this.emit('pause');
    }

    play() {
      if (typeof this.onplay === 'function') this.onplay();

      // Simulate browser order where pause can happen as media naturally ends.
      this.emit('pause');
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
