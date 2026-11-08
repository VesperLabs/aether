import type { Dice } from "@/content";
import type { GameIo, NetIds } from "@/network";
import type { Rng, TickLoop, World } from "@/rules/world";
import type { Npc } from "./npc";
import type { Database } from "./persistence/database";
import type { Player } from "./player";
import type { RoomIndex } from "./room-index";
import type { Spell } from "./spell";
import type { Ball } from "./balls";
import type { TickHealth } from "./tick-health";

/** The world the server runs: the shared world state plus the socket server, database and loop. */
export type ServerWorld = World<Player, Npc, Spell, Loot, Quest> & {
  db: Database;
  io: GameIo;
  loop: TickLoop;
  /** Game time in milliseconds. Every server timestamp reads it, so tests can drive time. */
  now: () => number;
  /** The one seeded random source for the whole world, so ticks can be replayed. */
  rng: Rng;
  /** Rolls and ids for items, NPCs, loot and parties. `rng` is its `random`. */
  dice: Dice;
  /** Numbers for characters on the binary pose wire. */
  netIds: NetIds;
  /** Server-run players, by id. Each one also has a character in `players`. */
  /** Thrown balls in flight or struggling, by id (see `balls.ts`). */
  balls: Record<string, Ball>;
  /** Sockets watching a room without a character. They keep the world running. */
  observers: Set<string>;
  /** Who is where in each room this tick (see `room-index.ts`). */
  roomIndexes?: Record<string, RoomIndex>;
  /** Wall-clock tick and event loop timings, for the net stats panel. */
  tickHealth: TickHealth;
};
