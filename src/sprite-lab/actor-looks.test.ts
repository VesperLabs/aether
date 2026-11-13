import { describe, expect, it } from "vitest";
import { isShowingLook, LAB_ACTORS, toKebab } from "./actor-looks";

describe("LAB_ACTORS", () => {
  it("lists keepers first, each with a body the lab can open", () => {
    const firstMob = LAB_ACTORS.findIndex(({ isKeeper }) => !isKeeper);
    expect(firstMob).toBeGreaterThan(0);
    expect(LAB_ACTORS.slice(firstMob).every(({ isKeeper }) => !isKeeper)).toBe(true);
  });

  it("dresses a human keeper in its worn layers", () => {
    const keeper = LAB_ACTORS.find(
      ({ isKeeper, look }) => isKeeper && look.atlas.startsWith("human"),
    );
    expect(keeper).toBeDefined();
    expect(Object.values(keeper!.look.layers).some(Boolean)).toBe(true);
  });

  it("recognises a look only when every layer matches", () => {
    const { look } = LAB_ACTORS.find(({ look }) => look.atlas.startsWith("human"))!;
    expect(isShowingLook(look, look)).toBe(true);
    expect(isShowingLook(look, { ...look, layers: { ...look.layers, helmet: "x" } })).toBe(false);
  });
});

describe("toKebab", () => {
  it("turns an actor id into a file name", () => {
    expect(toKebab("chetTheMerchant")).toBe("chet-the-merchant");
  });
});
