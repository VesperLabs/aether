import type { Database } from "./database";
import type { Logger } from "@/server/log/logger";

type SaveWorld = { db: Database; log: Logger };

/**
 * The one way to save a player. Writes are tracked by the database (shutdown waits for them);
 * a failure is logged and never thrown, so callers may await the result or let it run.
 */
export async function savePlayer(world: SaveWorld, player: Parameters<Database["updateUser"]>[0]) {
  try {
    await world.db.updateUser(player);
  } catch (error) {
    world.log.error("Saving a player failed", error);
  }
}

/** Saves where a player is or respawns, with the same error handling as `savePlayer`. */
export async function saveMapDetails(
  world: SaveWorld,
  details: Parameters<Database["updateUserMapDetails"]>[0],
) {
  try {
    await world.db.updateUserMapDetails(details);
  } catch (error) {
    world.log.error("Saving a player's map details failed", error);
  }
}
