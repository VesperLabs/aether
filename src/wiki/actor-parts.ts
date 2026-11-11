import { actors, type ActorDefinition } from "@/content";
import { placedActors } from "virtual:map-loots";

/** Every actor some map places, lowest level first: ones only tests or cheats spawn stay off the wiki. */
export const ACTORS = Object.entries(actors as Record<string, ActorDefinition>)
  .filter(([key]) => placedActors.includes(key))
  .sort(([, a], [, b]) => (a.baseStats?.level ?? 0) - (b.baseStats?.level ?? 0));

/**
 * The two groups the Characters page filters by. Keepers are the ones you can talk to: having
 * `dialogues` is what makes one. Every other actor is a mob.
 */
export const GROUPS = [
  { id: "keepers", label: "Keepers", icon: "pouch", has: (a: ActorDefinition) => !!a.dialogues },
  { id: "mobs", label: "Mobs", icon: "bounty", has: (a: ActorDefinition) => !a.dialogues },
] as const;
