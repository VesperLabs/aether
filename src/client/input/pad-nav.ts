import { PAD_DROP_EVENT, PAD_USE_EVENT } from "@/ui/item/pad-slot-events";
import { MODAL_ATTR } from "@/ui/kit/shake-modal";
import { HUD_CONTAINER_ID } from "@/client/hud/app/constants";
import { PAD_KEYBOARD_ATTR, PAD_POPUP_ATTR, choosePadField } from "./pad-keyboard-events";
import { PAD_ITEM_MENU_ATTR } from "./pad-item-menu-events";
import { GOLD, drawHighlight } from "./pad-highlight";
import { openedPanel, rememberPanelSpot, watchForPanel } from "./pad-panels";
import { inView, nearest, scrollToFocus, scroller, type NavDirection } from "./pad-nav-geometry";
import { isRange, stepRange } from "./pad-range";
import { hoverIn, hoverOut } from "./pad-hover";
import { LIST } from "./pad-list";

export type { NavDirection } from "./pad-nav-geometry";

export { NO_CORNER_BADGE } from "./pad-highlight";

/**
 * Menus with a controller: a highlight moves between the buttons, tabs and item slots on screen,
 * A presses what it's on, and items are picked up and put down with A. Runs whenever a modal is
 * open, and in "menu mode" for the HUD's menus, which Back or a menu shortcut turns on.
 */

const FOCUS_ATTR = "data-pad-focus";
/** Marks a control the menu highlight passes over: action buttons with their own controller buttons. */
export const PAD_SKIP_ATTR = "data-pad-skip";
/** Where menu mode keeps the highlight: the menu bar and its panels, not the whole HUD. */
export const PAD_SCOPE_ATTR = "data-pad-scope";
/** Marks something that isn't a control (a quest's slot) as a stop for the highlight. */
export const PAD_STOP_ATTR = "data-pad-stop";
/** Marks content shown outside the menus (a tooltip, in its portal) whose controls the highlight
 * reaches while it's open, as if they were beside what opened it. */
export const PAD_POPOVER_ATTR = "data-pad-popover";
const HELD_ATTR = "data-pad-held";
/** Where menu mode starts: the inventory's menu button. */
const HOME_SELECTOR = "#loot-target";
const CANDIDATES = [
  "button:not(:disabled)",
  "[role='tab']",
  "[role='option']",
  "[data-slot-key]",
  /* A toggle's checkbox is hidden; its label is what shows, and clicking it toggles */
  "label:has(input:not(:disabled))",
  "input:not(:disabled)",
  "a[href]",
  `[${PAD_STOP_ATTR}]`,
].join(",");

let menuMode = false;
let focused: Element | null = null;
let held: Element | null = null;

export const isMenuMode = () => menuMode;

/**
 * Where to badge the controller button that acts there: A on the highlight while menus are up,
 * or Start on the item menu mode will come back to while they're closed.
 */
export function getNavBadge(): { target: Element; button: "A" | "START" } | null {
  if (focused) return { target: focused, button: "A" };
  if (menuMode) return null;
  /* Where it left off, or where it starts (the inventory button) before it's been used */
  const comeback = lastMenuFocus?.isConnected
    ? lastMenuFocus
    : document.querySelector(HOME_SELECTOR);
  if (comeback && isShown(comeback)) return { target: comeback, button: "START" };
  return null;
}

/* Where the highlight was when menu mode was left, to pick up there next time */
let lastMenuFocus: Element | null = null;

export function setMenuMode(on: boolean) {
  if (on === menuMode) return;
  menuMode = on;
  notify();
  if (on) return;
  if (focused && !document.querySelector(`[${MODAL_ATTR}]`)) lastMenuFocus = focused;
  clearFocus();
}

