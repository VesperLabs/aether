import {
  buffAtLevel,
  buffList,
  growsWithLevel,
  mergeTriggers,
  getSetBonus,
  ItemBuilder,
  modGearTypes,
  sumMods,
  type GearType,
  type ModName,
  type ScaledMod,
  spellDetails,
  type BuffDefinition,
  type BuffName,
  type TriggerDefinition,
} from "@/content";
import { formatStats, isSwingStat, type FormattedStat } from "@/rules/stats";
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
  buffChance?: number;
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
  /** A small aside after the value: how a card's mod grows with tier, "(×tier)" or "(+0.5s/tier)". */
  note?: string;
}

export interface TriggerLine {
  name: string;
  level: number;
  chancePercent: number;
  when: "hit" | "hurt";
  /** A card's mod: the buff's level is the tier of the gear it goes in. */
  perTier?: boolean;
  /** What the buff or debuff does at that level: its duration and stats. */
  stats: StatLine[];
}

export interface ItemDescription {
  title: string;
  /** "Lv. n" for spells. */
  level?: number;
  /** Gear's tier, shown before its rarity and kind. */
  tier?: number;
  amount?: number;
  rarity?: string;
  kind: string;
  stats: StatLine[];
  effects: StatLine[];
  /** A spell's: how often it lands on a hit, 100 when always. */
  buffs: { name: string; level: number; chancePercent?: number; stats: StatLine[] }[];
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
function statLines(stats: Record<string, StatValue> = {}, suffix = "", note?: string): StatLine[] {
  return Object.entries(formatStats(stats as Record<string, number>)).map(([label, value]) => ({
    label,
    value: Array.isArray(value)
      ? value.map((v) => `${v}${suffix}`).join(" ↔ ")
      : text(value) + suffix,
    ...(note && { note }),
  }));
}

/**
 * Percent stats, signed ("+12%"). A lower delay is a faster speed, so those read as one:
 * `attackDelay: -12` is "attack speed +12%".
 */
const SPEED_OF: Record<string, string> = { attackDelay: "attackSpeed", castDelay: "castSpeed" };
function percentLines(stats: Record<string, StatValue> = {}, perTier = false): StatLine[] {
  return Object.entries(stats).map(([stat, value]) => {
    const flip = stat in SPEED_OF ? -1 : 1;
    const signed = (v: number) => `${v * flip > 0 ? "+" : ""}${trimZeros(String(v * flip))}%`;
    return {
      label: SPEED_OF[stat] ?? stat,
      value: Array.isArray(value) ? value.map(signed).join(" ↔ ") : signed(Number(value)),
      /* A card's percent gains half its tier 1 value per tier */
      ...(perTier && !Array.isArray(value) && { note: `(${signed(Number(value) / 2)}/tier)` }),
    };
  });
}

/** What some mods add, as stat lines and procs. */
export interface ModLines {
  stats: StatLine[];
  triggers: TriggerLine[];
  /**
   * Weapons only: the mod stats that count from both hands (spell power), split from `stats`
   * and `triggers`, which only this weapon's own swings get.
   */
  global?: StatLine[];
}

/** With `perTier` (a card), each line is marked with how it grows with the gear's tier. */
const modStatLines = (mod: ScaledMod, perTier = false) => [
  ...statLines(mod.stats, "", perTier ? "(×tier)" : undefined),
  ...percentLines(mod.percentStats, perTier),
];

/**
 * A weapon's mods split in two: what only its own swings get (damage, speed, crit, its "when
 * you hit" triggers), and what counts from either hand (`global`), as armour's does.
 */
function perHand(lines: ModLines): ModLines {
  /* A damage range is labelled "Damage" or "FireDamage", after its min and max */
  const isSwing = (line: StatLine) => isSwingStat(line.label) || isSwingStat(`min${line.label}`);
  return {
    stats: lines.stats.filter(isSwing),
    triggers: lines.triggers,
    global: lines.stats.filter((line) => !isSwing(line)),
  };
}

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

/** One line per trigger, copies of the same one merged: their chances added, as they roll. */
function triggerLines(triggers: readonly TriggerDefinition[] = [], perTier = false): TriggerLine[] {
  return mergeTriggers(triggers).map((t) => ({
    /* Only a buff that grows with its level grows with the gear's tier */
    ...(perTier && growsWithLevel(buffList[t.name as BuffName]) && { perTier }),
    name: t.name,
    level: t.level,
    chancePercent: Math.round(t.percent * 10) / 10,
    when: t.event === "onAttackHit" ? "hit" : "hurt",
    stats: buffLines(t.name, t.level, perTier),
  }));
}

/** "0.50s" reads "0.5s", "1.00s" reads "1s"; whole numbers stay as they are. */
const trimZeros = (value: string) =>
  value.replace(/(\.\d*?)0+(?=\D*$)/, "$1").replace(/\.(?=\D*$)/, "");

/**
 * What buff `name` does at `level`: its duration and stats. On a card (`perTier`), each value
 * that grows with level says by how much per tier. A spell's rank is fixed, so it never does.
 */
function buffLines(name: string, level: number, perTier = false): StatLine[] {
  const buff = buffList[name as BuffName] as BuffDefinition | undefined;
  if (!buff) return [];
  const { duration, stats, percentStats } = buffAtLevel(buff, level);
  const lines = [...statLines({ duration, ...stats }), ...percentLines(percentStats)];
  if (!perTier) return lines;
  const step = buff.perLevel ?? {};
  const steps = [
    ...statLines({ ...(step.duration && { duration: step.duration }), ...step.stats }),
    ...percentLines(step.percentStats),
  ];
  const note = new Map(
    steps.map(({ label, value }) => [
      `${label}${value.endsWith("%")}`,
      `(${/^[-+]/.test(value) ? "" : "+"}${trimZeros(value)}/tier)`,
    ]),
  );
  return lines.map((line) => {
    const lineNote = note.get(`${line.label}${line.value.endsWith("%")}`);
    return lineNote ? { ...line, note: lineNote } : line;
  });
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

  const isOwnBuff = ([name]: [string, number]) => isSpell && name === base;
  const isGear = !isSpell && item.slot !== "stackable" && item.base !== "card";
  const isWeapon = ["weapon", "ranged"].includes(item.type ?? "");
  const hands = (lines: ModLines) => (isWeapon ? perHand(lines) : lines);
  const ownBuffs = Object.entries(item.buffs ?? {}).filter(isOwnBuff);
  const castBuffs = Object.entries(item.buffs ?? {}).filter((buff) => !isOwnBuff(buff));
  /*
   * How long before a spell can be cast again: its own cooldown, plus the caster's cast delay when
   * we know who's looking (the wiki doesn't, so shows the spell's own)
   */
  const ownCooldown = (spellDetails as Record<string, { cooldown?: number }>)[base]?.cooldown ?? 0;
  const cooldown = isSpell ? ownCooldown + (player?.stats?.castDelay ?? 0) : 0;

  return {
    title: item.name ?? "",
    level: isSpell ? item.rank : undefined,
    tier: isGear ? tier : undefined,
    amount: (item.amount ?? 0) > 1 ? item.amount : undefined,
    rarity: item.rarity,
    kind: isSpell ? "spell" : kindName(base),
    stats: [
      ...statLines(without(item.stats, mods.stats)),
      ...percentLines(without(item.percentStats, mods.percentStats)),
      ...(cooldown > 0 ? statLines({ cooldown }) : []),
    ],
    /* A spell that casts itself (Haste) does what its buff does, as a damage spell's damage */
    effects: [
      ...statLines(item.effects),
      ...ownBuffs.flatMap(([name, level]) => buffLines(name, level)),
    ],
    buffs: castBuffs.map(([name, level]) => ({
      name,
      level,
      /* A spell says how often each lands, even when it always does */
      ...(isSpell && { chancePercent: item.buffChance ?? 100 }),
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
      stats: [...percentLines(set.percentStats), ...statLines(set.stats)],
      triggers: triggerLines(set.triggers),
    },
    mods: {
      fixed: fixed && hands({ stats: modStatLines(fixed), triggers: triggerLines(fixed.triggers) }),
      added: card
        ? { stats: modStatLines(card, true), triggers: triggerLines(card.triggers, true) }
        : hands({
            stats: modStatLines(slotted),
            /* Gear only gets triggers from its mods, so whatever isn't the fixed mod's is added */
            triggers: triggerLines(withoutTriggers(item.triggers, fixed?.triggers ?? [])),
          }),
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
