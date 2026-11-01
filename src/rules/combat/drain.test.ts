import { describe, expect, it } from "vitest";
import { calculateDrains, mergeDrainHits } from "./drain";

describe("calculateDrains", () => {
  it("drains a percentage of physical damage, at least 1", () => {
    expect(calculateDrains(50, { hpSteal: 10, mpSteal: 10, spSteal: 10 })).toEqual([
      { resource: "hp", amount: 5 },
      { resource: "mp", amount: 5 },
      { resource: "sp", amount: 5 },
    ]);
    expect(calculateDrains(3, { hpSteal: 10 })).toEqual([{ resource: "hp", amount: 1 }]);
    expect(calculateDrains(7, { mpSteal: 10 })).toEqual([{ resource: "mp", amount: 1 }]);
  });

  it("skips resources without a steal stat", () => {
    expect(calculateDrains(50, { hpSteal: 0, mpSteal: undefined })).toEqual([]);
    expect(calculateDrains(50, undefined)).toEqual([]);
  });
});

describe("mergeDrainHits", () => {
  it("sums each drainer's drains per resource and leaves other hits alone", () => {
    const hits = [
      { type: "hp", amount: -10, from: "me", to: "a" },
      { type: "hp", amount: 2, isDrain: true, from: "a", to: "me" },
      { type: "hp", amount: -12, from: "me", to: "b" },
      { type: "hp", amount: 3, isDrain: true, from: "b", to: "me" },
      { type: "mp", amount: 1, isDrain: true, from: "b", to: "me" },
    ];
    expect(mergeDrainHits(hits)).toEqual([
      { type: "hp", amount: -10, from: "me", to: "a" },
      { type: "hp", amount: 5, isDrain: true, from: "a", to: "me" },
      { type: "hp", amount: -12, from: "me", to: "b" },
      { type: "mp", amount: 1, isDrain: true, from: "b", to: "me" },
    ]);
    expect(hits[1].amount).toBe(2);
  });
});
