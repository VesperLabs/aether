import type { BotTask } from "../types";

/** Stand still for a while, then move on. */
export const pause: BotTask<"pause"> = {
  run: ({ view, memory }, { ms }) => ({
    status: view.now - memory.stepStartedAt >= ms ? "done" : "running",
    intents: [{ channel: "move", type: "stop" }],
  }),
};
