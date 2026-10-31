import { describe, expect, it } from "vitest";
import { npcBaseStats, npcStats } from "./npc";

describe("npcBaseStats", () => {
  it("keeps the NPC's level and adds its overrides on top", () => {
    const stats = npcBaseStats({ baseStats: { level: 3, defense: 2 }, charClass: "warrior" });
    expect(stats.level).toBe(3);
    expect(stats.defense).toBe(2);
  });

  it("starts monsters with no flat HP or MP and grows vitality fast", () => {
    const stats = npcBaseStats({ baseStats: { level: 4 } });
    expect(stats.maxHp).toBe(0);
    expect(stats.maxMp).toBe(0);
    expect(stats.vitality).toBe(4 + 4 * 5);
  });
});

describe("npcStats", () => {
  it("gets HP from vitality", () => {
    expect(npcStats({ baseStats: { level: 2 } }).maxHp).toBeGreaterThan(0);
  });
});