let styled = false;
/** A held item's mark: a dashed gold outline on the slot. */
function addStyle() {
  if (styled) return;
  styled = true;
  const style = document.createElement("style");
  style.textContent = `
    /* Over its neighbours: a highlight drawn inside a control reaches past its edge, where the
       next key or button along would otherwise paint over it */
    [${FOCUS_ATTR}] { z-index: 2; }
    [${HELD_ATTR}] { outline: 2px dashed ${GOLD} !important; outline-offset: 1px; opacity: .6; }
  `;
  document.head.appendChild(style);
}

const POPUPS = `[${PAD_KEYBOARD_ATTR}], [${PAD_ITEM_MENU_ATTR}], [${PAD_POPUP_ATTR}], ${LIST}`;

/** The on-screen keyboard, else the modal on top, else the menus while in menu mode. */
function scope(): Element | null {
  const popup = document.querySelector(POPUPS);
  if (popup) return popup;
  const modals = document.querySelectorAll(`[${MODAL_ATTR}]`);
  if (modals.length) return modals[modals.length - 1];
  if (!menuMode) return null;
  return document.querySelector(`[${PAD_SCOPE_ATTR}]`) ?? document.getElementById(HUD_CONTAINER_ID);
}

const isShown = (el: Element) => {
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  /* Hidden tab panels keep their size but not their visibility */
  return el.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) ?? true;
};

function candidates(root: Element) {
  return [...root.querySelectorAll(CANDIDATES)].filter((el) => {
    /* The outermost of nested candidates in this area (a slot inside a button). One inside a
     * control outside it, as chat's command list is inside chat's button, still counts */
    const outer = el.parentElement?.closest(CANDIDATES);
    const nested = !!outer && root.contains(outer);
    return isShown(el) && !nested && !el.closest(`[${PAD_SKIP_ATTR}]`);
  });
}

const inPopover = (el: Element) => !!el.closest(`[${PAD_POPOVER_ATTR}]`);

/** What the highlight can reach in `root`: its own things, and those in any open popover. */
function reachable(root: Element) {
  const popovers = [...document.querySelectorAll(`[${PAD_POPOVER_ATTR}]`)].filter(
    (popover) => !root.contains(popover) && isShown(popover),
  );
  return [...candidates(root), ...popovers.flatMap(candidates)];
}

const openPopoverControls = () =>
  [...document.querySelectorAll(`[${PAD_POPOVER_ATTR}]`)].filter(isShown).flatMap(candidates);

/* What was highlighted before the highlight went into a popover, to come back to when it closes */
let popoverFrom: Element | null = null;

