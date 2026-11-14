import type { EffectName, StatName } from "../stats";
import type { ModName } from "./mods";

/** Everything a player wears or holds: what drops with mod slots. */
export type GearType =
  | "weapon"
  | "ranged"
  | "shield"
  | "helmet"
  | "armor"
  | "gloves"
  | "boots"
  | "pants"
  | "accessory"
  | "ring"
  | "amulet"
  | "bag";

/** How many mod slots gear can have. The count is its rarity: 0 common, 1–2 magic, 3–4 rare. */
export type SlotCount = 0 | 1 | 2 | 3 | 4;

export const MAX_SLOTS = 4;

type FixedBlock<K extends string> = { readonly [S in K]?: number };

interface Requirements {
  readonly strength?: number;
  readonly dexterity?: number;
  readonly intelligence?: number;
  readonly vitality?: number;
  readonly weaponType?: "melee";
}

/** One tier of a family: what it is called and how it looks. Its stats come from the family. */
interface TierDefinition {
  readonly key: string;
  readonly name: string;
  /** A line or two for the wiki. Never copied onto built items. */
  readonly flavor: string;
  /** Defaults to the family's. */
  readonly texture?: string;
  readonly tint?: string;
  /** Left out of random drops: only drops from monsters that list it. */
  readonly exclusive?: boolean;
}

/**
 * A family's six tiers, weakest first: `null` where one hasn't been made yet. Tier 1 is level 1,
 * and each tier adds 8 levels.
 */
type Tiers = readonly [
  TierDefinition | null,
  TierDefinition | null,
  TierDefinition | null,
  TierDefinition | null,
  TierDefinition | null,
  TierDefinition | null,
];

/**
 * A kind of gear (caps, daggers, round shields) and its tiers, weakest first. Every tier has the
 * family's stats times its tier; slow stats (speeds, reach, costs, block) stay as written.
 */
export interface FamilyDefinition {
  readonly type: GearType;
  readonly texture: string;
  readonly stats?: FixedBlock<StatName>;
  readonly effects?: FixedBlock<EffectName>;
  readonly requirements?: Requirements;
  /** Bags only: how many items it holds at tier 1. */
  readonly space?: number;
  readonly tiers: Tiers;
}

export type Families = Readonly<Record<string, FamilyDefinition>>;

/** The keys of every tier a family table has made, so refs to a missing tier don't compile. */
export type TierKeyOf<F extends Families> = {
  [K in keyof F]: Extract<F[K]["tiers"][number], TierDefinition>["key"];
}[keyof F];

/** A one-of-a-kind item: a family tier with its own name and look, 4 slots and a fixed mod. */
export interface UniqueDefinition<Family extends string = string> {
  readonly family: Family;
  readonly tier: number;
  readonly name: string;
  readonly flavor: string;
  readonly texture?: string;
  readonly tint?: string;
  /** Every unique has one, except bags, which take no mods. */
  readonly mod?: ModName;
  readonly exclusive?: boolean;
}

export type Uniques<F extends Families> = Readonly<
  Record<string, UniqueDefinition<Extract<keyof F, string>>>
>;
