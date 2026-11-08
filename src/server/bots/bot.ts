import type { BotPersonalityId } from "@/content";
import type { BotMemory } from "@/rules/bots";
import type { Point, Rng } from "@/rules/world";
import type { CommandContext } from "@/server/net/command-context";

/** A server-run player: its character lives in `world.players` under the same id. */
export interface Bot {
  id: string;
  personality: BotPersonalityId;
  memory: BotMemory;
  /** Its own seeded rolls, so a bot's choices replay the same. */
  rng: Rng;
  /** A paused bot stands where it is and thinks nothing. */
  isPaused: boolean;
  /** What its commands run with, as if it had sent them over a socket. */
  ctx: CommandContext;
  /** Where it spawned. */
  home: Point;
  /** The walk the server is carrying out for it, if any (see `navigation.ts`). */
  walk: BotWalk | null;
}

/** A walk in progress: the path to follow, and how it is going. */
interface BotWalk {
  roomName: string;
  to: Point;
  /** Waypoints still ahead, the destination last. */
  path: Point[];
  status: "walking" | "arrived" | "blocked";
  /** When it last got noticeably closer to its next waypoint, to tell when it is stuck. */
  progressAt: number;
  /** The closest it has been to its next waypoint. */
  bestDistance: number;
}
