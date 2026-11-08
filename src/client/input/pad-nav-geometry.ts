/** Where things sit for the controller's menu highlight: which is next, which are in view. */

export type NavDirection = "up" | "down" | "left" | "right";

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** The nearest of `els` that way, favouring ones straight ahead. */
export function nearest(els: Element[], fromRect: DOMRect, direction: NavDirection) {
  const horizontal = direction === "left" || direction === "right";
  const from = center(fromRect);
  const [ax, ay] = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  }[direction];
  /* Something in line (overlapping sideways) always beats something off to the side */
  let best: Element | null = null;
  let bestScore = Infinity;
  let bestInLine = false;
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    const to = center(rect);
    const ahead = (to.x - from.x) * ax + (to.y - from.y) * ay;
    if (ahead <= 1) continue;
    /* Sideways by the gap between their edges, not their centres: a slider in the right half
     * of a row is straight below a toggle that spans the whole row */
    const across = horizontal
      ? gap(fromRect.top, fromRect.bottom, rect.top, rect.bottom)
      : gap(fromRect.left, fromRect.right, rect.left, rect.right);
    const inLine = across === 0;
    const score = ahead + across * 2;
    if ((inLine && !bestInLine) || (inLine === bestInLine && score < bestScore)) {
      bestScore = score;
      best = el;
      bestInLine = inLine;
    }
  }
  return best;
}

const scrolls = (el: Element) => /(auto|scroll)/.test(getComputedStyle(el).overflowY);

/** The scrolling pane `el` is in, inside `root`, if any. */
export function scroller(el: Element, root: Element) {
  for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
    if (scrolls(up)) return up;
  }
  return null;
}

/** Whether `el` shows inside every pane round it (not scrolled out of view). */
export function inView(el: Element, root: Element) {
  const r = el.getBoundingClientRect();
  for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
    if (!scrolls(up)) continue;
    const p = up.getBoundingClientRect();
    if (r.bottom <= p.top || r.top >= p.bottom || r.right <= p.left || r.left >= p.right) {
      return false;
    }
  }
  return true;
}

/** How far apart two spans are, or 0 when they overlap. */
const gap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, b0 - a1, a0 - b1);
