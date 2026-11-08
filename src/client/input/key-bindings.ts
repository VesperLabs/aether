/**
 * What each key and controller button does. Saved per device (localStorage), since a laptop and a
 * desktop with a gamepad want different setups. Keys are named as `KeyboardKey` names them
 * (`getEventKeyName`); buttons are indices in the browser's standard gamepad mapping.
 */

export const ACTION_GROUPS = [
  {
    label: "Movement",
    actions: [
      { id: "moveUp", label: "Up" },
      { id: "moveDown", label: "Down" },
      { id: "moveLeft", label: "Left" },
      { id: "moveRight", label: "Right" },
    ],
  },
  {
    label: "Combat",
    actions: [
      { id: "attack", label: "Attack" },
      { id: "dodge", label: "Dodge" },
      { id: "grab", label: "Grab" },
      { id: "talk", label: "Talk" },
    ],
  },
  {
    label: "Abilities",
    actions: [
      { id: "ability1", label: "Slot 1" },
      { id: "ability2", label: "Slot 2" },
      { id: "ability3", label: "Slot 3" },
      { id: "ability4", label: "Slot 4" },
      { id: "ability5", label: "Slot 5" },
      { id: "ability6", label: "Slot 6" },
    ],
  },
  {
    label: "Menus",
    actions: [
      { id: "inventory", label: "Inventory" },
      { id: "equipment", label: "Equipment" },
      { id: "abilities", label: "Abilities" },
      { id: "stats", label: "Stats" },
      { id: "quests", label: "Quests" },
      { id: "social", label: "Social" },
      { id: "profile", label: "Profile" },
      { id: "settings", label: "Settings" },
      { id: "minimap", label: "Minimap" },
    ],
  },
] as const;

export type BindAction = (typeof ACTION_GROUPS)[number]["actions"][number]["id"];
export type BindDevice = "keyboard" | "gamepad";

/** Two keys per action, like most games: a primary and an alternate. `null` is unbound. */
type KeySlots = [string | null, string | null];
type KeyboardBindings = Record<BindAction, KeySlots>;
/** A button, or a combo: `hold` kept down (LB, RB) while `button` is pressed. */
export interface ButtonBind {
  button: number;
  hold?: number;
}
type GamepadBindings = Record<BindAction, ButtonBind | null>;

const DEFAULT_KEYBOARD: KeyboardBindings = {
  moveUp: ["W", "ARROWUP"],
  moveDown: ["S", "ARROWDOWN"],
  moveLeft: ["A", "ARROWLEFT"],
  moveRight: ["D", "ARROWRIGHT"],
  attack: ["SPACE", null],
  dodge: ["SHIFT", null],
  grab: ["F", null],
  talk: ["X", null],
  ability1: ["1", null],
  ability2: ["2", null],
  ability3: ["3", null],
  ability4: ["4", null],
  ability5: ["5", null],
  ability6: ["6", null],
  inventory: ["I", null],
  equipment: ["E", null],
  abilities: ["V", null],
  stats: ["C", null],
  quests: ["Q", null],
  social: ["P", null],
  profile: ["G", null],
  settings: ["Z", null],
  minimap: ["M", null],
};

/* Standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 12-15 D-pad. */
const LB = 4;
const RB = 5;
const LT = 6;
const RT = 7;
const DEFAULT_GAMEPAD: GamepadBindings = {
  /* The left stick moves; the d-pad opens menus instead */
  moveUp: null,
  moveDown: null,
  moveLeft: null,
  moveRight: null,
  /* The right thumb stays on the aim stick, so fighting sits on the shoulders beside it */
  attack: { button: RT },
  dodge: { button: LT },
  /* A talks to whoever is in reach, and grabs when no one is */
  talk: { button: 0 },
  grab: null,
  /* The first two on the bumpers, pressed alone and aimed with the right stick; the rest on
   * the face buttons, for quick casts (potions). No combos: one finger, one press */
  ability1: { button: RB },
  ability2: { button: LB },
  ability3: { button: 2 },
  ability4: { button: 3 },
  ability5: { button: 1 },
  ability6: null,
  /* Menus open from menu mode (Select or Start), so the d-pad is left free */
  inventory: null,
  equipment: null,
  abilities: null,
  quests: null,
  stats: null,
  social: null,
  profile: null,
  settings: null,
  minimap: null,
};

