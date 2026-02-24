export function createSpeechPlayers({
  synth,
  getVoices,
  getSpeechRate
}) {
  let activeUtterance = null;

  function stopCurrentSpeech() {
    synth.cancel();
    activeUtterance = null;
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

  async function speak(text, speaker) {
    return speakWithTTS(text, speaker);
  }

  return {
    speak,
    stopCurrentSpeech,
    speakWithTTS
  };
}
