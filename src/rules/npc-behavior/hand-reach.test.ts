import { describe, expect, it } from "vitest";
import { shapesOverlap } from "@/rules/movement";
import { getMeleeSwing, getSwingShape, planSwing } from "@/rules/spells";
import { getSwingAim, getSwingFacing, isInMeleeReach, type NpcNextSwing } from "./hand-reach";

/** A human with a dagger-length blade: about the shortest melee reach there is. */
const swingWith = (action: NpcNextSwing["action"]): NpcNextSwing => ({
  race: "human",
  action,
  reach: 30,
  hasWeaponRange: true,
  isUppercut: false,
  bodyCenterY: -10,
});
const at = (x: number, y: number, swing?: NpcNextSwing) => ({
  x,
  y,
  bodySize: 8,
  weapons: swing ? { swing } : undefined,
});

/** The target's spot, one per side of the NPC it could be on. */
const SIDES = [
  { name: "right", x: 60, y: 0 },
  { name: "left", x: -60, y: 0 },
  { name: "below", x: 0, y: 60 },
  { name: "above", x: 0, y: -60 },
];

describe("hand reach", () => {
  for (const action of ["attack_right", "attack_left"] as const) {
    for (const side of SIDES) {
      it(`walking to its aim lands the ${action} swing on a target ${side.name}`, () => {
        const target = at(side.x, side.y);
        const aim = getSwingAim(at(0, 0, swingWith(action)), target) as { x: number; y: number };
        /* Where it ends up: the target shifted by the aim, never inside the target's body */
        const npc = at(target.x + aim.x, target.y + aim.y, swingWith(action));
        expect(Math.hypot(aim.x, aim.y)).toBeGreaterThanOrEqual(20 - 1e-9);
        expect(isInMeleeReach(npc, target, 0)).toBe(true);
      });
    }
  }

  it("doesn't swing at a target its blade can't touch, even if the body range would", () => {
    const npc = at(0, 0, swingWith("attack_right"));
    expect(isInMeleeReach(npc, at(60, 0), 1000)).toBe(false);
  });

  it("falls back on the body's range without a hand to swing", () => {
    expect(isInMeleeReach(at(0, 0), at(30, 0), 14)).toBe(true);
    expect(isInMeleeReach(at(0, 0), at(31, 0), 14)).toBe(false);
    expect(getSwingAim(at(0, 0), at(50, 0))).toBeUndefined();
  });

  it("reaches from a bigger body's hand: its hand and weapon grow with its scale", () => {
    const big = { ...swingWith("attack_right"), scale: 2 };
    const target = at(80, 0);
    const aim = getSwingAim(at(0, 0, big), target) as { x: number; y: number };
    const small = getSwingAim(at(0, 0, swingWith("attack_right")), target) as { x: number };
    expect(Math.abs(aim.x)).toBeGreaterThan(Math.abs(small.x));
    expect(isInMeleeReach(at(target.x + aim.x, target.y + aim.y, big), target, 0)).toBe(true);
  });

  it("faces whichever way lands the swing once it's there, even if not straight at the target", () => {
    for (const side of SIDES) {
      const target = at(side.x, side.y);
      const aim = getSwingAim(at(0, 0, swingWith("attack_right")), target) as {
        x: number;
        y: number;
      };
      const npc = at(target.x + aim.x, target.y + aim.y, swingWith("attack_right"));
      const facing = getSwingFacing(npc, target);
      const turned = { ...npc, weapons: { swing: swingWith("attack_right") } };
      expect(["up", "right", "down", "left"]).toContain(facing);
      expect(isInMeleeReach(turned, target, 0)).toBe(true);
    }
  });

  it("agrees with the hit the server lands: below its target, swinging up", () => {
    /* The server's shape: the plan from `server/spell.ts`, the wedge round the caster itself */
    const serverHits = (npc: { x: number; y: number }, target: { x: number; y: number }) => {
      const swing = swingWith("attack_right");
      const { y } = getMeleeSwing(
        { y: npc.y, bodyCenterY: swing.bodyCenterY, direction: "up", race: swing.race },
        swing.action,
        () => swing.reach,
      );
      const plan = planSwing({
        ...swing,
        direction: "up",
        isPunching: false,
        bodyPivotY: y - npc.y,
        visibleMs: 0,
      });
      const wedge = getSwingShape(plan, npc, plan.sweepMs);
      return shapesOverlap(wedge, { kind: "circle", x: target.x, y: target.y, radius: 8 });
    };
    /* Data-independent: the human always has hand points (players hold weapons) */
    const zombie = swingWith("attack_right");
    for (const gap of [24, 30, 40, 60]) {
      const npc = at(0, gap, zombie);
      const target = at(0, 0);
      /* Never claims a hit the server wouldn't land */
      if (isInMeleeReach(npc, target, 0)) expect(serverHits(npc, target)).toBe(true);
    }
    /* And walking to its aim, it lands one */
    const target = at(0, 0);
    const aim = getSwingAim(at(0, 60, zombie), target) as { x: number; y: number };
    expect(isInMeleeReach(at(aim.x, aim.y, zombie), target, 0)).toBe(true);
  });
});