const sameBind = (a: ButtonBind | null, b: ButtonBind) =>
  !!a && a.button === b.button && a.hold === b.hold;

/** Keys the game itself owns: Escape closes, Enter chats. They can't be bound. */
export const RESERVED_KEYS = ["ESCAPE", "ENTER", "TAB"];

const STORAGE_KEY = "aether.bindings";

interface Bindings {
  keyboard: KeyboardBindings;
  gamepad: GamepadBindings;
}

/** Select and Start open menus, so a saved binding on either (from before they did) is dropped. */
export const RESERVED_BUTTONS = [8, 9];

/* Saves from before combos held a bare button number */
const readGamepad = (saved: Record<string, unknown> | undefined) =>
  Object.fromEntries(
    Object.entries(saved ?? {}).map(([action, raw]) => {
      const bind = typeof raw === "number" ? { button: raw } : (raw as ButtonBind | null);
      const reserved = bind && bind.hold === undefined && RESERVED_BUTTONS.includes(bind.button);
      return [action, reserved ? null : bind];
    }),
  ) as Partial<GamepadBindings>;

/**
 * Bump when the controller defaults change: saved controller bindings from before are dropped,
 * so players get the new layout rather than a mix of old saves and new defaults.
 */
const GAMEPAD_VERSION = 4;

type Saved = Bindings & { gamepadVersion: number };

function load(): Bindings {
  const fresh = { keyboard: { ...DEFAULT_KEYBOARD }, gamepad: { ...DEFAULT_GAMEPAD } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Saved>;
    /* A save from before the controller defaults last changed keeps only its keyboard */
    const gamepad = saved?.gamepadVersion === GAMEPAD_VERSION ? saved.gamepad : undefined;
    /* Spread over the defaults, so an action added after the save still gets its key */
    return {
      keyboard: { ...fresh.keyboard, ...saved?.keyboard },
      gamepad: { ...fresh.gamepad, ...readGamepad(gamepad) },
    };
  } catch {
    return fresh;
  }
}

let bindings = load();
const listeners = new Set<() => void>();

function commit(next: Bindings) {
  bindings = next;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...next, gamepadVersion: GAMEPAD_VERSION } satisfies Saved),
    );
  } catch {
    /* Private mode: the bindings still hold for this session */
  }
  for (const listener of listeners) listener();
}

export const getBindings = () => bindings;

export function subscribeBindings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The key that triggers an action (its primary, else its alternate). */
export const keyFor = (action: BindAction) =>
  bindings.keyboard[action][0] ?? bindings.keyboard[action][1] ?? undefined;

/** Binds a key, taking it off whatever action had it so one key never does two things. */
export function bindKey(action: BindAction, slot: 0 | 1, key: string | null) {
  const keyboard = { ...bindings.keyboard };
  if (key) {
    for (const id of Object.keys(keyboard) as BindAction[]) {
      keyboard[id] = keyboard[id].map((k) => (k === key ? null : k)) as KeySlots;
    }
  }
  const slots = [...keyboard[action]] as KeySlots;
  slots[slot] = key;
  keyboard[action] = slots;
  commit({ ...bindings, keyboard });
}

/** Binds a controller button or combo, taking it off whatever action had it. */
export function bindButton(action: BindAction, bind: ButtonBind | null) {
  const gamepad = { ...bindings.gamepad };
  if (bind) {
    for (const id of Object.keys(gamepad) as BindAction[]) {
      if (sameBind(gamepad[id], bind)) gamepad[id] = null;
    }
  }
  gamepad[action] = bind;
  commit({ ...bindings, gamepad });
}

export function resetBindings(device: BindDevice) {
  commit({
    ...bindings,
    [device]: device === "keyboard" ? { ...DEFAULT_KEYBOARD } : { ...DEFAULT_GAMEPAD },
  });
}
