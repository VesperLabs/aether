import type { questList } from "../quests/quest-list";
import { actors1 } from "./actors-1";
import { actors2 } from "./actors-2";
import { actors3 } from "./actors-3";

/** Every actor the maps and cheats can place, by id. */
export const actors = { ...actors1, ...actors2, ...actors3 } as const;

export type ActorId = keyof typeof actors;

export const isActorId = (id: string): id is ActorId => Object.hasOwn(actors, id);

/* Quests name actors by id. A compile error here means a quest points at an actor that does not exist. */
type QuestObjectives = (typeof questList)[keyof typeof questList]["objectives"][number];
type QuestActorRef =
  | Extract<QuestObjectives, { readonly type: "chat" }>["keeper"]
  | Extract<QuestObjectives, { readonly type: "bounty" }>["monster"];
/** @public Compile-time check: fails the build if a quest names a missing actor. */
export const QUEST_ACTORS_EXIST: [QuestActorRef] extends [ActorId] ? true : never = true;
