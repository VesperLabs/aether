import { describe, expect, it } from "vitest";
import { Item } from "./item";
import { itemList } from "./item-scaling";

const allItems = Object.values(itemList).flatMap((byRarity) =>
  Object.values(byRarity).flatMap((byKey) => Object.entries(byKey)),
);

describe("item flavour", () => {
  it("is written for every item", () => {
    const missing = allItems.filter(([, item]) => !item.flavor).map(([key]) => key);
    expect(missing).toEqual([]);
  });

  it("stays on the definition and isn't copied into built items", () => {
    const [, definition] = allItems[0];
    expect(new Item(definition)).not.toHaveProperty("flavor");
  });
});
