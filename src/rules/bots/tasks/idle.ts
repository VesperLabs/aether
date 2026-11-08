import type { BotTask } from "../types";

/** Stand still. Never finishes on its own: the strategy replaces it. */
export const idle: BotTask<"idle"> = {
  run: () => ({ status: "running", intents: [{ channel: "move", type: "stop" }] }),
};
