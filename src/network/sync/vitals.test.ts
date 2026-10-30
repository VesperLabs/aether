import { describe, expect, it } from "vitest";
import { decodeTickVitals, encodeTickVitals } from "./vitals";

describe("tick vitals", () => {
  it("round-trips hp, mp and sp with their maximums as whole numbers", () => {
    const stats = { hp: 9.6, maxHp: 30, mp: 4, maxMp: 10, sp: 2.2, maxSp: 20, strength: 7 };
    expect(decodeTickVitals(encodeTickVitals(stats))).toEqual({
      hp: 10,
      maxHp: 30,
      mp: 4,
      maxMp: 10,
      sp: 2,
      maxSp: 20,
    });
  });
  it("sends 0 for missing stats and ignores a malformed payload", () => {
    expect(encodeTickVitals(undefined)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(decodeTickVitals(undefined)).toBeNull();
    expect(decodeTickVitals([1, 2])).toBeNull();
  });
});
