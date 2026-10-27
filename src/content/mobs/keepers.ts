import type { questList } from "../quests/quest-list";
import { keepers1 } from "./keepers-1";
import { keepers2 } from "./keepers-2";

export const keepers = { ...keepers1, ...keepers2 } as const;

export type KeeperId = keyof typeof keepers;

/* Quests name their keeper by id. A compile error here means a quest points at a keeper that does not exist. */
type QuestKeeperRef = Extract<
  (typeof questList)[keyof typeof questList]["objectives"][number],
  { readonly type: "chat" }
>["keeper"];
export const QUEST_KEEPERS_EXIST: [QuestKeeperRef] extends [KeeperId] ? true : never = true;
