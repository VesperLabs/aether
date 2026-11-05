/** Space to leave between a focused field and the edge of what's visible. */
const MARGIN_PX = 16;

type Edges = { top: number; bottom: number };

/** How far to scroll the page so `field` shows within `visible`; 0 if it already does. */
export function getRevealScroll(field: Edges, visible: Edges) {
  const below = field.bottom + MARGIN_PX - visible.bottom;
  if (below > 0) return below;
  return Math.min(0, field.top - MARGIN_PX - visible.top);
}

/** Scrolls the page so the field focused inside `container` isn't under the phone's keyboard. */
export function revealFocusedField(container: HTMLElement | null) {
  const field = document.activeElement;
  const viewport = window.visualViewport;
  if (!viewport || !field || field === document.body || !container?.contains(field)) return;
  const top = viewport.offsetTop;
  const scroll = getRevealScroll(field.getBoundingClientRect(), {
    top,
    bottom: top + viewport.height,
  });
  if (scroll) window.scrollBy(0, scroll);
}
