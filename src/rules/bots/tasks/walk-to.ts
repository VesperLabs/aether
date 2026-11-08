import type { BotTask } from "../types";

/** Walk to a spot. Done on arrival; fails when the server finds no way there or gets stuck. */
export const walkTo: BotTask<"walkTo"> = {
  run: ({ view }, { to }) => {
    const { walk } = view.self;
    const isThisWalk = walk && walk.to.x === to.x && walk.to.y === to.y;
    if (!isThisWalk)
      return { status: "running", intents: [{ channel: "move", type: "walkTo", to }] };
    if (walk.status === "arrived") return { status: "done", intents: [] };
    if (walk.status === "blocked") return { status: "failed", intents: [] };
    return { status: "running", intents: [] };
  },
};
