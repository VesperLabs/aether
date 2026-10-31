import { describe, expect, it } from "vitest";
import { ITEM_KEYS, findItemKey } from "./item-keys";

describe("item keys", () => {
  it("are unique across every type and rarity", () => {
    const keys = ITEM_KEYS.map((entry) => entry.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("find their type and rarity, ignoring case", () => {
    expect(findItemKey("SWORD")).toMatchObject({ key: "sword", type: "weapon", rarity: "common" });
    expect(findItemKey("nope")).toBeUndefined();
  });
});

describe("spell levels", () => {
  it("tell same-named spells apart by level", () => {
    expect(findItemKey("fireball")?.name).toBe("Fireball Lv. 1");
    expect(findItemKey("fireball2")).toMatchObject({
      name: "Fireball Lv. 2",
      look: { texture: "scroll-red" },
    });
  });
});
