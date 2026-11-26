import {
  ITEM_KEYS,
  ITEM_RARITIES,
  MAX_SLOTS,
  findItemKey,
  getCatalogItem,
  rarityForSlots,
  takesSlots,
  mapList,
  SEASONS,
  SEASON_ICONS,
  EARTH_ICON,
  actors,
  getBody,
  type ActorDefinition,
  type ItemLook,
  type SeasonIcon,
} from "@/content";
import { completeNpcSpawn, NPC_SPAWN_ARGS } from "./npc-spawn-args";

/** One suggestion for a command argument. */
export interface ChatCommandOption {
  /** What picking it inserts. */
  value: string;
  /** What the row shows, when it isn't `value` (an item's real name). Typing matches either. */
  label?: string;
  hint?: string;
  /** Shown after the hint as a roman numeral: an item's tier. */
  tier?: number;
  /** Colors the value like an item of this rarity, and typing it finds the item. */
  rarity?: string;
  /** Draws an icon next to the value: an item's, or a mob's body when there's no slot. */
  look?: ItemLook;
  /** Draws this picture next to the value, for options that aren't items or mobs. */
  icon?: SeasonIcon;
  /** Draws this actor dressed in its gear instead of `look`: set for humans, whose bare body is plain. */
  actor?: string;
  /** Listed first, in the order given, ahead of the rest: an optional argument's default. */
  pinned?: boolean;
}

/** What an argument takes, so the client can check it and pick a keyboard before sending. */
type ChatArgKind = "number" | "item" | "room" | "mob" | "rarity" | "slots" | "text";

export interface ChatArg {
  name: string;
  kind: ChatArgKind;
  optional?: boolean;
  /** Words that also fill it (`none` for an empty hand); for text, the only words it takes. */
  words?: readonly string[];
}

/** A `/command` typed into chat. `cheat` commands only exist when the server runs with ENABLE_CHEATS=true. */
export interface ChatCommand {
  name: string;
  args?: readonly ChatArg[];
  description: string;
  cheat: boolean;
  /** Never suggested: works only for someone who already knows it (`/admin`). */
  hidden?: boolean;
  /** Other ways to type it, without the slash (`w` for `whisper`). */
  aliases?: readonly string[];
  /** The arguments, when they depend on what's typed (an item's slots or amount). */
  argsFor?: (args: string[]) => readonly ChatArg[];
  /** Suggestions for the argument at `index`, given the args typed before it. */
  complete?: (index: number, args: string[]) => readonly ChatCommandOption[];
}

const ITEM_OPTIONS = ITEM_KEYS.map(({ key, type, rarity, name, tier, look, base }) => ({
  value: key,
  label: name,
  /* The family too ("fist weapon"), so typing "fist" finds every katar, spikes and claw */
  hint: base && base !== type ? `${base} ${type}` : type,
  itemType: type,
  tier,
  rarity,
  look,
}));
const ROOM_OPTIONS = mapList.map(({ name }) => ({ value: name }));
const MOB_OPTIONS = Object.entries(actors as Record<string, ActorDefinition>).map(
  ([value, { profile, baseStats }]) => ({
    value,
    hint: `level ${baseStats.level}`,
    look: { texture: profile.race, tint: profile.tint },
    ...(getBody(profile.race).layered && { actor: value }),
  }),
);
/** What each `/season` choice does; the months are when Earth's northern half has it. */
const SEASON_HINTS: Record<(typeof SEASONS)[number] | "real", string> = {
  spring: "Pin spring: blossoms (Mar-May)",
  summer: "Pin summer: green leaves (Jun-Aug)",
  fall: "Pin fall: orange leaves (Sep-Nov)",
  winter: "Pin winter: snow (Dec-Feb)",
  real: "Follow Earth's season again",
};

const SEASON_OPTIONS = [
  ...SEASONS.map((value) => ({ value, hint: SEASON_HINTS[value], icon: SEASON_ICONS[value] })),
  { value: "real", hint: SEASON_HINTS.real, icon: EARTH_ICON },
];
const WEATHER_OPTIONS = [
  { value: "clear", hint: "Pin a clear sky" },
  { value: "cloudy", hint: "Pin clouds drifting over" },
  { value: "foggy", hint: "Pin fog rolling in" },
  { value: "real", hint: "Follow the forecast again" },
];
const RARITY_OPTIONS = ITEM_RARITIES.map((value) => ({ value, rarity: value }));

