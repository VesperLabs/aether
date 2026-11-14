import {
  buffList,
  getSetBonus,
  ItemBuilder,
  modGearTypes,
  sumMods,
  type GearType,
  type ModName,
  type ScaledMod,
  spellDetails,
  type BuffName,
  type TriggerDefinition,
} from "@/content";
import { formatStats, type FormattedStat } from "@/rules/stats";
import { CONSUMABLES_BASES } from "./constants";
import { itemHasRequiredStats } from "./requirements";

type StatValue = number | string | readonly (number | string)[];

/** An item to describe: one a player owns, or a wiki definition whose stats are `[min, max]` ranges. */
export interface DescribableItem {
  name?: string;
  base?: string;
  slot?: string;
  type?: string;
  rarity?: string;
  rank?: number;
  amount?: number;
  cost?: number;
  stats?: Record<string, StatValue>;
  percentStats?: Record<string, StatValue>;
  effects?: Record<string, StatValue>;
  requirements?: Record<string, number | string>;
  buffs?: Record<string, number>;
  triggers?: readonly TriggerDefinition[];
  setName?: string;
  /** Gear's mod slots, `null` while empty, and a unique's own mod on top. Both scale by tier. */
  mods?: readonly (string | null)[];
  fixedMod?: string;
  /** Cards only: the mod the card puts in a slot, shown at tier 1. */
  mod?: string;
  tier?: number;
  space?: number;
  items?: readonly unknown[];
}

/** The player an item is compared against: requirements met, set active. */
export type DescribePlayer = Parameters<typeof itemHasRequiredStats>[0]["player"] & {
  state?: { activeSets?: readonly string[] } | null;
};

export interface StatLine {
  label: string;
  value: string;
}

export interface TriggerLine {
  name: string;
  level: number;
  chancePercent: number;
  when: "hit" | "hurt";
  /** What the buff or debuff does at that level: its duration and stats. */
  stats: StatLine[];
}

export interface ItemDescription {
  title: string;
  /** "Lv. n" for spells. */
  level?: number;
  amount?: number;
  rarity?: string;
  kind: string;
  stats: StatLine[];
  effects: StatLine[];
  buffs: { name: string; level: number; stats: StatLine[] }[];
  requirements: (StatLine & { met: boolean })[];
  set?: {
    name: string;
    pieces?: number;
    active: boolean;
    stats: StatLine[];
    triggers: TriggerLine[];
  };
  /**
   * What the item's mods add, left out of `stats`: a unique's own mod on its own (`fixed`), then
   * every other mod and trigger (`added`), and its slots (`true` where a mod fills one).
   */
  mods: { fixed?: ModLines; added: ModLines; slots: boolean[] };
  /** Cards only: the gear their mod can go on. */
  fits?: readonly GearType[];
  space?: { used: number; total: number };
  /** What double-clicking does, if anything. */
  action?: "consume" | "open";
  description?: string;
  cost: number;
  resourceCosts: { resource: "mp" | "hp" | "sp"; amount: number }[];
}

const text = (value: FormattedStat | StatValue): string =>
  Array.isArray(value) ? value.join(" ↔ ") : String(value);

/** Formatted stat lines; `[min, max]` ranges read "min ↔ max". */
function statLines(stats: Record<string, StatValue> = {}, suffix = ""): StatLine[] {
  return Object.entries(formatStats(stats as Record<string, number>)).map(([label, value]) => ({
    label,
    value: Array.isArray(value)
      ? value.map((v) => `${v}${suffix}`).join(" ↔ ")
      : text(value) + suffix,
  }));
}

/** What some mods add, as stat lines and procs. */
export interface ModLines {
  stats: StatLine[];
  triggers: TriggerLine[];
}

const modStatLines = (mod: ScaledMod) => [
  ...statLines(mod.stats),
  ...statLines(mod.percentStats, "%"),
];

/** `triggers` with each of `part` taken out once. */
function withoutTriggers(triggers: readonly TriggerDefinition[] = [], part: TriggerDefinition[]) {
  const left = part.map((trigger) => JSON.stringify(trigger));
  return triggers.filter((trigger) => {
    const index = left.indexOf(JSON.stringify(trigger));
    if (index >= 0) left.splice(index, 1);
    return index < 0;
  });
}

/** An item's kind in words: `heavy-plate-armor` and `shortBow` as "heavy plate armor", "short bow". */
const kindName = (base: string) =>
  base
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();

