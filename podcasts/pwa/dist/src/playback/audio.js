export function createSpeechPlayers({
  synth,
  getVoices,
  getSpeechRate
}) {
  const MAX_CHARS_PER_UTTERANCE = 260;
  const MIN_UTTERANCE_TIMEOUT_MS = 4000;
  const MAX_UTTERANCE_TIMEOUT_MS = 45000;
  let activeUtterance = null;
  let activeAudio = null;

  function stopCurrentSpeech() {
    synth.cancel();
    activeUtterance = null;
    if (activeAudio) {
      try { activeAudio.pause(); } catch { /* ignore */ }
      activeAudio.src = '';
      activeAudio = null;
    }
  }

  function pauseCurrentSpeech() {
    if (activeAudio && !activeAudio.paused) {
      try { activeAudio.pause(); } catch { /* ignore */ }
    }
    // For native TTS, callers continue to use synth.pause() directly.
  }

  function resumeCurrentSpeech() {
    if (activeAudio && activeAudio.paused) {
      const promise = activeAudio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }

  function playPrebakedAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.playbackRate = Math.max(0.5, Math.min(4, Number(getSpeechRate()) || 1));

      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        if (activeAudio === audio) activeAudio = null;
        fn(value);
      };

      audio.onended = () => settle(resolve);
      audio.onerror = () => settle(reject, new Error(`Failed to play ${url}`));

      activeAudio = audio;
      const startPromise = audio.play();
      if (startPromise && typeof startPromise.catch === 'function') {
        startPromise.catch((err) => settle(reject, err));
      }
    });
  }

  function splitIntoUtteranceChunks(text, maxChars = MAX_CHARS_PER_UTTERANCE) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    if (normalized.length <= maxChars) return [normalized];

    const sentenceParts = normalized.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';

    const flushCurrent = () => {
      if (current) {
        chunks.push(current);
        current = '';
      }
    };

    const pushByWords = (segment) => {
      const words = segment.split(/\s+/).filter(Boolean);
      let built = '';
      for (const word of words) {
        const next = built ? `${built} ${word}` : word;
        if (next.length <= maxChars) {
          built = next;
          continue;
        }
        if (built) {
          chunks.push(built);
        }
        if (word.length > maxChars) {
          for (let i = 0; i < word.length; i += maxChars) {
            chunks.push(word.slice(i, i + maxChars));
          }
          built = '';
        } else {
          built = word;
        }
      }
      if (built) chunks.push(built);
    };

    for (const sentence of sentenceParts) {
      if (sentence.length > maxChars) {
        flushCurrent();
        pushByWords(sentence);
        continue;
      }

      const next = current ? `${current} ${sentence}` : sentence;
      if (next.length <= maxChars) {
        current = next;
      } else {
        flushCurrent();
        current = sentence;
      }
    }
    flushCurrent();
    return chunks;
  }

  function estimateUtteranceTimeoutMs(text, speechRate) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    const safeRate = Math.max(0.5, Number(speechRate) || 1);
    const estimatedMs = ((words / (150 * safeRate)) * 60 * 1000) + 6000;
    return Math.max(MIN_UTTERANCE_TIMEOUT_MS, Math.min(MAX_UTTERANCE_TIMEOUT_MS, Math.round(estimatedMs)));
  }

  function speakSingleUtterance(text, speaker) {
    return new Promise((resolve, reject) => {
      const { alexVoice, samVoice } = getVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      if (speaker === 'alex' && alexVoice) utterance.voice = alexVoice;
      if (speaker === 'sam' && samVoice) utterance.voice = samVoice;
      utterance.rate = getSpeechRate();
      utterance.pitch = speaker === 'alex' ? 0.9 : 1.1;

      let settled = false;
      const timeoutMs = estimateUtteranceTimeoutMs(text, utterance.rate);
      const watchdog = setTimeout(() => {
        if (settled) return;
        console.warn('TTS watchdog timeout reached; skipping stalled utterance');
        if (activeUtterance === utterance) {
          synth.cancel();
        }
        settled = true;
        if (activeUtterance === utterance) activeUtterance = null;
        resolve();
      }, timeoutMs);

      const settle = (handler, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        if (activeUtterance === utterance) activeUtterance = null;
        handler(value);
      };

      activeUtterance = utterance;
      utterance.onend = () => {
        settle(resolve);
      };
      utterance.onerror = (e) => {
        settle(reject, e);
      };

      synth.speak(utterance);
    });
  }

  async function speakWithTTS(text, speaker) {
    synth.cancel();
    activeUtterance = null;

    const chunks = splitIntoUtteranceChunks(text);
    for (const chunk of chunks) {
      await speakSingleUtterance(chunk, speaker);
    }
  }

  async function speak(text, speaker, options = {}) {
    if (options && options.audioUrl) {
      try {
        await playPrebakedAudio(options.audioUrl);
        return;
      } catch (err) {
        console.warn(`Pre-baked audio failed (${options.audioUrl}), falling back to TTS:`, err);
        // fall through to TTS
      }
    }
    return speakWithTTS(text, speaker);
  }

  return {
    speak,
    stopCurrentSpeech,
    pauseCurrentSpeech,
    resumeCurrentSpeech,
    speakWithTTS,
    playPrebakedAudio,
    splitIntoUtteranceChunks
  };
}
