import { MODAL_ONLY_KEY } from "@/ui/kit/keyboard-key";
import {
  areMenusOpen,
  getLastDevice,
  isNintendoPad,
  setLastDevice,
  syncModalOpen,
} from "./last-device";
import { getBindings, keyFor, type BindAction } from "./key-bindings";
import { isNavActive, navHold, navPress, navRelease, navSteer } from "./gamepad-menus";
import { setMenuMode, syncNavFocus } from "./pad-nav";

/** Stick travel ignored, as resting sticks rarely read exactly zero. */
const DEAD_ZONE = 0.2;

const pressed = new Set<number>();

/* While a binding screen waits for a button, presses go to it, not the game. */
let paused = false;
export const pauseGamepadButtons = (pause: boolean) => {
  paused = pause;
};

/** The first connected controller, if any. */
export function getGamepad() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return undefined;
  return navigator.getGamepads().find((pad) => pad?.connected) ?? undefined;
}

/* Nintendo prints A on the right and B on the bottom (X top, Y left), the reverse of Xbox */
const NINTENDO_FACE = [1, 0, 3, 2];

/**
 * Which buttons are down, numbered by the letter printed on them, as an Xbox pad numbers them:
 * so A is always 0, whichever controller. Bindings are by letter, so A attacks and B dodges on
 * every controller, wherever that controller puts them.
 */
export function readPressed(pad = getGamepad()): boolean[] {
  if (!pad) return [];
  const pressed = pad.buttons.map((b) => b.pressed);
  if (!isNintendoPad(pad.id)) return pressed;
  return pressed.map((_, i) => pressed[NINTENDO_FACE[i] ?? i]);
}

/* Sent as a real keyboard names them: `KeyboardKey` reads the exact "ESCAPE" as "ESC" */
const BROWSER_KEYS: Record<string, string> = {
  SPACE: " ",
  ESCAPE: "Escape",
  ENTER: "Enter",
  SHIFT: "Shift",
  ARROWUP: "ArrowUp",
  ARROWDOWN: "ArrowDown",
  ARROWLEFT: "ArrowLeft",
  ARROWRIGHT: "ArrowRight",
};

/** A key event for a `KeyboardKey` name, so a button press reaches the same HUD buttons a key does. */
function keyEvent(type: "keydown" | "keyup", name: string, modalOnly = false) {
  const digit = /^\d$/.test(name);
  const event = new KeyboardEvent(type, {
    key: BROWSER_KEYS[name] ?? name,
    code: digit ? `Digit${name}` : "",
  });
  if (modalOnly) Object.defineProperty(event, MODAL_ONLY_KEY, { value: true });
  return event;
}

/* B by letter (○ on PlayStation) */
const BACK = 1;

/**
 * Keys a modal's own buttons answer to on a controller: B backs out (Esc) and Start confirms
 * (Enter). A presses whatever the menu highlight is on.
 */
export const MODAL_KEYS: Record<string, number> = {
  ESCAPE: BACK,
  ENTER: 9,
  /* The triggers step through tabs */
  ARROWLEFT: 6,
  ARROWRIGHT: 7,
};

/* Back (Select) and Start open menu mode; they can't be bound */
const MENU_BUTTON = 8;
const START_BUTTON = 9;
/* Opening one of these from the controller carries on into it, in menu mode */
const MENU_ACTIONS: BindAction[] = [
  "inventory",
  "equipment",
  "abilities",
  "stats",
  "quests",
  "social",
  "profile",
];

/** The keys each held button sent on its press, to let go of on its release. */
const fired = new Map<number, string>();
/* Modifiers held this time that went on to make a combo, so letting go of them does nothing */
const usedModifiers = new Set<number>();

const send = (type: "keydown" | "keyup", key: string) => window.dispatchEvent(keyEvent(type, key));
/** A key down and up. `modalOnly` keeps it to the open modal's buttons. */
const tap = (key: string, modalOnly = false) => {
  window.dispatchEvent(keyEvent("keydown", key, modalOnly));
  window.dispatchEvent(keyEvent("keyup", key, modalOnly));
};

/* Whether an NPC is in reach, so the talk button grabs instead when no one is */
let nearNpc = false;
export const setNearNpc = (near: boolean) => {
  nearNpc = near;
};

function readBindings() {
  const plain = new Map<number, BindAction>();
  const combos = new Map<string, BindAction>();
  const modifiers = new Set<number>();
  for (const [action, bind] of Object.entries(getBindings().gamepad)) {
    if (!bind) continue;
    if (bind.hold === undefined) plain.set(bind.button, action as BindAction);
    else {
      combos.set(`${bind.hold}+${bind.button}`, action as BindAction);
      modifiers.add(bind.hold);
    }
  }
  return { plain, combos, modifiers };
}

