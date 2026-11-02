import { describe, expect, it } from "vitest";
import {
  KNOCKBACK_DISTANCE,
  KNOCKBACK_DURATION,
  approachVelocity,
  getWalkVelocity,
  moveBodyThroughMap,
} from "../movement";
import { TICK_MS, createArena, createArenaCharacter } from "./scenario-arena";
import { createBrainMob, mobBrain } from "./scenario-npc-brain";

describe("player walking", () => {
  it("eases up to speed, covers ground and is stopped by a wall", () => {
    const arena = createArena({
      walls: [
        [8, 2],
        [8, 3],
        [8, 4],
      ],
    });
    const player = arena.addPlayer(createArenaCharacter("p1", 100, 112));
    const walk = (arena.world.players.p1 &&
      ((): void => {
        const wanted = getWalkVelocity({ x: 1, y: 0 }, 100);
        const v = approachVelocity({ x: player.vx, y: player.vy }, wanted, 100, TICK_MS / 1000);
        player.vx = v.x;
        player.vy = v.y;
        moveBodyThroughMap(arena.room.map, player, TICK_MS / 1000, 8);
      })) as () => void;

    arena.run(1, walk);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.vx).toBeLessThanOrEqual(100);
    const afterOne = player.x;
    arena.run(5, walk);
    expect(player.x).toBeGreaterThan(afterOne + 20);

    arena.run(40, walk);
    /* Wall tile 8 starts at x = 256; the 8px half width stops the walker flush against it */
    expect(player.x).toBeCloseTo(256 - 8, 0);
  });
});

describe("a shoved mob", () => {
  const shove = (angle: number, walls: Array<[number, number]> = []) => {
    const arena = createArena({ walls });
    arena.addPlayer(createArenaCharacter("p1", 300, 112));
    const mob = arena.addNpc(createBrainMob("m1", 240, 112));
    const startAt = arena.run(0);
    mob.state.knockbackAt = startAt + 1;
    mob.state.knockbackAngle = angle;
    return { arena, mob, brain: mobBrain(arena, mob) };
  };

  it("flies back its distance over the shove, then stops", () => {
    const { arena, mob, brain } = shove(Math.PI);
    const startX = mob.x;
    arena.run(KNOCKBACK_DURATION / TICK_MS, brain);
    expect(startX - mob.x).toBeCloseTo(KNOCKBACK_DISTANCE, 0);
    expect(mob.y).toBeCloseTo(112);
  });

  it("cannot act or walk toward its target while shoved, then resumes the chase", () => {
    const { arena, mob, brain } = shove(Math.PI);
    arena.run(1, brain);
    expect(mob.vx).toBeLessThan(0);
    arena.run(10, brain);
    expect(mob.vx).toBeGreaterThan(0);
  });

  it("is stopped by a wall behind it", () => {
    const { arena, mob, brain } = shove(Math.PI, [[6, 3]]);
    arena.run(KNOCKBACK_DURATION / TICK_MS, brain);
    /* Wall tile 6 ends at x = 224; the 8px half width stops the mob flush at 232 */
    expect(mob.x).toBeCloseTo(232, 0);
  });
});
