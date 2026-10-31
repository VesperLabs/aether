import {
  ITEM_BUILD_RARITIES,
  ITEM_KEYS,
  canRollRarity,
  findItemKey,
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
  /** Draws an item icon next to the value. */
  look?: ItemLook;
}

/** A `/command` typed into chat. `cheat` commands only exist when the server runs with ENABLE_CHEATS=true. */
export interface ChatCommand {
  name: string;
  /** Argument hint shown after the name, e.g. `<amount>`. */
  args?: string;
  description: string;
  cheat: boolean;
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
const RARITY_OPTIONS = ITEM_BUILD_RARITIES.map((value) => ({ value, rarity: value }));
/** A common base can roll magic or rare mods (not bags, spells, stackables); anything else is fixed. */
const ROLLABLE_RARITY_OPTIONS = ["magic", "rare"].map((value) => ({ value, rarity: value }));

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  {
    name: "drop",
    args: "<item> [rarity] [amount]",
    description: "Drop an item at your feet",
    cheat: true,
    complete: (index, args) => {
      if (index === 0) return ITEM_OPTIONS;
      const item = findItemKey(args[0]);
      return index === 1 && item?.rarity === "common" && canRollRarity(item.type)
        ? ROLLABLE_RARITY_OPTIONS
        : [];
    },
  },
  { name: "coords", description: "Show your position", cheat: true },
  { name: "ding", args: "<experience>", description: "Grant experience", cheat: true },
  { name: "booty", args: "<gold>", description: "Add gold", cheat: true },
  {
    name: "guns",
    args: "<rarity>",
    description: "Drop a random weapon",
    cheat: true,
    complete: (index) => (index === 0 ? RARITY_OPTIONS : []),
  },
];

/** The commands a player can use, given whether the server has cheats on. */
export function getChatCommands(cheats: boolean): readonly ChatCommand[] {
  return CHAT_COMMANDS.filter((c) => cheats || !c.cheat);
}
