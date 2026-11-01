import type { ItemDrop, ItemRef } from "../items/item-refs";
import type { CharClass, StatName } from "../stats";

export type MobRace =
  | "abomination"
  | "bat"
  | "bear"
  | "bee"
  | "cat"
  | "crab"
  | "dog"
  | "earth-elemental"
  | "fish"
  | "human"
  | "merman"
  | "orchid"
  | "raccoon"
  | "slime"
  | "spider"
  | "wolf"
  | "wraith"
  | "wyrm"
  | "zombie";

interface TexturedLook {
  readonly texture: string;
  readonly tint?: string;
}

export interface MobProfile {
  readonly userName: string;
  readonly race: MobRace;
  readonly gender?: "male" | "female";
  readonly tint?: string;
  readonly scale?: number;
  readonly face?: TexturedLook;
  readonly hair?: TexturedLook;
  readonly whiskers?: TexturedLook;
}

export type MobEquipment = {
  readonly [
    slot in
      | "handLeft"
      | "handRight"
      | "helmet"
      | "accessory"
      | "armor"
      | "pants"
      | "boots"
      | "gloves"
  ]?: ItemRef | null;
};

/** Ability slots "1" to "5" hold a spell item. */
export type MobAbilities = { readonly [slot in "1" | "2" | "3" | "4" | "5"]?: ItemRef };

export interface MobBase {
  readonly charClass: CharClass;
  readonly profile: MobProfile;
  readonly baseStats: { readonly level: number } & { readonly [K in StatName]?: number };
  readonly hitBoxSize?: { readonly width: number; readonly height: number };
  readonly abilities?: MobAbilities;
}

/** Ways a mob can move; the game picks the one that fits best each tick. */
export type MobMovementBehavior =
  | "chase"
  | "unstuck"
  | "guard"
  | "talk"
  | "leash"
  | "wander"
  | "reset"
  | "retreat"
  | "kite"
  | "follow";

/**
 * Opt-in behaviors: `aggressive` attacks players on sight (otherwise it only fights back), `retreat`
 * runs when badly hurt, `kite` keeps casters and archers at range, `follow` stays near `leader`.
 * The rest are on for every mob already.
 */
export type MobBehavior = MobMovementBehavior | "aggressive";

export interface NastyDefinition extends MobBase {
  /** A line or two of flavour text shown in the wiki. */
  readonly flavor: string;
  readonly state?: { readonly noWorldDrops?: boolean };
  /** Added to the defaults every mob has (chase, wander, leash and so on). */
  readonly behaviors?: readonly MobBehavior[];
  /**
   * Content name of the mob this one keeps close to (needs `follow`). A `leader` property on the
   * map object overrides it, so each pack can have its own.
   */
  readonly leader?: string;
  /** Items this mob can drop when it dies. */
  readonly drops?: readonly ItemDrop[];
}
