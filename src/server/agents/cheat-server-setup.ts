import type { Dice } from "@/content";
import { initFakeDatabase } from "../persistence";

/**
 * What every in-process server for bots shares: the real maps, cheats on and a fake database.
 * Resolves with that database.
 */
export function prepareCheatServer(dice?: Dice) {
  process.env.PUBLIC_DIR ??= "public";
  process.env.ENABLE_CHEATS = "true";
  return initFakeDatabase(dice);
}
