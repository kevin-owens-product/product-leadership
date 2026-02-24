export function createSpeechPlayers({
  synth,
  getVoices,
  getSpeechRate
}) {
  const MAX_CHARS_PER_UTTERANCE = 260;
  const MIN_UTTERANCE_TIMEOUT_MS = 4000;
  const MAX_UTTERANCE_TIMEOUT_MS = 45000;
  let activeUtterance = null;

  function stopCurrentSpeech() {
    synth.cancel();
    activeUtterance = null;
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

  async function speak(text, speaker) {
    return speakWithTTS(text, speaker);
  }

  return {
    speak,
    stopCurrentSpeech,
    speakWithTTS,
    splitIntoUtteranceChunks
  };
}
