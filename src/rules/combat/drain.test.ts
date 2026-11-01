import { describe, expect, it } from "vitest";
import { calculateDrains } from "./drain";

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
