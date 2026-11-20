import { describe, expect, it } from "vitest";
import { ITEM_CATALOG, ItemBuilder, PREVIEW_DICE } from "@/content";
import { rollSpellBuff } from "./damage";

describe("rollSpellBuff", () => {
  it("always lands without a chance", () => {
    expect(rollSpellBuff(undefined, () => 0.99)).toBe(true);
  });
  it("lands only on a roll within the chance", () => {
    expect(rollSpellBuff(25, () => 0.1)).toBe(true);
    expect(rollSpellBuff(25, () => 0.9)).toBe(false);
  });
  it("carries Fireball's burn chance onto the built item and every tier", () => {
    expect(
      (ItemBuilder.buildItem(PREVIEW_DICE, "fireball") as { buffChance?: number }).buffChance,
    ).toBe(25);
    expect(ITEM_CATALOG.fireball3.buffChance).toBe(25);
  });
});
