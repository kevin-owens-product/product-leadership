export function createPlaybackSessionController() {
  let playbackSessionId = 0;

  return {
    createSession() {
      playbackSessionId += 1;
      return playbackSessionId;
    },
    invalidate() {
      playbackSessionId += 1;
    },
    isActive(sessionId) {
      return sessionId === playbackSessionId;
    }
  };
}
