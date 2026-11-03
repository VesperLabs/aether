import type { Logger } from "@/server/log/logger";
import type { Dice } from "@/content/items/dice";
import type { GameIo } from "@/network/socket/game-socket";
import type { NetIds } from "@/network/sync/net-ids";
import type { Rng, TickLoop, World } from "@/rules/world";
import type { Npc } from "@/server/npcs/npc";
import type { Database } from "@/server/persistence/database";
import type { Player } from "@/server/players/player";
import type { ServerConfig } from "@/server/config/config";
import type { RoomIndex } from "./room-index";
import type { Spell } from "@/server/spells/spell";

/** The world the server runs: the shared world state plus the socket server, database and loop. */
export type ServerWorld = World<Player, Npc, Spell, Loot, Quest> & {
  config: ServerConfig;
  db: Database;
  io: GameIo;
  loop: TickLoop;
  /** Game time in milliseconds. Every server timestamp reads it, so tests can drive time. */
  now: () => number;
  /** Where the server writes what it did and what went wrong. */
  log: Logger;
  /** The one seeded random source for the whole world, so ticks can be replayed. */
  rng: Rng;
  /** Rolls and ids for items, NPCs, loot and parties. `rng` is its `random`. */
  dice: Dice;
  /** Numbers for characters on the binary pose wire. */
  netIds: NetIds;
  /** Who is where in each room this tick (see `room-index.ts`). */
  roomIndexes?: Record<string, RoomIndex>;
};