/** Moves the highlight to `el`. `quiet` leaves out the hover, so its tooltip stays shut. */
function setFocus(el: Element | null, quiet = false) {
  if (el === focused) return;
  addStyle();
  if (el && inPopover(el) && focused && !inPopover(focused)) popoverFrom = focused;
  focused?.removeAttribute(FOCUS_ATTR);
  hoverOut(focused, el);
  focused = el;
  if (el) {
    rememberPanelSpot(el, candidates);
    rememberKey(el);
    el.setAttribute(FOCUS_ATTR, "");
    if (!quiet) hoverIn(el);
    scrollToFocus(el, candidates);
  }
  drawHighlight(focused);
  notify();
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Called the moment the highlight moves or menu mode changes, so its badge keeps up. */
export function onNavChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearFocus() {
  setFocus(null);
  dropHeld();
}

function dropHeld() {
  held?.removeAttribute(HELD_ATTR);
  held = null;
}

/** Keeps the highlight on something in the current scope; drops it when there is no scope. */
/** Keeps the highlight on something in the current scope. `active` false (the controller put
 * down) takes it away, remembering nothing. */
export function syncNavFocus(active = true) {
  if (!active) {
    clearFocus();
    return drawHighlight(null);
  }
  drawHighlight(focused);
  const root = scope();
  if (!root) return clearFocus();
  /* A menu button just opened its panel: in, where it last was, with the button to back out to */
  const opened = openedPanel(root, isShown, candidates);
  if (opened) {
    returnTo.push(opened.from);
    return setFocus(opened.spot);
  }
  if (focused?.isConnected && isShown(focused)) {
    if (root.contains(focused) || (inPopover(focused) && reachable(root).includes(focused))) return;
  }
  /* Its popover closed (its Close was pressed): back on what opened it, leaving it shut */
  if (focused && inPopover(focused) && popoverFrom?.isConnected && root.contains(popoverFrom)) {
    const from = popoverFrom;
    popoverFrom = null;
    if (isShown(from)) return setFocus(from, true);
  }
  /* Into a new area (a modal opened from the menus, the on-screen keyboard): remember where it
   * came from, to go back to when that closes. Into the keyboard, that's the field being typed in */
  const typing = root.matches(`[${PAD_KEYBOARD_ATTR}]`)
    ? document.activeElement?.closest("input, textarea")
    : null;
  /* Typing in a field inside another stop (chat's box, in its button): that stop, which outlasts
   * the field when sending closes the box */
  const typedIn = typing && (outermostStop(typing, document.body) ?? typing);
  const from = typedIn || (focused?.isConnected && !root.contains(focused) ? focused : null);
  if (from && returnTo.at(-1) !== from) returnTo.push(from);
  /* Back out of one: the last place remembered in this area, dropping any closed since */
  while (returnTo.length) {
    const back = returnTo.at(-1) as Element;
    if (!back.isConnected) {
      returnTo.pop();
      continue;
    }
    if (!root.contains(back)) break;
    returnTo.pop();
    /* A field inside another stop (chat's box, in its button) comes back to that stop */
    const stop = outermostStop(back, root);
    if (stop && isShown(stop)) return setFocus(stop);
  }
  startFocus(root);
}

/** The outermost highlightable thing `el` is or sits in, inside `root`. */
function outermostStop(el: Element, root: Element) {
  let stop: Element | null = el.matches(CANDIDATES) ? el : null;
  for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
    if (up.matches(CANDIDATES)) stop = up;
  }
  return stop;
}

/* Where the highlight was before each area it's moved into, latest last */
const returnTo: Element[] = [];

/* The on-screen keyboard's last key, as its place among the keys */
let lastKey = 0;

function rememberKey(el: Element) {
  const keyboard = el.closest(`[${PAD_KEYBOARD_ATTR}]`);
  if (!keyboard) return;
  const index = candidates(keyboard).indexOf(el);
  if (index >= 0) lastKey = index;
}

/** The first highlight in a new scope. */
function startFocus(root: Element) {
  const all = candidates(root);
  /* The keyboard opens new each time: back on the key last used, by its place */
  if (root.matches(`[${PAD_KEYBOARD_ATTR}]`)) return setFocus(all[lastKey] ?? all[0] ?? null);
  /* A dropdown opens on the option it's set to */
  if (root.matches(LIST))
    return setFocus(all.find((el) => el.matches("[aria-selected='true']")) ?? all[0] ?? null);
  const inModal = !!document.querySelector(`[${MODAL_ATTR}]`);
  if (!inModal && lastMenuFocus && all.includes(lastMenuFocus)) return setFocus(lastMenuFocus);
  const home = !inModal && root.querySelector(HOME_SELECTOR);
  setFocus((home && all.find((el) => el.contains(home))) || all[0] || null);
}

/** Moves the highlight to the nearest thing that way, favouring ones straight ahead. */
export function moveNavFocus(direction: NavDirection) {
  const root = scope();
  if (!root) return;
  if (!focused) return syncNavFocus();
  const horizontal = direction === "left" || direction === "right";
  if (horizontal && isRange(focused)) return stepRange(focused, direction === "right" ? 1 : -1);
  const fromRect = focused.getBoundingClientRect();
  const all = reachable(root).filter((el) => el !== focused);
  /* In a scrolling pane, stay in it until its end: its next item, even scrolled out of view,
   * scrolls in. Leaving it, or anywhere else, only things you can see */
  const pane = scroller(focused, root);
  const inPane = pane ? all.filter((el) => scroller(el, root) === pane) : [];
  const best =
    nearest(inPane, fromRect, direction) ??
    nearest(
      all.filter((el) => (!pane || scroller(el, root) !== pane) && inView(el, root)),
      fromRect,
      direction,
    );
  if (best) setFocus(best);
}