const NPC_ACTION_OPTIONS = [
  { value: "spawn", hint: "add any actor next to you; add follower to have them follow you" },
  { value: "follow", hint: "the nearest wild NPC follows you, for now" },
  { value: "catch", hint: "catch the nearest wild NPC as a pet, as a ball would" },
  { value: "list", hint: "what you spawned, your pets and followers, and what they're doing" },
  { value: "clear", hint: "remove what you spawned and your followers (never pets)" },
];
const NPC_ACTION: ChatArg = { name: "action", kind: "text" };
const PET_ACTION_OPTIONS = [
  { value: "out", hint: "bring out a pet you caught" },
  { value: "away", hint: "put it away; it stays yours" },
];
/** Gear with 0 to 4 blank mod slots, each colored like the rarity it makes. */
const SLOT_OPTIONS = Array.from({ length: MAX_SLOTS + 1 }, (_, slots) => ({
  value: String(slots),
  hint: `${slots} mod slots, ${rarityForSlots(slots)}`,
  rarity: rarityForSlots(slots),
}));

const numArg = (name: string): ChatArg => ({ name, kind: "number" });
const itemArg = (name: string): ChatArg => ({ name, kind: "item" });
const optional = (arg: ChatArg): ChatArg => ({ ...arg, optional: true });

/** `/npc` actions that take an actor id, and whether it is required. */
const NPC_ACTOR_ARG: Record<string, ChatArg> = {
  spawn: { name: "actor", kind: "mob" },
  follow: optional({ name: "actor", kind: "mob" }),
  catch: optional({ name: "actor", kind: "mob" }),
};

/** Gear that takes mod slots takes how many, and only stackables take an amount. */
function itemArgs([key]: string[]): readonly ChatArg[] {
  const item = getCatalogItem(findItemKey(key ?? "")?.key ?? "");
  return [
    itemArg("item"),
    ...(item && takesSlots(item) ? [optional({ name: "slots", kind: "slots" })] : []),
    ...(item?.type === "stackable" ? [optional(numArg("amount"))] : []),
  ];
}

function completeItem(index: number, args: string[]) {
  if (index === 0) return ITEM_OPTIONS;
  return itemArgs(args)[index]?.kind === "slots" ? SLOT_OPTIONS : [];
}

const textArg = (name: string): ChatArg => ({ name, kind: "text" });

/** Commands every player has, with WoW's names. Message arguments run to the line's end. */
const PLAYER_COMMANDS: readonly ChatCommand[] = [
  {
    name: "yell",
    args: [textArg("message")],
    description: "Shout to everyone online",
    cheat: false,
  },
  {
    name: "whisper",
    aliases: ["w"],
    args: [textArg("player"), textArg("message")],
    description: "Message one player privately",
    cheat: false,
  },
  {
    name: "reply",
    aliases: ["r"],
    args: [textArg("message")],
    description: "Answer your last whisper",
    cheat: false,
  },
  {
    name: "party",
    args: [textArg("message")],
    description: "Talk to your party",
    cheat: false,
  },
  {
    name: "me",
    args: [textArg("action")],
    description: "Act something out",
    cheat: false,
  },
  {
    name: "who",
    description: "List who is online",
    cheat: false,
  },
  {
    name: "invite",
    args: [textArg("player")],
    description: "Invite a player to your party",
    cheat: false,
  },
  {
    name: "leave",
    description: "Leave your party",
    cheat: false,
  },
  { name: "admin", description: "", cheat: false, hidden: true },
  { name: "logout", description: "Leave the game and forget this login", cheat: false },
  {
    name: "roll",
    args: [optional(numArg("max"))],
    description: "Roll a number, 1 to 100 unless you pick a max",
    cheat: false,
  },
];

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  ...PLAYER_COMMANDS,
  {
    name: "drop",
    args: [itemArg("item")],
    argsFor: itemArgs,

    description: "Drop an item at your feet",
    cheat: true,
    complete: completeItem,
  },
  { name: "coords", description: "Show your position", cheat: true },
  {
    name: "ding",
    args: [numArg("experience")],

    description: "Grant experience",
    cheat: true,
  },
  {
    name: "booty",
    args: [numArg("gold")],

    description: "Add gold",
    cheat: true,
  },
  {
    name: "guns",
    args: [{ name: "rarity", kind: "rarity" }],

    description: "Drop a random weapon",
    cheat: true,
    complete: (index) => (index === 0 ? RARITY_OPTIONS : []),
  },
  {
    name: "give",
    args: [itemArg("item")],
    argsFor: itemArgs,

    description: "Put an item in your inventory",
    cheat: true,
    complete: completeItem,
  },
  { name: "heal", description: "Fill hp, mp and sp", cheat: true },
  {
    name: "hp",
    args: [numArg("amount")],

    description: "Set your hp",
    cheat: true,
  },
  {
    name: "name",
    args: [{ name: "name", kind: "text" }],

    description: "Rename your character",
    cheat: true,
  },
  {
    name: "tp",
    args: [numArg("x"), numArg("y")],

    description: "Teleport within this room",
    cheat: true,
  },
  {
    name: "warp",
    args: [{ name: "room", kind: "room" }, optional(numArg("x")), optional(numArg("y"))],

    description: "Teleport to a room",
    cheat: true,
    complete: (index) => (index === 0 ? ROOM_OPTIONS : []),
  },
  {
    name: "season",
    args: [optional({ name: "season", kind: "text" })],
    description: "Show the season, pin one, or go back to the real one",
    cheat: true,
    complete: (index) => (index === 0 ? SEASON_OPTIONS : []),
  },
  {
    name: "weather",
    args: [optional({ name: "sky", kind: "text" })],
    description: "Show the sky, pin one, or go back to the forecast",
    cheat: true,
    complete: (index) => (index === 0 ? WEATHER_OPTIONS : []),
  },
  {
    name: "time",
    args: [optional(numArg("hour"))],
    description: "Show the hour, or set it (0 to 24)",
    cheat: true,
  },
  {
    name: "goto",
    args: [{ name: "player", kind: "text" }],

    description: "Teleport to a player",
    cheat: true,
  },
  {
    name: "savepos",
    description: "Save where you stand, so you log back in there",
    cheat: true,
  },
  {
    name: "where",

    description: "List who is in this room and where",
    cheat: true,
  },
  {
    name: "npc",
    args: [NPC_ACTION],
    argsFor: (args) => {
      const actor = NPC_ACTOR_ARG[args[0] ?? ""];
      if (!actor) return [NPC_ACTION];
      return args[0] === "spawn" ? [NPC_ACTION, actor, ...NPC_SPAWN_ARGS] : [NPC_ACTION, actor];
    },
    description: "Spawn NPCs, make them follow you or catch them as pets, list and clear them",
    cheat: true,
    complete: (index, args) => {
      if (index === 0) return NPC_ACTION_OPTIONS;
      if (index === 1 && NPC_ACTOR_ARG[args[0] ?? ""]) return MOB_OPTIONS;
      return args[0] === "spawn" ? completeNpcSpawn(index - 2, ITEM_OPTIONS) : [];
    },
  },
  {
    name: "pet",
    args: [NPC_ACTION],
    description: "Bring out or put away the pet you caught",
    cheat: true,
    complete: (index) => (index === 0 ? PET_ACTION_OPTIONS : []),
  },
];