/** Lets go of every key a held button sent, so nothing stays held into menus or a pulled pad. */
function releaseKeys() {
  for (const key of fired.values()) send("keyup", key);
  fired.clear();
  usedModifiers.clear();
}

/** The key for an action; talk with no one in reach is a grab. */
function keyForAction(action: BindAction) {
  if (action === "talk" && !nearNpc) return keyFor("grab") ?? keyFor(action);
  return keyFor(action);
}

/** Presses an action's key, held until the button that pressed it is let go. */
function pressAction(index: number, action: BindAction | undefined) {
  const key = action && keyForAction(action);
  if (!key) return;
  send("keydown", key);
  fired.set(index, key);
  if (action && MENU_ACTIONS.includes(action)) setMenuMode(true);
}

/** A button pressed in play: a combo if its modifier is held, else its own action. */
function playPress(index: number, bindings: ReturnType<typeof readBindings>) {
  const { plain, combos, modifiers } = bindings;
  const modifier = [...pressed].find((held) => held !== index && modifiers.has(held));
  if (modifier === undefined && (index === MENU_BUTTON || index === START_BUTTON)) {
    return setMenuMode(true);
  }
  /* Side menus opened with the mouse still close on B; you can fight with them open */
  if (modifier === undefined && index === BACK && areMenusOpen()) return tap("ESCAPE");
  const combo = modifier !== undefined && combos.get(`${modifier}+${index}`);
  if (combo) {
    usedModifiers.add(modifier);
    return pressAction(index, combo);
  }
  if (modifiers.has(index)) return;
  pressAction(index, plain.get(index));
}

function playRelease(index: number, bindings: ReturnType<typeof readBindings>) {
  const key = fired.get(index);
  if (key) {
    fired.delete(index);
    return send("keyup", key);
  }
  /* A modifier tapped on its own */
  if (bindings.modifiers.has(index) && !usedModifiers.delete(index)) {
    const action = bindings.plain.get(index);
    const tapKey = action && keyForAction(action);
    if (tapKey) tap(tapKey);
  }
}

/**
 * Reads the controller once a frame. In play, buttons press the keys their actions are bound to,
 * a held modifier (LT) turning other buttons into combos. In a modal or menu mode, they drive
 * the menu highlight instead (see `gamepad-menus`).
 */
export function pollGamepadButtons() {
  const pad = getGamepad();
  if (!pad || paused) {
    /* Let go of anything held, or a pulled controller would keep the hero walking */
    releaseKeys();
    pressed.clear();
    if (!pad) setMenuMode(false);
    return;
  }
  syncModalOpen();
  const bindings = readBindings();
  const stick = getGamepadStick();
  const aim = getGamepadAim();
  const down = readPressed(pad);
  if (stick.x || stick.y || aim.x || aim.y || down.includes(true)) setLastDevice("gamepad", pad.id);

  /* The highlight only while the controller is what's in hand; the keyboard and mouse drop it */
  if (getLastDevice() !== "gamepad") {
    setMenuMode(false);
    syncNavFocus(false);
  }
  const inMenus = getLastDevice() === "gamepad" && isNavActive();
  if (inMenus) {
    releaseKeys();
    syncNavFocus();
    navSteer(stick, down, performance.now());
    navHold(!!down[0], performance.now());
  } else if (getLastDevice() === "gamepad") {
    syncNavFocus();
  }
  down.forEach((isDown, index) => {
    if (isDown && !pressed.has(index)) {
      if (inMenus) navPress(index, tap, () => playPress(index, bindings));
      else playPress(index, bindings);
      pressed.add(index);
    } else if (!isDown && pressed.has(index)) {
      pressed.delete(index);
      if (inMenus) navRelease(index);
      playRelease(index, bindings);
    }
  });
}

let looping = false;

/**
 * Reads the controller every frame from page load, not from the game loop, so menus work
 * before the game starts (the login screen) as well as in it.
 */
export function startGamepadLoop() {
  if (looping) return;
  looping = true;
  requestAnimationFrame(function frame() {
    pollGamepadButtons();
    requestAnimationFrame(frame);
  });
}

/** The right stick, which aims, from -1 to 1 on each axis, or zero inside the dead zone. */
export function getGamepadAim() {
  const pad = getGamepad();
  const x = pad?.axes[2] ?? 0;
  const y = pad?.axes[3] ?? 0;
  if (Math.hypot(x, y) < DEAD_ZONE) return { x: 0, y: 0 };
  return { x, y };
}

/** The left stick, from -1 to 1 on each axis, or zero inside the dead zone. */
export function getGamepadStick() {
  const pad = getGamepad();
  const x = pad?.axes[0] ?? 0;
  const y = pad?.axes[1] ?? 0;
  if (Math.hypot(x, y) < DEAD_ZONE) return { x: 0, y: 0 };
  return { x, y };
}