const isSlot = (el: Element | null) => !!el?.matches("[data-slot-key]");
/* Some items have no id, only a base */
const hasItem = (el: Element | null) =>
  !!(el?.getAttribute("data-id") || el?.getAttribute("data-base"));

/**
 * A full mouse press: down, up, then click. The HUD's buttons act on the release of a press
 * (see `Button`), not on click, while tabs and plain buttons act on click.
 */
function press(el: Element) {
  const init = { bubbles: true, cancelable: true, button: 0 };
  el.dispatchEvent(new MouseEvent("mousedown", init));
  el.dispatchEvent(new MouseEvent("mouseup", init));
  (el as HTMLElement).click?.();
}

/** A: picks up or puts down an item, or presses whatever else is highlighted. */
export function activateNavFocus() {
  if (!focused) return syncNavFocus();
  if (held) {
    const from = held;
    dropHeld();
    if (from !== focused) {
      from.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: focused }));
    }
    return;
  }
  if (isSlot(focused)) {
    if (hasItem(focused)) {
      held = focused;
      held.setAttribute(HELD_ATTR, "");
    }
    return;
  }
  /* A stop with its popover open: into the popover's first button */
  const into = focused.matches(`[${PAD_STOP_ATTR}]`) && openPopoverControls()[0];
  if (into) return setFocus(into);
  /* Before pressing: the press may open its panel at once */
  const root = scope();
  /* Not from a popup (an item's menu): its options carry the highlight on themselves */
  if (root && menuMode && !root.matches(POPUPS)) watchForPanel(focused, root, isShown);
  press(focused);
  if (focused.matches("input, textarea")) {
    choosePadField(focused);
    (focused as HTMLInputElement).focus();
  }
}

/** The item under the highlight, when A can open its menu (none is held). */
export const itemUnderNav = () => (!held && isSlot(focused) && hasItem(focused) ? focused : null);

/** Picks up the item in `slot`, as A does, to put down elsewhere. */
export function holdNavItem(slot: Element) {
  setFocus(slot);
  held = slot;
  held.setAttribute(HELD_ATTR, "");
}

/** X: uses or equips the highlighted item. */
export function useNavFocus() {
  if (isSlot(focused) && hasItem(focused)) focused?.dispatchEvent(new CustomEvent(PAD_USE_EVENT));
}

/** B in a popover: back to what opened it. False when not in one. */
export function leaveNavPopover() {
  if (!focused || !inPopover(focused) || !popoverFrom?.isConnected) return false;
  setFocus(popoverFrom);
  return true;
}

/** B: lets go of a held item. False when there was none, so B goes on to close something. */
export function cancelNavHold() {
  if (!held) return false;
  dropHeld();
  return true;
}

/** Y: drops the held or highlighted item on the ground, as dragging it onto the world does. */
export function dropNavFocus() {
  const item = held ?? focused;
  const ground = document.querySelector("#game canvas");
  if (!isSlot(item) || !hasItem(item) || !ground) return;
  dropHeld();
  item?.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: ground }));
}

/** Puts the highlight on the selected tab, after the shoulders switched it. */
export function focusSelectedTab() {
  const tab = scope()?.querySelector("[role='tab'][aria-selected='true']");
  if (tab) setFocus(tab);
}

/** Puts the highlight on `el` in menu mode, as if the controller had moved it there. */
export function focusNavOn(el: Element) {
  setMenuMode(true);
  setFocus(el);
}
