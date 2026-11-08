import { describe, expect, it } from "vitest";
import { botPersonalities } from "@/content";
import { createRng } from "@/rules/world";
import { createBotMemory, thinkBot } from "./brain";
import { BOT_RESPAWN_DELAY_MS, BOT_TASK_MS } from "./constants";
import type { BotMemory, BotView } from "./types";

const view = (now: number, isDead = false): BotView => ({
  now,
  self: {
    id: "bot-1",
    roomName: "town",
    x: 0,
    y: 0,
    hp: isDead ? 0 : 10,
    maxHp: 10,
    isDead,
    home: { x: 0, y: 0 },
    walk: null,
  },
});

function think(memory: BotMemory, now: number, isDead = false) {
  return thinkBot({
    view: view(now, isDead),
    memory,
    personality: botPersonalities.idler,
    rng: createRng(1),
  });
}

describe("thinkBot", () => {
  it("picks a strategy and plan on its first think", () => {
    const { memory } = think(createBotMemory(0, createRng(1)), 0);
    expect(memory.strategy).toBe("idle");
    expect(memory.plan?.steps[0]?.task).toBe("idle");
  });

  it("an idle bot stands still once its task is due", () => {
    const { intents } = think(
      createBotMemory(0, () => 0),
      0,
    );
    expect(intents).toEqual([{ channel: "move", type: "stop" }]);
  });

  it("does not run its task again before the next beat", () => {
    const first = think(
      createBotMemory(0, () => 0),
      0,
    );
    expect(think(first.memory, BOT_TASK_MS - 1).intents).toEqual([]);
    expect(think(first.memory, BOT_TASK_MS).intents).toHaveLength(1);
  });

  it("a dead bot does nothing until the respawn delay passes, then respawns", () => {
    const died = think(
      createBotMemory(0, () => 0),
      1000,
      true,
    );
    expect(died.memory.diedAt).toBe(1000);
    expect(died.intents).toEqual([]);
    const later = think(died.memory, 1000 + BOT_RESPAWN_DELAY_MS, true);
    expect(later.intents).toEqual([{ channel: "action", type: "respawn" }]);
  });

  it("forgets when it died once it is alive again", () => {
    const died = think(
      createBotMemory(0, () => 0),
      1000,
      true,
    );
    expect(think(died.memory, 2000).memory.diedAt).toBeNull();
  });
});
