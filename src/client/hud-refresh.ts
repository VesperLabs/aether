let isQueued = false;

/**
 * Asks the HUD to re-read the hero, at most once per frame. Vitals and hits can land several times
 * in one frame during a fight, and each refresh re-renders the whole HUD.
 */
export function refreshHud() {
  if (isQueued) return;
  isQueued = true;
  requestAnimationFrame(() => {
    isQueued = false;
    window.dispatchEvent(new Event("UPDATE_HUD"));
  });
}
