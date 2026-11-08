import { PAD_ITEM_MENU_ATTR } from "./pad-item-menu-events";

/**
 * The controller's highlight hovers what it's on, so tooltips show for it as they do for the
 * mouse. Going into an item's hold menu keeps the item hovered, so its tooltip says what the
 * menu is for, until the highlight goes anywhere else.
 */

/* The item whose menu is open, still hovered */
let kept: Element | null = null;

const inItemMenu = (el: Element | null) => !!el?.closest(`[${PAD_ITEM_MENU_ATTR}]`);

const hover = (el: Element, type: "mouseover" | "mouseout", related: Element | null) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: related }));

/** The highlight is leaving `from` for `to`: hovers out of what it should. */
export function hoverOut(from: Element | null, to: Element | null) {
  if (from && inItemMenu(to) && !inItemMenu(from)) {
    kept = from;
    return;
  }
  if (from) hover(from, "mouseout", to);
  if (kept && kept !== to && !inItemMenu(to)) {
    hover(kept, "mouseout", to);
    kept = null;
  }
}

/** The highlight came onto `el`. */
export function hoverIn(el: Element) {
  if (el === kept) kept = null;
  hover(el, "mouseover", null);
}
