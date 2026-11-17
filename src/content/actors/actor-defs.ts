import { actors1 } from "./actors-1";
import { actors2 } from "./actors-2";
import { actors3 } from "./actors-3";
import { actors4 } from "./actors-4";

/**
 * Every actor as written, by id, before anything is added from elsewhere: cards read these (their
 * names, levels, flavor), and `actors` adds each one's card to its drops.
 */
export const actorDefs = { ...actors1, ...actors2, ...actors3, ...actors4 } as const;
