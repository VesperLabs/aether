import type { GameIo } from "@/shared/network";
import type { TickLoop, World } from "@/shared/rules/world";
import type { Npc } from "./npc";
import type { Database } from "./persistence/database";
import type { Player } from "./player";
import type { Spell } from "./spell";

/** The world the server runs: the shared world state plus the socket server, database and loop. */
export type ServerWorld = World<Player, Npc, Spell, Loot, Quest> & {
  db: Database;
  io: GameIo;
  loop: TickLoop;
};