/** `total` without `part`: an item's own stats, once its mods are taken back out. */
function without(total: Record<string, StatValue> = {}, part: Record<string, number>) {
  const rest: Record<string, StatValue> = {};
  for (const [stat, value] of Object.entries(total)) {
    const left = typeof value === "number" ? value - (part[stat] ?? 0) : value;
    if (left !== 0) rest[stat] = left;
  }
  return rest;
}

function triggerLines(triggers: readonly TriggerDefinition[] = []): TriggerLine[] {
  return triggers.map((t) => ({
    name: t.name,
    level: t.level,
    chancePercent: Math.floor(100 / t.chance),
    when: t.event === "onAttackHit" ? "hit" : "hurt",
    stats: buffLines(t.name, t.level),
  }));
}

/** What buff `name` does at `level`: its duration and stats, scaled by level. */
function buffLines(name: string, level: number): StatLine[] {
  const buff = buffList[name as BuffName] as
    | { duration?: number; stats?: Record<string, number> }
    | undefined;
  const scaled: Record<string, number> = { duration: Number(buff?.duration) * level };
  for (const [key, value] of Object.entries(buff?.stats ?? {})) scaled[key] = value * level;
  return statLines(scaled);
}

/**
 * Everything an item tooltip shows, worked out once for the game and the wiki.
 * With a `player`, requirements and the set bonus are checked against them;
 * without one (the wiki item list) every requirement counts as met and the set as active.
 */
export function describeItem(
  item: DescribableItem,
  player?: DescribePlayer | null,
): ItemDescription {
  const isSpell = item.type === "spell" || item.slot === "spell";
  const requirements = item.requirements ?? {};
  const set = item.setName ? getSetBonus(item.setName) : undefined;
  const base = item.base ?? "";
  const stats = (item.stats ?? {}) as Record<string, number>;
  const tier = item.tier ?? 1;
  const fixed = item.fixedMod ? sumMods([item.fixedMod as ModName], tier) : undefined;
  const slotted = sumMods((item.mods ?? []).filter(Boolean) as ModName[], tier);
  const card = item.mod ? sumMods([item.mod as ModName], 1) : undefined;
  const mods = sumMods([item.fixedMod, ...(item.mods ?? [])].filter(Boolean) as ModName[], tier);

  return {
    title: item.name ?? "",
    level: isSpell ? item.rank : undefined,
    amount: (item.amount ?? 0) > 1 ? item.amount : undefined,
    rarity: item.rarity,
    kind: isSpell ? "spell" : kindName(base),
    stats: [
      ...statLines(without(item.stats, mods.stats)),
      ...statLines(without(item.percentStats, mods.percentStats), "%"),
    ],
    effects: statLines(item.effects),
    buffs: Object.entries(item.buffs ?? {}).map(([name, level]) => ({
      name,
      level,
      stats: buffLines(name, level),
    })),
    requirements: Object.entries(requirements).map(([label, value]) => ({
      label,
      value: String(value),
      met: !player || itemHasRequiredStats({ requirements, player, key: label }),
    })),
    set: set && {
      name: set.name,
      pieces: set.pieces,
      active: !player || !!player.state?.activeSets?.includes(item.setName as string),
      stats: [...statLines(set.percentStats, "%"), ...statLines(set.stats)],
      triggers: triggerLines(set.triggers),
    },
    mods: {
      fixed: fixed && { stats: modStatLines(fixed), triggers: triggerLines(fixed.triggers) },
      added: card
        ? { stats: modStatLines(card), triggers: triggerLines(card.triggers) }
        : {
            stats: modStatLines(slotted),
            /* Gear only gets triggers from its mods, so whatever isn't the fixed mod's is added */
            triggers: triggerLines(withoutTriggers(item.triggers, fixed?.triggers ?? [])),
          },
      slots: (item.mods ?? []).map(Boolean),
    },
    fits: item.mod ? modGearTypes(item.mod) : undefined,
    space: item.space
      ? { used: item.items?.filter(Boolean).length ?? 0, total: item.space }
      : undefined,
    action: CONSUMABLES_BASES.includes(base) ? "consume" : base === "bag" ? "open" : undefined,
    description: isSpell
      ? (spellDetails as Record<string, { description?: string }>)[base]?.description
      : undefined,
    cost: ItemBuilder.getItemCost(item) * (item.amount || 1),
    resourceCosts: (["mp", "hp", "sp"] as const)
      .filter((resource) => stats[`${resource}Cost`])
      .map((resource) => ({ resource, amount: stats[`${resource}Cost`] })),
  };
}
