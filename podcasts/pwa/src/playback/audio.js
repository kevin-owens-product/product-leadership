export function createSpeechPlayers({
  synth,
  getVoices,
  getSpeechRate
}) {
  const MAX_CHARS_PER_UTTERANCE = 260;
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

  function speakSingleUtterance(text, speaker) {
    return new Promise((resolve, reject) => {
      const { alexVoice, samVoice } = getVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      if (speaker === 'alex' && alexVoice) utterance.voice = alexVoice;
      if (speaker === 'sam' && samVoice) utterance.voice = samVoice;
      utterance.rate = getSpeechRate();
      utterance.pitch = speaker === 'alex' ? 0.9 : 1.1;

      activeUtterance = utterance;
      utterance.onend = () => {
        if (activeUtterance === utterance) activeUtterance = null;
        resolve();
      };
      utterance.onerror = (e) => {
        if (activeUtterance === utterance) activeUtterance = null;
        reject(e);
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
