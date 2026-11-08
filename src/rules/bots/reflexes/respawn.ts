import { BOT_RESPAWN_DELAY_MS } from "../constants";
import type { BotReflex } from "../types";

/** Get back up a moment after dying. */
export const respawn: BotReflex = ({ view, memory }) => {
  if (!view.self.isDead || memory.diedAt === null) return [];
  if (view.now - memory.diedAt < BOT_RESPAWN_DELAY_MS) return [];
  return [{ priority: 100, intent: { channel: "action", type: "respawn" } }];
};
