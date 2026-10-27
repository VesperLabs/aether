import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ItemTooltip } from "./item-tooltip";

const sword = {
  name: "Rusty Sword",
  base: "short-sword",
  rarity: "common",
  cost: 5,
  stats: { minAttackDamage: 1, maxAttackDamage: 3 },
  requirements: { strength: 10 },
};

describe("ItemTooltip", () => {
  test("shows the item without a player", () => {
    render(<ItemTooltip item={sword} tooltipId="t" show />);
    expect(screen.getByText("Rusty Sword")).toBeInTheDocument();
    expect(screen.getByText("1 ↔ 3")).toBeInTheDocument();
    expect(screen.getByText("Requirements")).toBeInTheDocument();
  });

  test("shows the set bonus and double-click hint", () => {
    render(
      <ItemTooltip
        item={{ name: "Chet's Shirt", base: "food", setName: "chets" }}
        player={{ stats: {}, state: { activeSets: ["chets"] } }}
        tooltipId="t"
        show
      />,
    );
    expect(screen.getByText(/Chet's Leisureware/)).toBeInTheDocument();
    expect(screen.getByText("Double click to consume")).toBeInTheDocument();
  });
});
