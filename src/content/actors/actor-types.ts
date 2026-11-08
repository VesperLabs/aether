import type { ItemDrop, ItemRef } from "../items/item-refs";
import type { BotPersonalityId } from "../bots/personalities";
import type { QuestId } from "../quests/quest-list";
import type { CharClass, StatName } from "../stats";

type MobRace =
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

type MobEquipment = {
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
type MobAbilities = { readonly [slot in "1" | "2" | "3" | "4" | "5"]?: ItemRef };

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
 * Opt-in behaviors: `aggressive` attacks players on sight (otherwise it only fights back),
 * `shootsOverWalls` fires across collision (fish in water) instead of moving for a clear shot, `retreat`
 * limps away once for a few seconds when badly hurt, `kite` keeps casters and archers at range, `follow` stays near a leader (set per spawn with a
 * `leader` property on the map object, which turns `follow` on by itself).
 * The rest are on for every mob already.
 */
export type MobBehavior = MobMovementBehavior | "aggressive" | "shootsOverWalls";

interface ShopEntry {
  readonly item: ItemRef;
  readonly stock: number;
}

/** What players see when they talk to an actor, by topic. */
interface ActorDialogues {
  readonly greet?: string;
  readonly quests?: string;
  readonly shop?: string;
  readonly home?: string;
}

/**
 * Anything in the world that isn't a player: a crab, a shopkeeper, a tamed pet. There are no kinds of
 * actor; what one does comes from the parts it has. `dialogues` lets players talk to it, `shop`
 * sells, `quests` hands them out, `drops` is its loot, and `behaviors` shape how it moves and fights.
 * A `mind` swaps those behaviors for a planning brain (`rules/bots`) that acts like a player would.
 */
export interface ActorDefinition {
  /** A line or two of lore shown in the wiki. */
  readonly flavor: string;
  readonly charClass: CharClass;
  readonly profile: MobProfile;
  readonly baseStats: { readonly level: number } & { readonly [K in StatName]?: number };
  readonly hitBoxSize?: { readonly width: number; readonly height: number };
  readonly abilities?: MobAbilities;
  readonly equipment?: MobEquipment;
  /** Warning, in ms, before its attacks and spells land. Unset means the default. */
  readonly windupMs?: number;
  /** `isStatic` never moves; `noWorldDrops` drops only its own `drops`, never random loot. */
  readonly state?: { readonly isStatic?: boolean; readonly noWorldDrops?: boolean };
  /** Thinks with this planning brain instead of `behaviors`. */
  readonly mind?: BotPersonalityId;
  /** Added to the defaults every actor has (chase, wander, leash and so on). */
  readonly behaviors?: readonly MobBehavior[];
  /** Items it can drop when it dies. */
  readonly drops?: readonly ItemDrop[];
  readonly dialogues?: ActorDialogues;
  readonly shop?: readonly ShopEntry[];
  readonly quests?: readonly QuestId[];
  /** Where players who set their home here respawn. */
  readonly home?: { readonly x: number; readonly y: number };
}
