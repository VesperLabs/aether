import type { GameIo } from "@/network";
import type { TickLoop, World } from "@/rules/world";
import type { Npc } from "./npc";
import type { Database } from "./persistence/database";
import type { Player } from "./player";
import type { RoomIndex } from "./room-index";
import type { Spell } from "./spell";

/** The world the server runs: the shared world state plus the socket server, database and loop. */
export type ServerWorld = World<Player, Npc, Spell, Loot, Quest> & {
  db: Database;
  io: GameIo;
  loop: TickLoop;
  /** Who is where in each room this tick (see `room-index.ts`). */
  roomIndexes?: Record<string, RoomIndex>;
};
