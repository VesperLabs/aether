import { describe, expect, it } from "vitest";
import { applyAddBuff } from "./character-buffs";

/** A character whose max HP and MP grow by the percent its buffs give. */
function holder(hp: number) {
  const base = { maxHp: 200, maxMp: 100 };
  const character = {
    buffs: [] as Parameters<typeof applyAddBuff>[0]["buffs"],
    stats: { hp, mp: 50, ...base } as Record<string, number>,
    state: {} as Parameters<typeof applyAddBuff>[0]["state"],
    x: 0,
    y: 0,
    world: { now: () => 0 },
    knockBack: () => {},
    addBuff: () => {},
    dispelBuffsByProperty: () => {},
    calculateStats() {
      const percent = (key: string) =>
        character.buffs.reduce((sum, b) => sum + ((b.percentStats ?? {})[key] ?? 0), 0);
      character.stats.maxHp = base.maxHp + (base.maxHp * percent("maxHp")) / 100;
      character.stats.maxMp = base.maxMp + (base.maxMp * percent("maxMp")) / 100;
    },
  };
  return character;
}

describe("applyAddBuff", () => {
  it("fills the max HP a buff adds, once", () => {
    const character = holder(120);
    applyAddBuff(character, { name: "endurance", level: 2 });
    expect(character.stats).toMatchObject({ maxHp: 240, hp: 160 });
    applyAddBuff(character, { name: "endurance", level: 2 });
    expect(character.stats.hp).toBe(160);
  });

  it("fills the max MP a buff adds", () => {
    const character = holder(120);
    applyAddBuff(character, { name: "genius", level: 1 });
    expect(character.stats).toMatchObject({ maxMp: 110, mp: 60 });
  });

  it("never revives the dead", () => {
    const character = holder(0);
    applyAddBuff(character, { name: "endurance", level: 1 });
    expect(character.stats.hp).toBe(0);
  });
});
