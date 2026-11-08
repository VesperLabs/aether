/**
 * The HUD's menu panels (inventory, abilities, equipment, ...) for the controller's highlight:
 * it remembers where it was in each, and goes into one as its menu button opens it.
 */

/** On every menu panel (`Menu`). Panels stay mounted, hidden while closed, so each is its key. */
const PANEL = "[data-pad-panel]";

/** How long after its button is pressed a panel may take to show. */
const OPEN_WAIT_MS = 600;

/* Where the highlight last was in each panel, as a place in its list of stops */
const lastSpot = new WeakMap<Element, number>();

type Stops = (root: Element) => Element[];

/** Notes `el`'s place in its panel, to come back to. */
export function rememberPanelSpot(el: Element, stops: Stops) {
  const panel = el.closest(PANEL);
  if (!panel) return;
  const index = stops(panel).indexOf(el);
  if (index >= 0) lastSpot.set(panel, index);
}

/** Where to land in `panel`: where it last was, else its first stop. */
function panelSpot(panel: Element, stops: Stops) {
  const all = stops(panel);
  return all[lastSpot.get(panel) ?? 0] ?? all[0] ?? null;
}

const shownPanels = (root: Element, isShown: (el: Element) => boolean) =>
  new Set([...root.querySelectorAll(PANEL)].filter(isShown));

/* A menu button just pressed, waiting for the panel it opens to show */
let opening: { from: Element; before: Set<Element>; until: number } | null = null;

/** A menu button (anything outside a panel) was pressed: watch for the panel it opens. */
export function watchForPanel(from: Element, root: Element, isShown: (el: Element) => boolean) {
  if (from.closest(PANEL)) return;
  opening = { from, before: shownPanels(root, isShown), until: performance.now() + OPEN_WAIT_MS };
}

/**
 * The panel a pressed button just opened, with where to land in it and the button to come back
 * to, or null. Call each frame.
 */
export function openedPanel(root: Element, isShown: (el: Element) => boolean, stops: Stops) {
  if (!opening) return null;
  if (performance.now() > opening.until) {
    opening = null;
    return null;
  }
  const before = opening.before;
  const panel = [...shownPanels(root, isShown)].find((p) => !before.has(p));
  if (!panel) return null;
  const { from } = opening;
  opening = null;
  const spot = panelSpot(panel, stops);
  return spot ? { spot, from } : null;
}
