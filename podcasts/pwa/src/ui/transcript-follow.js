// Transcript follow-mode: the transcript auto-scrolls to the current line
// while the user leaves it alone. Any deliberate scroll (wheel, touch drag,
// scrollbar) suspends following and shows a "resync" pill; tapping the pill
// (or tapping a transcript line to seek) re-engages following.
//
// Distinguishing our own smooth scrollIntoView from user scrolling is the
// tricky part: wheel/touchmove are unambiguous user intent, while bare
// 'scroll' events only count as the user's when they fall outside a short
// window opened around each programmatic scroll.

export const PROGRAMMATIC_SCROLL_WINDOW_MS = 900;

export function createTranscriptFollow({
  container,
  pill,
  onResync = () => {},
  now = () => Date.now()
} = {}) {
  let following = true;
  let programmaticUntil = 0;

  function updatePill() {
    if (pill) pill.hidden = following;
  }

  function isFollowing() {
    return following;
  }

  // Call right before every auto-scroll so the resulting 'scroll' events are
  // not mistaken for the user's.
  function notifyAutoScroll() {
    programmaticUntil = now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
  }

  function suspend() {
    if (!following) return;
    following = false;
    updatePill();
  }

  function resync() {
    following = true;
    updatePill();
    notifyAutoScroll();
    onResync();
  }

  function handleUserScrollIntent() {
    suspend();
  }

  function handleScroll() {
    if (now() < programmaticUntil) return;
    suspend();
  }

  function bind() {
    if (container && typeof container.addEventListener === 'function') {
      container.addEventListener('wheel', handleUserScrollIntent, { passive: true });
      container.addEventListener('touchmove', handleUserScrollIntent, { passive: true });
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    if (pill && typeof pill.addEventListener === 'function') {
      pill.addEventListener('click', resync);
    }
    updatePill();
  }

  return { bind, isFollowing, notifyAutoScroll, suspend, resync };
}
