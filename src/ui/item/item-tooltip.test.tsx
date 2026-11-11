import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { ItemTooltip } from "./item-tooltip";

const sword = {
  name: "Rusty Sword",
  base: "short-sword",
  rarity: "common",
  cost: 5,
  stats: { minAttackDamage: 1, maxAttackDamage: 3 },
  requirements: { strength: 10 },
};

/* A controlled tooltip opens at its anchor, so each test gives it one */
const Anchored = ({ children }: { children: ReactNode }) => (
  <>
    <span data-tooltip-id="t" />
    {children}
  </>
);

describe("ItemTooltip", () => {
  test("shows the item without a player", () => {
    render(
      <Anchored>
        <ItemTooltip item={sword} tooltipId="t" show />
      </Anchored>,
    );
    expect(screen.getByText("Rusty Sword")).toBeInTheDocument();
    expect(screen.getByText("1 ↔ 3")).toBeInTheDocument();
    expect(screen.getByText("Requires")).toBeInTheDocument();
  });

  test("shows the set bonus and double-click hint", () => {
    render(
      <Anchored>
        <ItemTooltip
          item={{ name: "Chet's Shirt", base: "food", setName: "chets" }}
          player={{ stats: {}, state: { activeSets: ["chets"] } }}
          tooltipId="t"
          show
        />
      </Anchored>,
    );
    expect(screen.getByText(/Chet's Leisureware/)).toBeInTheDocument();
    expect(screen.getByText("Double click to consume")).toBeInTheDocument();
  });
});
