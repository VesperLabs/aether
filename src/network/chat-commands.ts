import {
  ITEM_BUILD_RARITIES,
  ITEM_KEYS,
  canRollRarity,
  findItemKey,
  mapList,
  SEASONS,
  actors,
  type ActorDefinition,
  type ItemLook,
} from "@/content";

/** One suggestion for a command argument. */
export interface ChatCommandOption {
  /** What picking it inserts. */
  value: string;
  /** What the row shows, when it isn't `value` (an item's real name). Typing matches either. */
  label?: string;
  hint?: string;
  /** Colors the value like an item of this rarity. */
  rarity?: string;
  /** Draws an icon next to the value: an item's, or a mob's body when there's no slot. */
  look?: ItemLook;
  /** Draws this actor dressed in its gear instead of `look`: set for humans, whose bare body is plain. */
  actor?: string;
}

/** What an argument takes, so the client can check it and pick a keyboard before sending. */
type ChatArgKind = "number" | "item" | "room" | "mob" | "rarity" | "text";

export interface ChatArg {
  name: string;
  kind: ChatArgKind;
  optional?: boolean;
}

/** A `/command` typed into chat. `cheat` commands only exist when the server runs with ENABLE_CHEATS=true. */
export interface ChatCommand {
  name: string;
  args?: readonly ChatArg[];
  description: string;
  cheat: boolean;
  /** Other ways to type it, without the slash (`w` for `whisper`). */
  aliases?: readonly string[];
  /** The arguments, when they depend on what's typed (an item's rarity and amount). */
  argsFor?: (args: string[]) => readonly ChatArg[];
  /** Suggestions for the argument at `index`, given the args typed before it. */
  complete?: (index: number, args: string[]) => readonly ChatCommandOption[];
}

const ITEM_OPTIONS = ITEM_KEYS.map(({ key, type, rarity, name, look }) => ({
  value: key,
  label: name,
  hint: `${rarity} ${type}`,
  rarity,
  look,
}));
const ROOM_OPTIONS = mapList.map(({ name }) => ({ value: name }));
const MOB_OPTIONS = Object.entries(actors as Record<string, ActorDefinition>).map(
  ([value, { profile, baseStats }]) => ({
    value,
    hint: `level ${baseStats.level}`,
    look: { texture: profile.race, tint: profile.tint },
    ...(profile.race === "human" && { actor: value }),
  }),
);
const SEASON_OPTIONS = SEASONS.map((value) => ({ value }));
const RARITY_OPTIONS = ITEM_BUILD_RARITIES.map((value) => ({ value, rarity: value }));

const NPC_ACTION_OPTIONS = [
  { value: "spawn", hint: "add any actor next to you; add pet to make them yours" },
  { value: "tame", hint: "catch the nearest wild NPC as your companion" },
  { value: "list", hint: "what you spawned and your companions, and what they are doing" },
  { value: "clear", hint: "remove what you spawned and your companions" },
];
const NPC_ACTION: ChatArg = { name: "action", kind: "text" };
/** A common base can roll magic or rare mods (not bags, spells, stackables); anything else is fixed. */
const ROLLABLE_RARITY_OPTIONS = ["magic", "rare"].map((value) => ({ value, rarity: value }));

const numArg = (name: string): ChatArg => ({ name, kind: "number" });
const itemArg = (name: string): ChatArg => ({ name, kind: "item" });
const optional = (arg: ChatArg): ChatArg => ({ ...arg, optional: true });

const NPC_PET_OPTIONS = [{ value: "pet", hint: "spawn them as your companions" }];
/** `/npc` actions that take an actor id, and whether it is required. */
const NPC_ACTOR_ARG: Record<string, ChatArg> = {
  spawn: { name: "actor", kind: "mob" },
  tame: optional({ name: "actor", kind: "mob" }),
};

/** Only a common base that can roll mods takes a rarity, and only stackables take an amount. */
function itemArgs([key]: string[]): readonly ChatArg[] {
  const item = findItemKey(key ?? "");
  const rollable = item?.rarity === "common" && canRollRarity(item.type);
  return [
    itemArg("item"),
    ...(rollable ? [optional({ name: "rarity", kind: "rarity" })] : []),
    ...(item?.type === "stackable" ? [optional(numArg("amount"))] : []),
  ];
}

function completeItem(index: number, args: string[]) {
  if (index === 0) return ITEM_OPTIONS;
  return itemArgs(args)[index]?.kind === "rarity" ? ROLLABLE_RARITY_OPTIONS : [];
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
    description: "Show the season, or start a new one",
    cheat: true,
    complete: (index) => (index === 0 ? SEASON_OPTIONS : []),
  },
  {
    name: "goto",
    args: [{ name: "player", kind: "text" }],

    description: "Teleport to a player",
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
    argsFor: ([action]) => {
      const actor = NPC_ACTOR_ARG[action ?? ""];
      if (!actor) return [NPC_ACTION];
      return action === "spawn"
        ? [NPC_ACTION, actor, optional({ name: "pet", kind: "text" }), optional(numArg("count"))]
        : [NPC_ACTION, actor];
    },
    description: "Spawn, tame, list and clear NPCs",
    cheat: true,
    complete: (index, args) => {
      if (index === 0) return NPC_ACTION_OPTIONS;
      if (index === 1 && NPC_ACTOR_ARG[args[0] ?? ""]) return MOB_OPTIONS;
      return index === 2 && args[0] === "spawn" ? NPC_PET_OPTIONS : [];
    },
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
};

/** Why `value` won't do for `arg`, or undefined when it will. The server still checks it again. */
export function checkChatArg(arg: ChatArg, value: string): string | undefined {
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
