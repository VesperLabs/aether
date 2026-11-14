import { describe, expect, it } from "vitest";
import { Item } from "./item";
import type { BuiltItem } from "./item-types";
import { ITEM_CATALOG } from "./item-catalog";

const allItems = Object.values(ITEM_CATALOG);

describe("item flavour", () => {
  it("is written for every item", () => {
    expect(allItems.filter((item) => !item.flavor).map((item) => item.key)).toEqual([]);
  });

  it("stays on the definition and isn't copied into built items", () => {
    expect(new Item(allItems[0] as Partial<BuiltItem>)).not.toHaveProperty("flavor");
  });
});
