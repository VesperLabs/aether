import { describe, expect, it } from "vitest";
import {
  canCastSpell,
  canHitNpc,
  canHitPlayer,
  checkCastReady,
  getAbilityDetails,
  getCastReadiness,
  getSpellFlight,
  getSpellShape,
  getSpellVelocity,
  isBehindCaster,
  isSpellExpired,
  isSpellVictimCandidate,
  resolveSpellDetails,
  rollSpellCrit,
  rollSpellDamage,
  usesLeftHand,
  usesRightHand,
} from "./index";

describe("checkCastReady", () => {
  const lastCast = { global: 1000, fireball: 1000 };

  it("needs the global cast delay to have passed", () => {
    expect(checkCastReady({ lastCast, castDelay: 300, now: 1200 })).toBe(false);
    expect(checkCastReady({ lastCast, castDelay: 300, now: 1301 })).toBe(true);
  });
  it("adds the spell's own cooldown on top", () => {
    // flame-slash has a base cooldown of 1000
    const casts = { global: 0, "flame-slash": 1000 };
    expect(
      checkCastReady({ spellName: "flame-slash", lastCast: casts, castDelay: 100, now: 2000 }),
    ).toBe(false);
    expect(
      checkCastReady({ spellName: "flame-slash", lastCast: casts, castDelay: 100, now: 2101 }),
    ).toBe(true);
  });
  it("treats a spell never cast as ready", () => {
    expect(
      checkCastReady({ spellName: "fireball", lastCast: { global: 0 }, castDelay: 100, now: 500 }),
    ).toBe(true);
  });
});

describe("canCastSpell", () => {
  const base = {
    abilitySlot: 1,
    isStunned: false,
    isDead: false,
    kind: "player",
    activeItemSlots: ["1"],
    abilities: { 1: { base: "fireball", stats: { mpCost: 10 } } },
    stats: { mp: 10, hp: 5, sp: 0, castDelay: 100 },
    lastCast: { global: 0 },
    now: 1000,
    shouldUpdateState: true,
  };

  it("lets an affordable spell through and records the cast", () => {
    expect(canCastSpell(base)).toEqual({
      allowed: true,
      castTimes: { global: 1000, fireball: 1000 },
    });
  });
  it("doesn't start the cooldown for a cast it can't afford", () => {
    const result = canCastSpell({ ...base, stats: { ...base.stats, mp: 9 } });
    expect(result).toEqual({ allowed: false, castTimes: undefined });
  });
  it("doesn't record when only asking", () => {
    expect(canCastSpell({ ...base, shouldUpdateState: false }).castTimes).toBeUndefined();
  });
  it("refuses quietly while stunned, or for a slot that isn't unlocked", () => {
    expect(canCastSpell({ ...base, isStunned: true }).allowed).toBeUndefined();
    expect(canCastSpell({ ...base, activeItemSlots: [] }).allowed).toBeUndefined();
    expect(canCastSpell({ ...base, kind: "npc", activeItemSlots: [] }).allowed).toBe(true);
  });
  it("refuses the dead, and anything still on cooldown", () => {
    expect(canCastSpell({ ...base, isDead: true }).allowed).toBe(false);
    expect(canCastSpell({ ...base, lastCast: { global: 950 } })).toEqual({ allowed: false });
  });
  it("lets attacks (no slot) through", () => {
    expect(canCastSpell({ ...base, abilitySlot: undefined })).toEqual({ allowed: true });
  });
  it("needs hp to stay above the hp cost", () => {
    const abilities = { 1: { base: "fireball", stats: { hpCost: 5 } } };
    expect(canCastSpell({ ...base, abilities }).allowed).toBe(false);
    expect(canCastSpell({ ...base, abilities, stats: { ...base.stats, hp: 6 } }).allowed).toBe(
      true,
    );
  });
});

describe("getAbilityDetails", () => {
  it("is the attack for no slot, ranged if a ranged weapon is held", () => {
    expect(getAbilityDetails({ hasRangedWeapon: false }, undefined)).toMatchObject({
      spellName: "attack-melee",
      isMeleeAttack: true,
    });
    expect(getAbilityDetails({ hasRangedWeapon: true }, 0).spellName).toBe("attack-ranged");
  });
  it("merges the item with the spell definition", () => {
    const abilities = { 2: { base: "flame-slash", ilvl: 3, effects: { minFireDamage: 1 } } };
    expect(getAbilityDetails({ abilities, hasRangedWeapon: false }, 2)).toMatchObject({
      spellName: "flame-slash",
      ilvl: 3,
      effects: { minFireDamage: 1 },
      isMeleeAttack: true,
    });
  });
  it("gives just the name for an unknown ability", () => {
    expect(getAbilityDetails({ abilities: {}, hasRangedWeapon: false }, 5)).toEqual({
      spellName: undefined,
    });
  });
});

describe("spell shape", () => {
  it("falls back to the melee attack for unknown spells", () => {
    expect(resolveSpellDetails("nope")).toMatchObject({ found: false });
    expect(resolveSpellDetails("nope").details.isMeleeAttack).toBe(true);
    expect(resolveSpellDetails("fireball").found).toBe(true);
  });
  it("defaults the shape and scales by item level", () => {
    expect(getSpellShape({ scaleBase: 2, scaleMultiplier: 0.5 }, 4)).toMatchObject({
      scale: 4,
      maxDistance: -1,
      isMissile: false,
    });
    expect(getSpellShape(undefined, 3).scale).toBe(1);
  });
  it("expires travelling spells by distance and others by time", () => {
    const input = { distanceFromSpawn: 10, spawnTime: 0, lifetime: 100, now: 100 };
    expect(isSpellExpired({ ...input, maxDistance: 10 })).toBe(true);
    expect(isSpellExpired({ ...input, maxDistance: 11 })).toBe(false);
    expect(isSpellExpired({ ...input, maxDistance: -1 })).toBe(false);
    expect(isSpellExpired({ ...input, maxDistance: -1, now: 101 })).toBe(true);
  });
  it("computes velocity from the cast angle", () => {
    const v = getSpellVelocity(0, 350);
    expect(v.x).toBe(350);
    expect(v.y).toBe(0);
  });
  it("picks the hand from the action", () => {
    expect(usesLeftHand("attack_left")).toBe(true);
    expect(usesRightHand("stand")).toBe(true);
    expect(usesRightHand("attack_left")).toBe(false);
  });
});

