export function createSpeechPlayers({
  synth,
  getVoices,
  getSpeechRate,
  getAudioElement,
  setAudioElement,
  getUseAudio,
  getAudioManifest,
  getCurrentLineIndex,
  buildAudioUrl,
  setupWebAudio,
  isVoiceBoostEnabled,
  updateMediaSession,
  onInterrupted,
  onFallbackToTTS
}) {
  let activeUtterance = null;

  function stopCurrentSpeech() {
    synth.cancel();
    activeUtterance = null;
    const audioElement = getAudioElement();
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
  }

  function speakWithTTS(text, speaker) {
    return new Promise((resolve, reject) => {
      synth.cancel();
      activeUtterance = null;

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

  async function speakWithAudio(lineIndex) {
    return new Promise(async (resolve, reject) => {
      const manifest = getAudioManifest();
      const segment = manifest?.[lineIndex];
      if (!segment) {
        reject(new Error('No audio segment'));
        return;
      }

      const previous = getAudioElement();
      if (previous) {
        previous.pause();
        previous.src = '';
      }

      const audioElement = new Audio(buildAudioUrl(segment.file));
      audioElement.playbackRate = getSpeechRate();
      audioElement.preload = 'auto';
      audioElement.setAttribute('playsinline', '');
      audioElement.setAttribute('x-webkit-airplay', 'allow');
      audioElement.preservesPitch = true;
      setAudioElement(audioElement);

      if (isVoiceBoostEnabled()) {
        await setupWebAudio();
      }

      audioElement.onplay = () => updateMediaSession();
      audioElement.onended = () => resolve();
      audioElement.onerror = async () => {
        audioElement.pause();
        audioElement.src = '';
        onFallbackToTTS?.();
        try {
          await speakWithTTS(segment.text, segment.speaker);
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      audioElement.addEventListener('pause', () => {
        // Browsers emit `pause` during natural completion; treat only true interruptions.
        queueMicrotask(() => {
          if (!audioElement.ended) {
            onInterrupted?.();
          }
        });
      });

      audioElement.play().catch(async () => {
        audioElement.pause();
        audioElement.src = '';
        onFallbackToTTS?.();
        try {
          await speakWithTTS(segment.text, segment.speaker);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async function speak(text, speaker) {
    if (getUseAudio() && getAudioManifest()?.[getCurrentLineIndex()]) {
      return speakWithAudio(getCurrentLineIndex());
    }
    return speakWithTTS(text, speaker);
  }

  return {
    speak,
    stopCurrentSpeech,
    speakWithTTS,
    speakWithAudio
  };
}
