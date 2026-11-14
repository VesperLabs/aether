import { describe, expect, it } from "vitest";
import { mergeTriggers } from "./trigger-merge";

const venom = { event: "onAttackHit", type: "debuff", name: "poison", level: 2, chance: 20 };

describe("mergeTriggers", () => {
  it("adds up the chances of copies of one trigger, at the highest level", () => {
    expect(mergeTriggers([venom, { ...venom, level: 3 }])).toEqual([
      { event: "onAttackHit", type: "debuff", name: "poison", level: 3, percent: 10 },
    ]);
  });

  it("keeps different triggers apart, even for the same buff on another event", () => {
    const hurt = { ...venom, event: "onHurt", type: "buff", name: "endurance" };
    expect(mergeTriggers([venom, hurt, { ...hurt, event: "onAttackHit" }])).toHaveLength(3);
  });

  it("never goes past 100%", () => {
    expect(mergeTriggers([{ ...venom, chance: 1 }, venom])[0]?.percent).toBe(100);
  });
});
