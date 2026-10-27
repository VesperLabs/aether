import {
  buffList,
  ItemBuilder,
  itemSetList,
  spellDetails,
  type BuffName,
  type ItemSetName,
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
  ilvl?: number;
  amount?: number;
  cost?: number;
  stats?: Record<string, StatValue>;
  percentStats?: Record<string, StatValue>;
  effects?: Record<string, StatValue>;
  requirements?: Record<string, number | string>;
  buffs?: Record<string, number>;
  triggers?: readonly TriggerDefinition[];
  setName?: string;
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
  when: "on hit" | "on hurt";
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
  triggers: TriggerLine[];
  requirements: (StatLine & { met: boolean })[];
  set?: {
    name: string;
    pieces?: number;
    active: boolean;
    stats: StatLine[];
    triggers: TriggerLine[];
  };
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

function triggerLines(triggers: readonly TriggerDefinition[] = []): TriggerLine[] {
  return triggers.map((t) => ({
    name: t.name,
    level: t.level,
    chancePercent: Math.floor(100 / t.chance),
    when: t.event === "onAttackHit" ? "on hit" : "on hurt",
  }));
}

function buffStats(name: string, level: number): StatLine[] {
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
  const set = item.setName ? ItemBuilder.getSetInfo(item.setName) : undefined;
  const base = item.base ?? "";
  const stats = (item.stats ?? {}) as Record<string, number>;

  return {
    title: item.name ?? "",
    level: isSpell ? item.ilvl : undefined,
    amount: (item.amount ?? 0) > 1 ? item.amount : undefined,
    rarity: item.rarity,
    kind: isSpell ? "spell" : base.replaceAll("-", " "),
    stats: [...statLines(item.stats), ...statLines(item.percentStats, "%")],
    effects: statLines(item.effects),
    buffs: Object.entries(item.buffs ?? {}).map(([name, level]) => ({
      name,
      level,
      stats: buffStats(name, level),
    })),
    triggers: triggerLines(item.triggers),
    requirements: Object.entries(requirements).map(([label, value]) => ({
      label,
      value: String(value),
      met: !player || itemHasRequiredStats({ requirements, player, key: label }),
    })),
    set: set && {
      name: set.name,
      pieces: itemSetList[item.setName as ItemSetName]?.pieces,
      active: !player || !!player.state?.activeSets?.includes(item.setName as string),
      stats: [...statLines(set.percentStats, "%"), ...statLines(set.stats)],
      triggers: triggerLines(set.triggers),
    },
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
