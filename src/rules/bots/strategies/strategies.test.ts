import { describe, expect, it } from "vitest";
import { botPersonalities } from "@/content";
import { createRng } from "@/rules/world";
import { createBotMemory } from "../brain";
import type { BotMind } from "../types";
import { wander } from "./wander";

function mind(personality: BotMind["personality"], seed = 1): BotMind {
  return {
    view: {
      now: 0,
      self: {
        id: "bot-1",
        roomName: "town",
        x: 0,
        y: 0,
        hp: 10,
        maxHp: 10,
        isDead: false,
        home: { x: 100, y: 200 },
        walk: null,
      },
    },
    memory: createBotMemory(0, () => 0),
    personality,
    rng: createRng(seed),
  };
}

describe("wander", () => {
  it("only appeals to bots that wander", () => {
    expect(wander.score(mind(botPersonalities.idler))).toBe(0);
    expect(wander.score(mind(botPersonalities.wanderer))).toBeGreaterThan(0);
  });

  it("walks to a spot within its radius of home, then rests", () => {
    const { wanderRadius } = botPersonalities.wanderer;
    for (let seed = 1; seed <= 50; seed++) {
      const plan = wander.plan(mind(botPersonalities.wanderer, seed));
      const [walk, rest] = plan.steps;
      if (walk?.task !== "walkTo" || rest?.task !== "pause") throw new Error("unexpected plan");
      const { to } = walk.params;
      expect(Math.hypot(to.x - 100, to.y - 200)).toBeLessThanOrEqual(wanderRadius + 1);
      expect(rest.params.ms).toBeGreaterThanOrEqual(1000);
    }
  });

  it("plans the same walk from the same seed", () => {
    const personality = botPersonalities.wanderer;
    expect(wander.plan(mind(personality, 7))).toEqual(wander.plan(mind(personality, 7)));
  });
});
