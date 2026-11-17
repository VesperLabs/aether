import type { questList } from "../quests/quest-list";
import type { ItemDrop } from "../items/item-refs";
import { CARD_DROPS } from "../items/card";
import { actorDefs } from "./actor-defs";

type Defs = typeof actorDefs;

/**
 * Every actor the maps and cheats can place, by id: as written, with its card added to its drops
 * (each card names its actor; its rarity sets the chance), so no actor lists its own card.
 */
export const actors = Object.fromEntries(
  Object.entries(actorDefs).map(([id, actor]) => {
    const card = CARD_DROPS.get(id);
    const drops = [
      ...((actor as { drops?: readonly ItemDrop[] }).drops ?? []),
      ...(card ? [card] : []),
    ];
    return [id, drops.length ? { ...actor, drops } : actor];
  }),
) as { readonly [K in keyof Defs]: Defs[K] & { readonly drops?: readonly ItemDrop[] } };

export type ActorId = keyof Defs;

export const isActorId = (id: string): id is ActorId => Object.hasOwn(actors, id);

/* Quests name actors by id. A compile error here means a quest points at an actor that does not exist. */
type QuestObjectives = (typeof questList)[keyof typeof questList]["objectives"][number];
type QuestActorRef =
  | Extract<QuestObjectives, { readonly type: "chat" }>["keeper"]
  | Extract<QuestObjectives, { readonly type: "bounty" }>["monster"];
/** @public Compile-time check: fails the build if a quest names a missing actor. */
export const QUEST_ACTORS_EXIST: [QuestActorRef] extends [ActorId] ? true : never = true;
