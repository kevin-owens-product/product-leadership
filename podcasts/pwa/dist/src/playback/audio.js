export function createSpeechPlayers({
  synth,
  getSpeechRate
}) {
  let activeAudio = null;

  function stopCurrentSpeech() {
    if (synth && typeof synth.cancel === 'function') synth.cancel();
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
  }

  function resumeCurrentSpeech() {
    if (activeAudio && activeAudio.paused) {
      const promise = activeAudio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }

  function playGeneratedAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.playbackRate = Math.max(0.5, Math.min(4, Number(getSpeechRate()) || 1));

      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        if (activeAudio === audio) activeAudio = null;
        if (value === undefined) fn();
        else fn(value);
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

  async function speak(text, speaker, options = {}) {
    if (!options || !options.audioUrl) {
      throw new Error(`Missing generated Supertonic audio for ${speaker || 'line'}: ${String(text || '').slice(0, 80)}`);
    }
    return playGeneratedAudio(options.audioUrl);
  }

  return {
    speak,
    stopCurrentSpeech,
    pauseCurrentSpeech,
    resumeCurrentSpeech,
    playGeneratedAudio
  };
}
