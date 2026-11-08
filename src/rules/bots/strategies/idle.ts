import type { BotStrategy } from "../types";

/** Hang around. The fallback when nothing else is worth doing. */
export const idle: BotStrategy = {
  score: () => 0.1,
  plan: () => ({ id: "idle", steps: [{ task: "idle", params: {} }], step: 0 }),
};
