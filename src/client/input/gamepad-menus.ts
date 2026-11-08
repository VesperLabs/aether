import {
  activateNavFocus,
  cancelNavHold,
  leaveNavPopover,
  dropNavFocus,
  focusSelectedTab,
  itemUnderNav,
  isMenuMode,
  moveNavFocus,
  setMenuMode,
  useNavFocus,
  type NavDirection,
} from "./pad-nav";
import { closeNavList } from "./pad-list";
import { areMenusOpen, isModalOpen } from "./last-device";
import { isPadItemMenuOpen, openPadItemMenu } from "./pad-item-menu-events";
import {
  isPadKeyboardOpen,
  isPadPopupOpen,
  resumeTyping,
  sendPadKeyboard,
  type PadKeyboardAction,
} from "./pad-keyboard-events";

/* Standard mapping, by letter (see `readPressed`) */
const A = 0;
const B = 1;
const X = 2;
const Y = 3;
const LB = 4;
const RB = 5;
const LT = 6;
const RT = 7;
const BACK = 8;
const START = 9;
const DPAD: Record<number, NavDirection> = { 12: "up", 13: "down", 14: "left", 15: "right" };

/** How far the stick goes before it moves the highlight, and how fast a held one repeats. */
const STICK_PUSH = 0.5;
const REPEAT_DELAY_MS = 200;
const REPEAT_EVERY_MS = 50;

/** Whether the controller is driving menus, not the hero. */
export const isNavActive = () =>
  isPadKeyboardOpen() || isPadPopupOpen() || isPadItemMenuOpen() || isModalOpen() || isMenuMode();

/* On the on-screen keyboard, the face buttons and Start and Select are its shortcuts */
const KEYBOARD_BUTTONS: Record<number, PadKeyboardAction> = {
  1: "back",
  2: "shift",
  3: "space",
  8: "close",
  9: "done",
};

/**
 * One button pressed while in menus. `tap` sends a key down and up, for what the menus already
 * do on a key (Esc closes, the arrows step tabs). `play` hands the button to its game action.
 */
export function navPress(
  index: number,
  tap: (key: string, modalOnly?: boolean) => void,
  play: () => void,
) {
  /* The d-pad moves through `navSteer`, which repeats while it's held */
  if (DPAD[index]) return;
  /* A list that took over from typing (chat's commands): A picks, B goes back; either way
   * back to typing, as a command still wants its arguments */
  if (isPadPopupOpen() && !isPadKeyboardOpen()) {
    if (index === A) activateNavFocus();
    if (index === A || index === B) resumeTyping();
    return;
  }
  /* The item menu: A picks an option, anything else that backs out closes it */
  if (isPadItemMenuOpen()) {
    if (index === A) return activateNavFocus();
    if (index === B || index === START || index === BACK) openPadItemMenu(null);
    return;
  }
  if (isPadKeyboardOpen()) {
    if (index === A) return activateNavFocus();
    const action = KEYBOARD_BUTTONS[index];
    if (action) sendPadKeyboard(action);
    return;
  }
  switch (index) {
    case A: {
      /* On an item, wait: a tap picks it up on release, a hold opens its menu (`navHold`) */
      const item = itemUnderNav();
      if (item) {
        pendingItem = { slot: item, at: performance.now() };
        return;
      }
      return activateNavFocus();
    }
    case B:
      if (cancelNavHold()) return;
      if (closeNavList()) return;
      if (leaveNavPopover()) return;
      if (isModalOpen() || areMenusOpen()) return tap("ESCAPE");
      return setMenuMode(false);
    case X:
      return useNavFocus();
    case Y:
      return dropNavFocus();
    case LB:
    case RB:
    case LT:
    case RT:
      /* Either pair of shoulders steps a modal's tabs, and the highlight follows to the new one */
      /* Outside a modal there are no tabs: the triggers step the highlight, through `navSteer` */
      if (!isModalOpen()) return;
      tap(index === LB || index === LT ? "ARROWLEFT" : "ARROWRIGHT");
      return requestAnimationFrame(focusSelectedTab);
    case START:
      /* A modal's Enter button (OK, Save, Respawn); outside one, Start leaves menu mode */
      return isModalOpen() ? tap("ENTER", true) : setMenuMode(false);
    case BACK:
      if (!isModalOpen()) setMenuMode(false);
      return;
    default:
      /* Anything else keeps its game action */
      return play();
  }
}

/** How long A is held on an item before its menu opens. */
const ITEM_MENU_HOLD_MS = 400;

/* A pressed on an item, not yet a tap or a hold */
let pendingItem: { slot: Element; at: number } | null = null;

/** A held on an item long enough opens its menu. Call each frame with whether A is down. */
export function navHold(aDown: boolean, now: number) {
  if (!pendingItem) return;
  if (aDown && now - pendingItem.at >= ITEM_MENU_HOLD_MS) {
    openPadItemMenu(pendingItem.slot);
    pendingItem = null;
  }
}

/** A let go: on an item before it became a hold, a tap, which picks the item up. */
export function navRelease(index: number) {
  if (index !== A || !pendingItem) return;
  pendingItem = null;
  activateNavFocus();
}

let stickDirection: NavDirection | null = null;
let nextRepeatAt = 0;

/**
 * The d-pad, left stick or (outside a modal) triggers step the highlight: once on a push, then repeating while held.
 * `down` is which buttons are held, for the d-pad.
 */
export function navSteer(stick: { x: number; y: number }, down: boolean[], now: number) {
  const { x, y } = stick;
  const dpad = Object.keys(DPAD).find((i) => down[Number(i)]);
  /* Outside a modal (where they step tabs), the triggers step left and right too */
  const trigger = isModalOpen() ? undefined : down[LT] ? "left" : down[RT] ? "right" : undefined;
  const direction: NavDirection | null = dpad
    ? DPAD[Number(dpad)]
    : trigger
      ? trigger
      : Math.max(Math.abs(x), Math.abs(y)) < STICK_PUSH
        ? null
        : Math.abs(x) > Math.abs(y)
          ? x > 0
            ? "right"
            : "left"
          : y > 0
            ? "down"
            : "up";
  if (direction !== stickDirection) {
    stickDirection = direction;
    nextRepeatAt = now + REPEAT_DELAY_MS;
    if (direction) moveNavFocus(direction);
    return;
  }
  if (direction && now >= nextRepeatAt) {
    nextRepeatAt = now + REPEAT_EVERY_MS;
    moveNavFocus(direction);
  }
}
