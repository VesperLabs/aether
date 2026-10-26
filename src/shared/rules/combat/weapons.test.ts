import { describe, expect, it } from "vitest";
import {
  getWeaponRange,
  hasAttackableWeapons,
  hasMeleeWeapon,
  hasRangedWeapon,
  hasShield,
  hasVisibleWeaponType,
  hasWeapon,
  hasWeaponLeft,
  hasWeaponRight,
  isDualWielding,
  RANGE_MULTIPLIER,
  type WeaponHolder,
} from "./index";

const holding = (
  left: string | undefined,
  right: string | undefined,
  race = "human",
): WeaponHolder => ({
  visibleEquipment: {
    handLeft: left ? { type: left } : null,
    handRight: right ? { type: right } : null,
  },
  equipment: { handLeft: { type: "shield" }, handRight: { type: "shield" } },
  profile: { race },
});

describe("weapon queries", () => {
  it("sees weapons and ranged weapons as weapons, shields as not", () => {
    expect(hasWeaponLeft(holding("weapon", undefined))).toBe(true);
    expect(hasWeaponLeft(holding("ranged", undefined))).toBe(true);
    expect(hasWeaponLeft(holding("shield", undefined))).toBe(false);
    expect(hasWeapon(holding(undefined, undefined))).toBe(false);
  });

  it("counts non-humans as armed in the right hand", () => {
    expect(hasWeaponRight(holding(undefined, undefined, "crab"))).toBe(true);
    expect(hasWeaponRight(holding(undefined, undefined, "human"))).toBe(false);
    expect(isDualWielding(holding("weapon", undefined, "bear"))).toBe(true);
  });

  it("reads the equipment set named by the key", () => {
    const character = holding("weapon", "weapon");
    expect(hasShield(character)).toBe(false);
    expect(hasShield(character, "equipment")).toBe(true);
  });

  it("tells melee from ranged", () => {
    expect(hasMeleeWeapon(holding("weapon", undefined))).toBe(true);
    expect(hasRangedWeapon(holding("weapon", undefined))).toBe(false);
    expect(hasRangedWeapon(holding(undefined, "ranged"))).toBe(true);
  });

  it("refuses double shields and a bow with anything else", () => {
    expect(hasAttackableWeapons(holding("shield", "shield"))).toBe(false);
    expect(hasAttackableWeapons(holding("ranged", "shield"))).toBe(false);
    expect(hasAttackableWeapons(holding("ranged", "weapon"))).toBe(false);
    expect(hasAttackableWeapons(holding("ranged", undefined))).toBe(true);
    expect(hasAttackableWeapons(holding("weapon", "shield"))).toBe(true);
  });

  it("only checks the melee weapon type", () => {
    expect(hasVisibleWeaponType(holding("weapon", undefined), "melee")).toBe(true);
    expect(hasVisibleWeaponType(holding("weapon", "shield"), "melee")).toBe(true);
    expect(hasVisibleWeaponType(holding("ranged", undefined), "melee")).toBe(false);
    expect(hasVisibleWeaponType(holding("ranged", undefined), "ranged")).toBe(false);
  });

  it("throws for the right hand of a character with no profile, as before", () => {
    expect(() => hasWeaponRight({})).toThrow();
  });
});

describe("getWeaponRange", () => {
  it("scales the weapon's range", () => {
    const character = {
      visibleEquipment: { handLeft: { type: "weapon", stats: { range: 2 } } },
      bodySize: 8,
    };
    expect(getWeaponRange(character, "handLeft")).toBe(2 * RANGE_MULTIPLIER);
  });

  it("falls back to the body size plus 8", () => {
    const character = { visibleEquipment: { handLeft: { type: "weapon" } }, bodySize: 8 };
    expect(getWeaponRange(character, "handLeft")).toBe(16);
    expect(getWeaponRange({ bodySize: 10 })).toBe(18);
  });
});
