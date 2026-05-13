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

test('speak splits long text into multiple utterances', async () => {
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

  const spokenTexts = [];
  const synth = {
    cancel() {},
    speak(utterance) {
      spokenTexts.push(utterance.text);
      if (typeof utterance.onend === 'function') {
        utterance.onend();
      }
    }
  };

  const players = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1
  });

  const longText = Array.from({ length: 120 }, (_, idx) => `Sentence ${idx + 1}.`).join(' ');

  try {
    await players.speak(longText, 'sam');
    assert.ok(spokenTexts.length > 1);
    assert.ok(spokenTexts.every(chunk => chunk.length <= 260));
  } finally {
    global.SpeechSynthesisUtterance = OriginalUtterance;
  }
});

test('speak watchdog resolves stalled utterances', async () => {
  const OriginalUtterance = global.SpeechSynthesisUtterance;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

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
  global.setTimeout = (fn) => {
    fn();
    return 1;
  };
  global.clearTimeout = () => {};

  let cancelCount = 0;
  const synth = {
    cancel() {
      cancelCount += 1;
    },
    speak() {}
  };

  const players = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1
  });

  try {
    await players.speak('This utterance will stall', 'alex');
    assert.ok(cancelCount >= 1);
  } finally {
    global.SpeechSynthesisUtterance = OriginalUtterance;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('speak plays pre-baked audio when audioUrl is provided', async () => {
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
    getVoices: () => ({ alexVoice: null, samVoice: null }),
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

test('speak falls back to TTS when pre-baked audio fails', async () => {
  const OriginalAudio = global.Audio;
  const OriginalUtterance = global.SpeechSynthesisUtterance;

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

  global.Audio = FakeAudio;
  global.SpeechSynthesisUtterance = FakeUtterance;

  let spoken = null;
  const synth = {
    cancel() {},
    speak(utterance) {
      spoken = utterance;
      if (typeof utterance.onend === 'function') utterance.onend();
    }
  };

  const players = createSpeechPlayers({
    synth,
    getVoices: () => ({ alexVoice: null, samVoice: null }),
    getSpeechRate: () => 1
  });

  try {
    await players.speak('hello fallback', 'alex', { audioUrl: 'broken.mp3' });
    assert.ok(spoken, 'expected synth.speak to be called as fallback');
    assert.equal(spoken.text, 'hello fallback');
  } finally {
    global.Audio = OriginalAudio;
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
