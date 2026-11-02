import { describe, expect, it } from "vitest";
import { MAX_REWIND_MS, clampRewind } from "../movement";
import { findSpellHits, toSpellVictims } from "../spells";
import { TICK_MS, createArena, createArenaCharacter } from "./scenario-arena";

/** A target runs right at 200 px/s past a swing that lands where it stood a moment ago. */
function setup() {
  const arena = createArena();
  const caster = arena.addPlayer(createArenaCharacter("attacker", 100, 100));
  const target = arena.addNpc(createArenaCharacter("target", 150, 100));
  const run = () => {
    target.vx = 200;
    target.x += target.vx * (TICK_MS / 1000);
  };
  const now = arena.run(10, run);
  const hit = (viewLagMs: number) => {
    const seenAt = now - clampRewind(viewLagMs);
    const victims = toSpellVictims(
      [target, caster],
      viewLagMs
        ? (id) => (id === caster.id ? undefined : arena.room.poseHistory.positionAt(id, seenAt))
        : undefined,
    );
    /* The swing covers where the target stood 200ms ago */
    return findSpellHits({
      shape: { kind: "circle", x: 190, y: 100, radius: 12 },
      victims,
      hitIds: [],
      allowedTargets: ["enemy"],
      caster: { id: caster.id, x: caster.x, y: caster.y, isPlayer: true },
      isMeleeAttack: false,
    });
  };
  return { target, hit };
}

describe("lag-compensated hits", () => {
  it("misses a runner by where it is now", () => {
    const { target, hit } = setup();
    expect(target.x).toBeCloseTo(250);
    expect(hit(0)).toEqual([]);
  });

  it("hits it where the attacker saw it, within the rewind cap", () => {
    const { hit } = setup();
    expect(hit(MAX_REWIND_MS)).toEqual(["target"]);
  });

  it("does not credit a lag claim beyond the cap", () => {
    const { hit } = setup();
    /* Claiming 10s of lag is clamped to 200ms, so a swing at an older spot still misses */
    expect(hit(10_000)).toEqual(hit(MAX_REWIND_MS));
  });

  it("after a teleport, rewinds land on the new spot, never the old one", () => {
    const arena = createArena();
    const target = arena.addNpc(createArenaCharacter("t", 50, 50));
    arena.run(5);
    target.x = 500;
    arena.room.poseHistory.forget("t");
    const now = arena.run(1);
    expect(arena.room.poseHistory.positionAt("t", now - 100)).toEqual({ x: 500, y: 50 });
  });
});
