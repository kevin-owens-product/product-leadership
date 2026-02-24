import test from 'node:test';
import assert from 'node:assert/strict';

import { createSpeechPlayers } from '../../src/playback/audio.js';

test('speak uses TTS voice/rate settings and resolves on end', async () => {
  const OriginalUtterance = global.SpeechSynthesisUtterance;

  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.voice = null;
      this.rate = 1;
      this.pitch = 1;
      this.onend = null;
      this.onerror = null;
    }
  }

  global.SpeechSynthesisUtterance = FakeUtterance;

  const alexVoice = { name: 'Alex Voice' };
  const samVoice = { name: 'Sam Voice' };
  let spoken = null;

  const synth = {
    cancel() {},
    speak(utterance) {
      spoken = utterance;
      if (typeof utterance.onend === 'function') {
        utterance.onend();
      }
    }
  };

  const players = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice, samVoice }),
    getSpeechRate: () => 1.25
  });

  try {
    await players.speak('Hello world', 'alex');
    assert.equal(spoken.text, 'Hello world');
    assert.equal(spoken.voice, alexVoice);
    assert.equal(spoken.rate, 1.25);
    assert.equal(spoken.pitch, 0.9);
  } finally {
    global.SpeechSynthesisUtterance = OriginalUtterance;
  }
});

test('stopCurrentSpeech calls synth.cancel', () => {
  let cancelled = 0;
  const synth = {
    cancel() {
      cancelled += 1;
    },
    speak() {}
  };

  const players = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1
  });

  players.stopCurrentSpeech();
  assert.equal(cancelled, 1);
});
