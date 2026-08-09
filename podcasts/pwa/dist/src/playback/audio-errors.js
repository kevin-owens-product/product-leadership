// Classify failures from both HTMLMediaElement.error (numeric MediaError
// codes) and rejected HTMLMediaElement.play() promises (DOMException names).
// Network/abort failures should retry the existing continuous player: moving
// immediately to fresh per-line Audio elements can lose mobile autoplay
// permission during an automatic episode transition.

export function classifyContinuousAudioFailure(error) {
  const code = Number(error?.code);
  const name = String(error?.name || '');

  if (name === 'NotAllowedError') return 'gesture';

  if (
    code === 3 || // MEDIA_ERR_DECODE
    code === 4 || // MEDIA_ERR_SRC_NOT_SUPPORTED
    name === 'NotSupportedError' ||
    name === 'EncodingError'
  ) {
    return 'fallback';
  }

  // MEDIA_ERR_ABORTED / MEDIA_ERR_NETWORK, AbortError, NetworkError, and
  // unknown transient failures stay on the shared player and retry.
  return 'retry';
}
