import type { DoorData } from "@/rules/movement";
import type { Point } from "@/rules/world";

/** Something a bot could do next, with a label a person (or a language model) can read. */
export type Option =
  | { kind: "door"; label: string; spot: Point; door: DoorData }
  | { kind: "visit"; label: string; spot: Point }
  | { kind: "stroll"; label: string; spot: Point };

/** What a planner is shown: where the bot is, what it remembers, and what it could do. */
interface Situation {
  roomName: string;
  /** Rooms it has been in lately, most recent last. */
  recentRooms: string[];
  /** Goals it has reached in this room so far. */
  goalsHere: number;
  /** Never empty: a brain with nothing to offer waits instead of asking. */
  options: Option[];
}

/** What a planner decided: which option to take, and how briskly to walk there. */
interface Plan {
  /** Index into `Situation.options`. */
  choice: number;
  /** Share of walking speed. */
  pace: number;
}

/**
 * Picks what a bot does next from a menu of options it is offered. Brains do the walking,
 * fighting and fleeing; a planner only chooses, so it can be a few lines of weighted dice or a
 * language model a host provides. It may be slow: brains ask it only between goals.
 */
export type Planner = (situation: Situation) => Promise<Plan>;
