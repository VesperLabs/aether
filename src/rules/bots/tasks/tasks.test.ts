import { describe, expect, it } from "vitest";
import { botPersonalities } from "@/content";
import { createBotMemory } from "../brain";
import type { BotMind, BotView } from "../types";
import { pause } from "./pause";
import { walkTo } from "./walk-to";

const to = { x: 50, y: 60 };

function mind(walk: BotView["self"]["walk"], now = 0, stepStartedAt = 0): BotMind {
  return {
    view: {
      now,
      self: {
        id: "bot-1",
        roomName: "town",
        x: 0,
        y: 0,
        hp: 10,
        maxHp: 10,
        isDead: false,
        home: { x: 0, y: 0 },
        walk,
      },
    },
    memory: { ...createBotMemory(0, () => 0), stepStartedAt },
    personality: botPersonalities.wanderer,
    rng: () => 0,
  };
}

describe("walkTo", () => {
  it("asks to walk when it isn't walking there yet", () => {
    expect(walkTo.run(mind(null), { to })).toEqual({
      status: "running",
      intents: [{ channel: "move", type: "walkTo", to }],
    });
  });

  it("asks again when the walk under way goes somewhere else", () => {
    const other = { to: { x: 1, y: 1 }, status: "walking" as const };
    expect(walkTo.run(mind(other), { to }).intents).toHaveLength(1);
  });

  it("keeps going quietly, then is done on arrival", () => {
    expect(walkTo.run(mind({ to, status: "walking" }), { to })).toEqual({
      status: "running",
      intents: [],
    });
    expect(walkTo.run(mind({ to, status: "arrived" }), { to }).status).toBe("done");
  });

  it("fails when the way is blocked", () => {
    expect(walkTo.run(mind({ to, status: "blocked" }), { to }).status).toBe("failed");
  });
});

describe("pause", () => {
  it("stands still until its time is up", () => {
    expect(pause.run(mind(null, 900, 0), { ms: 1000 })).toEqual({
      status: "running",
      intents: [{ channel: "move", type: "stop" }],
    });
    expect(pause.run(mind(null, 1000, 0), { ms: 1000 }).status).toBe("done");
  });
});