/** The command called `name`, by its full name or a shortcut. */
export function findChatCommand(
  name: string,
  commands: readonly ChatCommand[] = CHAT_COMMANDS,
): ChatCommand | undefined {
  const wanted = name.toLowerCase();
  return commands.find((c) => c.name === wanted || c.aliases?.includes(wanted));
}

/** A command's arguments, given the ones typed so far. */
export function getChatArgs(command: ChatCommand, args: string[]): readonly ChatArg[] {
  return command.argsFor?.(args) ?? command.args ?? [];
}

/** `<required> [optional]`, as shown after a command's name. */
export function formatChatArg(arg: ChatArg) {
  return arg.optional ? `[${arg.name}]` : `<${arg.name}>`;
}

/** The commands a player can use, given whether the server has cheats on. */
export function getChatCommands(cheats: boolean): readonly ChatCommand[] {
  return CHAT_COMMANDS.filter((c) => cheats || !c.cheat);
}

const KIND_OPTIONS: Partial<Record<ChatArgKind, readonly ChatCommandOption[]>> = {
  room: ROOM_OPTIONS,
  mob: MOB_OPTIONS,
  rarity: RARITY_OPTIONS,
  slots: SLOT_OPTIONS,
};

/** Why `value` won't do for `arg`, or undefined when it will. The server still checks it again. */
export function checkChatArg(arg: ChatArg, value: string): string | undefined {
  if (arg.words?.includes(value.toLowerCase())) return undefined;
  /* A text argument with its own words takes only those */
  if (arg.words && arg.kind === "text") return `${arg.name} is ${arg.words.join(" or ")}`;
  if (arg.kind === "number") return /^-?\d+$/.test(value) ? undefined : `${arg.name} is a number`;
  if (arg.kind === "item") return findItemKey(value) ? undefined : `No item called "${value}"`;
  const options = KIND_OPTIONS[arg.kind];
  /* Rooms and mobs are looked up by exact name; rarities ignore case */
  const same = (o: ChatCommandOption) =>
    arg.kind === "rarity" ? o.value === value.toLowerCase() : o.value === value;
  if (options && !options.some(same)) {
    return `No ${arg.name} called "${value}"`;
  }
  return undefined;
}
