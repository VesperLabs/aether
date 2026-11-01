import { describe, expect, it } from "vitest";
import {
  canAffordCosts,
  checkAttackReady,
  expAfterDeath,
  getAbilityCosts,
  getAttackActionName,
  getAttackSpCost,
  getNextAttackCount,
  getCooldown,
  getSwingDelay,
  isOutOfCombat,
  isRespawnDue,
  modifyStat,
  type WeaponHolder,
} from "./index";

describe("attack timing", () => {
  it("waits on the weapon that swung", () => {
    expect(getSwingDelay({ attackDelay: 500 }, 1)).toBe(500);
    expect(getSwingDelay({ attackDelay: 500 }, 2)).toBe(500);
    expect(getSwingDelay({ attackDelay: 500, offHandAttackDelay: 300 }, 1)).toBe(500);
    expect(getSwingDelay({ attackDelay: 500, offHandAttackDelay: 300 }, 2)).toBe(300);
  });

  it("is ready once the attack delay has passed", () => {
    const base = { attackDelay: 500, lastAttack: 1000 };
    expect(checkAttackReady({ ...base, now: 1200 })).toEqual({
      cooldown: 500,
      timeRemaining: 300,
      timeElapsed: 200,
      percentageRemaining: 60,
      isReady: false,
    });
    expect(checkAttackReady({ ...base, now: 1500 }).isReady).toBe(true);
    expect(checkAttackReady({ ...base, now: 9000 }).timeRemaining).toBe(0);
  });

  it("getCooldown works for any cooldown", () => {
    expect(getCooldown(10000, 0, 2500).percentageRemaining).toBe(75);
  });

  it("is out of combat strictly after 5 seconds", () => {
    expect(isOutOfCombat(0, 5000)).toBe(false);
    expect(isOutOfCombat(0, 5001)).toBe(true);
  });
});

describe("getAttackSpCost", () => {
  const equipment = { handRight: { stats: { spCost: 3 } }, handLeft: { stats: { spCost: 2 } } };

  it("is the right hand's cost, else the left's, for attack 1", () => {
    expect(getAttackSpCost(equipment, 1)).toBe(3);
    expect(getAttackSpCost({ handLeft: { stats: { spCost: 2 } } }, 1)).toBe(2);
  });
  it("is the left hand's cost for attack 2", () => {
    expect(getAttackSpCost(equipment, 2)).toBe(2);
  });
  it("is 1 for anything else", () => {
    expect(getAttackSpCost(equipment, 0)).toBe(1);
    expect(getAttackSpCost(undefined, 1)).toBe(0);
  });
});

describe("getAttackActionName", () => {
  const human = (left?: string, right?: string): WeaponHolder => ({
    visibleEquipment: {
      handLeft: left ? { type: left } : null,
      handRight: right ? { type: right } : null,
    },
    profile: { race: "human" },
  });

  it("keeps the action for races without attack animations", () => {
    const ghost = { ...human("weapon"), profile: { race: "ghost" } };
    expect(getAttackActionName(ghost, { action: "stand", count: 1 })).toEqual({
      action: "stand",
      spellName: "attack-melee",
    });
  });

  it("swings the right hand first, then the left", () => {
    const dual = human("weapon", "ranged");
    expect(getAttackActionName(dual, { action: "stand", count: 1 })).toEqual({
      action: "attack_right",
      spellName: "attack-ranged",
    });
    expect(getAttackActionName(dual, { action: "stand", count: 2 })).toEqual({
      action: "attack_left",
      spellName: "attack-ranged",
    });
  });

  it("uses the left hand when the right is empty", () => {
    expect(getAttackActionName(human("weapon"), { action: "stand", count: 1 })).toEqual({
      action: "attack_left",
      spellName: "attack-melee",
    });
  });

  it("lets an attack-spell's base replace the spell and keeps its details", () => {
    const result = getAttackActionName(human(undefined, "weapon"), {
      action: "stand",
      count: 1,
      ability: { base: "flame-slash", allowedTargets: ["enemy"] },
    });
    expect(result).toMatchObject({
      action: "attack_right",
      spellName: "flame-slash",
      allowedTargets: ["enemy"],
    });
  });
});

describe("modifyStat", () => {
  const stats = { hp: 5, maxHp: 10, mp: 0, maxMp: 3, exp: 4 };

  it("adds and subtracts", () => {
    expect(modifyStat(stats, "hp", 3)).toBe(8);
    expect(modifyStat(stats, "hp", -2)).toBe(3);
  });
  it("clamps to 0 and the max", () => {
    expect(modifyStat(stats, "hp", 100)).toBe(10);
    expect(modifyStat(stats, "hp", -100)).toBe(0);
  });
  it("leaves stats without a max alone", () => {
    expect(modifyStat(stats, "exp", 5)).toBeUndefined();
    expect(modifyStat(undefined, "hp", 1)).toBeUndefined();
  });
});

describe("death", () => {
  it("loses 10% of experience", () => {
    expect(expAfterDeath(100)).toBe(90);
    expect(expAfterDeath(7)).toBe(6);
    expect(expAfterDeath(0)).toBe(0);
  });
  it("respawns once the respawn time has passed", () => {
    expect(isRespawnDue({ deadTime: 0, respawnTime: 10000, now: 9999 })).toBe(false);
    expect(isRespawnDue({ deadTime: 0, respawnTime: 10000, now: 10000 })).toBe(true);
  });
});

describe("getAbilityCosts", () => {
  it("treats missing costs as 0 instead of NaN", () => {
    expect(getAbilityCosts(undefined)).toEqual({ mp: 0, hp: 0, sp: 0 });
    expect(getAbilityCosts({ mpCost: 3 })).toEqual({ mp: 3, hp: 0, sp: 0 });
    expect(getAbilityCosts({ spCost: 2 }).sp).toBe(2);
  });
});

describe("getNextAttackCount", () => {
  const sword = { type: "weapon" };
  const bow = { type: "ranged" };

  it("alternates hands when dual wielding", () => {
    const human = { race: "human" };
    const dual = { profile: human, visibleEquipment: { handRight: sword, handLeft: sword } };
    expect(getNextAttackCount(undefined, dual)).toBe(1);
    expect(getNextAttackCount(1, dual)).toBe(2);
    expect(getNextAttackCount(2, dual)).toBe(1);
  });

  it("always swings 1 with one weapon or a bow", () => {
    const profile = { race: "human" };
    expect(getNextAttackCount(1, { profile, visibleEquipment: { handLeft: sword } })).toBe(1);
    const bowAndSword = { handRight: bow, handLeft: sword };
    expect(getNextAttackCount(1, { profile, visibleEquipment: bowAndSword })).toBe(1);
  });
});

describe("canAffordCosts", () => {
  const stats = { hp: 10, mp: 5, sp: 3 };

  it("needs enough of every resource", () => {
    expect(canAffordCosts(stats, { sp: 3, mp: 5 })).toBe(true);
    expect(canAffordCosts(stats, { sp: 4 })).toBe(false);
    expect(canAffordCosts(stats, { mp: 6 })).toBe(false);
  });

  it("won't spend the last of your HP", () => {
    expect(canAffordCosts(stats, { hp: 10 })).toBe(false);
  });
});
