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

export interface NastyDefinition extends MobBase {
  /** A line or two of flavour text shown in the wiki. */
  readonly flavor: string;
  readonly state?: { readonly isAggro?: boolean; readonly noWorldDrops?: boolean };
  /** Items this mob can drop when it dies. */
  readonly drops?: readonly ItemDrop[];
}
