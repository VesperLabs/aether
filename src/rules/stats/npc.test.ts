import { describe, expect, it } from "vitest";
import { npcBaseStats, npcStats } from "./npc";
import { monsterHealth } from "./power";

describe("npcBaseStats", () => {
  it("keeps the NPC's level and adds its overrides on top", () => {
    const stats = npcBaseStats({ baseStats: { level: 3, defense: 2 }, charClass: "warrior" });
    expect(stats.level).toBe(3);
    expect(stats.defense).toBe(2);
  });

  it("puts monster HP on the monster curve, with no flat MP", () => {
    expect(npcStats({ baseStats: { level: 4 } }).maxHp).toBe(monsterHealth(4));
    expect(npcBaseStats({ baseStats: { level: 4 } }).maxMp).toBe(0);
  });

  it("adds the NPC's own maxHp on top of the curve", () => {
    expect(npcStats({ baseStats: { level: 4, maxHp: 100 } }).maxHp).toBe(monsterHealth(4) + 100);
  });
});

describe("npcStats", () => {
  it("gets HP from vitality", () => {
    expect(npcStats({ baseStats: { level: 2 } }).maxHp).toBeGreaterThan(0);
  });
});
