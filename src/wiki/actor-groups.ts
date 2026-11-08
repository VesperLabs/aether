import { actors, type ActorDefinition } from "@/content";

const ALL = Object.entries(actors as Record<string, ActorDefinition>);

/** Actors players can talk to: the Keepers page. Being a keeper is just having `dialogues`. */
export const TALKING_ACTORS = ALL.filter(([, actor]) => actor.dialogues);

/** Everyone else: the Monsters page. */
export const SILENT_ACTORS = ALL.filter(([, actor]) => !actor.dialogues);
