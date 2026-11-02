import { describe, expect, it } from "vitest";
import { distanceTo } from "../world";
import { createArena, createArenaCharacter } from "./scenario-arena";
import { createBrainMob, mobBrain } from "./scenario-npc-brain";

describe("a mob chases and attacks a player", () => {
  const setup = (playerX = 220) => {
    const arena = createArena();
    const player = arena.addPlayer(createArenaCharacter("p1", playerX, 100));
    const mob = arena.addNpc(createBrainMob("m1", 160, 100));
    const damage: number[] = [];
    arena.world.events.on("characterDamaged", (e) => damage.push(e.amount));
    return { arena, player, mob, brain: mobBrain(arena, mob), damage };
  };

  it("closes the gap and then swings", () => {
    const { arena, player, mob, brain, damage } = setup();
    const gap = distanceTo(mob, player);
    arena.run(1, brain);
    expect(mob.state.lockedPlayerId).toBe("p1");
    arena.run(4, brain);
    expect(distanceTo(mob, player)).toBeLessThan(gap);
    expect(damage).toEqual([]);

    arena.run(40, brain);
    /* Melee reach: touching, edge to edge */
    expect(distanceTo(mob, player)).toBeLessThanOrEqual(mob.bodySize + player.bodySize + 8);
    expect(damage.length).toBeGreaterThan(0);
    expect(player.hp).toBe(100 - damage.length * mob.attackDamage);
  });

  it("swings no faster than its attack delay allows", () => {
    const { arena, mob, brain, damage } = setup(180);
    const ticks = 100;
    const end = arena.run(ticks, brain);
    /* 300ms attack delay plus the fixed 400ms: one swing per 700ms at most */
    const seconds = (end - mob.state.lastAttack) / 1000;
    expect(damage.length).toBeGreaterThan(2);
    expect(damage.length).toBeLessThanOrEqual(Math.ceil((ticks * 0.05) / 0.7));
    expect(seconds).toBeLessThan(ticks * 0.05);
  });

  it("ignores a player far outside its sight and never moves", () => {
    const { arena, mob, brain, damage } = setup(560);
    arena.run(30, brain);
    expect(mob.state.lockedPlayerId).toBeFalsy();
    expect(damage).toEqual([]);
  });

  it("stops once the player is dead", () => {
    const { arena, player, mob, brain, damage } = setup(180);
    player.hp = mob.attackDamage;
    arena.run(60, brain);
    expect(player.isDead).toBe(true);
    expect(damage).toHaveLength(1);
    expect(mob.state.lockedPlayerId).toBeNull();
  });

  it("is walled off: the mob cannot chase through a wall", () => {
    const arena = createArena({
      walls: [
        [6, 2],
        [6, 3],
        [6, 4],
      ],
    });
    arena.addPlayer(createArenaCharacter("p1", 240, 112));
    const mob = arena.addNpc(createBrainMob("m1", 160, 112));
    arena.run(40, mobBrain(arena, mob));
    expect(mob.x).toBeLessThan(6 * 32);
  });
});
