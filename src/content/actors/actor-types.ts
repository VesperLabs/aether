import type { BodyData, BodyId } from "../bodies/bodies";
import type { ItemDrop, ItemRef } from "../items/item-refs";
import type { ActorBehaviors } from "./behaviors";
import type { QuestId } from "../quests/quest-list";
import type { CharClass, StatName } from "../stats";

interface TexturedLook {
  readonly texture: string;
  readonly tint?: string;
}

export interface MobProfile {
  readonly userName: string;
  readonly race: BodyId;
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

interface ShopEntry {
  readonly item: ItemRef;
  /** How many a stackable sells per game day. Gear always sells one a day, rolled fresh. */
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
 * sells, `quests` hands them out, `drops` is its loot, and `behaviors` say how it moves and fights.
 */
export interface ActorDefinition {
  /** A line or two of lore shown in the wiki. */
  readonly flavor: string;
  readonly charClass: CharClass;
  readonly profile: MobProfile;
  readonly baseStats: { readonly level: number } & { readonly [K in StatName]?: number };
  readonly abilities?: MobAbilities;
  readonly equipment?: MobEquipment;
  /** Warning, in ms, before its attacks and spells land. Unset means the default. */
  readonly windupMs?: number;
  /**
   * `noWorldDrops` drops only its own `drops`, never random loot. `catchable: false` can't be caught
   * in a ball (keepers the game needs): it always breaks free.
   */
  readonly state?: { readonly noWorldDrops?: boolean; readonly catchable?: boolean };
  /** What it does, merged over the defaults (see `behaviors.ts`). */
  readonly behaviors?: ActorBehaviors;
  /** Where it can go, when not where its body can (the body file's `habitat`). */
  readonly habitat?: BodyData["habitat"];
  /** Items it can drop when it dies. */
  readonly drops?: readonly ItemDrop[];
  readonly dialogues?: ActorDialogues;
  readonly shop?: readonly ShopEntry[];
  readonly quests?: readonly QuestId[];
  /** Where players who set their home here respawn. */
  readonly home?: { readonly x: number; readonly y: number };
}