describe("targeting", () => {
  it("players need enemy to hit mobs", () => {
    expect(canHitNpc(["enemy"])).toBe(true);
    expect(canHitNpc(["self"])).toBe(false);
    expect(canHitNpc(undefined)).toBe(false);
  });
  it("hits yourself only with self, outsiders with enemy, party members with ally", () => {
    const hit = (allowedTargets: string[], isSelf: boolean, isPartyMember: boolean) =>
      canHitPlayer({ allowedTargets, isSelf, isPartyMember });
    expect(hit(["enemy"], true, true)).toBe(false);
    expect(hit(["self"], true, true)).toBe(true);
    expect(hit(["enemy"], false, false)).toBe(true);
    expect(hit(["ally"], false, false)).toBe(false);
    expect(hit(["enemy"], false, true)).toBe(false);
    expect(hit(["ally"], false, true)).toBe(true);
  });
  it("skips victims already hit, dead, the caster, or not the target", () => {
    const base = {
      victimId: "v",
      victimIsDead: false,
      hitIds: [],
      allowedTargets: ["enemy"],
      casterId: "c",
    };
    expect(isSpellVictimCandidate(base)).toBe(true);
    expect(isSpellVictimCandidate({ ...base, hitIds: ["v"] })).toBe(false);
    expect(isSpellVictimCandidate({ ...base, victimIsDead: true })).toBe(false);
    expect(isSpellVictimCandidate({ ...base, victimId: "c" })).toBe(false);
    expect(isSpellVictimCandidate({ ...base, victimId: "c", allowedTargets: ["self"] })).toBe(true);
    expect(isSpellVictimCandidate({ ...base, targetId: "other" })).toBe(false);
  });
  it("can't melee what is behind the caster", () => {
    const caster = { x: 10, y: 10 };
    expect(isBehindCaster("up", { x: 10, y: 12 }, caster)).toBe(true);
    expect(isBehindCaster("up", { x: 10, y: 8 }, caster)).toBe(false);
    expect(isBehindCaster("right", { x: 8, y: 10 }, caster)).toBe(true);
    expect(isBehindCaster(undefined, { x: 0, y: 0 }, caster)).toBe(false);
  });
});

describe("spell damage", () => {
  it("adds half the spell power to each elemental range", () => {
    const result = rollSpellDamage(
      { minFireDamage: 4, maxFireDamage: 4 },
      { spellPower: 10, minFireDamage: 2 },
      {},
      () => 0,
    );
    // min is 4 + 2 (stat) + 5 (half the spell power), max is 4 + 5; an empty range gives the min
    expect(result.eleDamage).toBe(11);
    expect(result.elements).toEqual(["fire"]);
  });
  it("crits scale both damages by the multiplier", () => {
    expect(
      rollSpellCrit(
        { eleDamage: 10, holyDamage: 2 },
        { critChance: 100, critMultiplier: 1.5 },
        () => 0,
      ),
    ).toEqual({ isCritical: true, eleDamage: 15, holyDamage: 3 });
    expect(rollSpellCrit({ eleDamage: 10, holyDamage: 2 }, { critChance: 0 }, () => 0)).toEqual({
      isCritical: false,
      eleDamage: 10,
      holyDamage: 2,
    });
  });
});

describe("getCastReadiness", () => {
  it("climbs from 0 after a cast to 1 once the global delay and own cooldown pass", () => {
    const lastCast = { global: 1000, fireball: 1000 };
    expect(getCastReadiness({ lastCast, castDelay: 1000, now: 1500 })).toBe(0.5);
    expect(getCastReadiness({ lastCast, castDelay: 1000, now: 3000 })).toBe(1);
    expect(getCastReadiness({ spellName: "fireball", lastCast, castDelay: 1000, now: 1000 })).toBe(
      0,
    );
  });
});

describe("getSpellFlight", () => {
  const range = (hand: "handLeft" | "handRight") => (hand === "handLeft" ? 100 : 200);

  it("sends arrows as far as the shooting hand's weapon reaches", () => {
    const shape = { isRangedAttack: true, isMissile: false, spellSpeed: 350 };
    expect(getSpellFlight(shape, 0, "attack_left", range)).toEqual({
      velocity: { x: 350, y: 0 },
      maxDistance: 100,
    });
    expect(getSpellFlight(shape, 0, "attack_right", range)?.maxDistance).toBe(200);
  });
  it("leaves a missile's own distance alone", () => {
    const shape = { isRangedAttack: false, isMissile: true, spellSpeed: 100 };
    expect(getSpellFlight(shape, 0, "cast", range)).toEqual({ velocity: { x: 100, y: 0 } });
  });
  it("is null for spells that don't fly", () => {
    const shape = { isRangedAttack: false, isMissile: false, spellSpeed: 100 };
    expect(getSpellFlight(shape, 0, "cast", range)).toBeNull();
  });
});
