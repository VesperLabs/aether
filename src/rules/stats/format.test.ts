import { describe, expect, it } from "vitest";
import { formatStats } from "./format";

describe("formatStats", () => {
  it("rounds float sums to two decimals, everywhere a stat shows", () => {
    const shown = formatStats({
      critChance: 0.1 + 0.2,
      dodgeChance: 12.345678,
      minDamage: 1.1 + 2.2,
      maxDamage: 4.000000001,
      attackDelay: 1234.5678,
    });
    expect(shown.critChance).toBe("0.3%");
    expect(shown.dodgeChance).toBe("12.35%");
    expect(shown.Damage).toBe("3.3 ↔ 4");
    expect(shown.attackDelay).toBe("1.23s");
  });
});

describe("damage over time", () => {
  it("reads as damage per second, whatever the tick", () => {
    expect(formatStats({ poisonDamage: 2, burnDamage: 3, bleedDamage: 1 })).toEqual({
      poisonDamage: "2/s",
      burnDamage: "3/s",
      bleedDamage: "1.43/s",
    });
  });
});

describe("duration", () => {
  it("reads as infinite for a buff that lasts until broken", () => {
    expect(formatStats({ duration: -1 }).duration).toBe("∞");
  });
});
