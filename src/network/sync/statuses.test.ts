import { describe, expect, it } from "vitest";
import { takeChangedStatuses } from "./statuses";

const character = (id: string, room: string, hp = 10) => ({
  id,
  room: { name: room },
  state: { isAiming: false, hasBuffChanges: true },
  stats: { hp, maxHp: 10 },
});

describe("takeChangedStatuses", () => {
  it("sends each status once, then only when it changes", () => {
    const world = { players: { a: character("a", "r1") }, npcs: { n: character("n", "r1") } };
    const sent = new Map<string, string>();
    const first = takeChangedStatuses(world, "r1", sent);
    expect(first?.p?.map((s) => s.id)).toEqual(["a"]);
    expect(first?.n?.map((s) => s.id)).toEqual(["n"]);
    expect(first?.p?.[0].state).not.toHaveProperty("hasBuffChanges");
    expect(takeChangedStatuses(world, "r1", sent)).toBeNull();
    world.npcs.n = character("n", "r1", 4);
    expect(takeChangedStatuses(world, "r1", sent)).toEqual({
      n: [{ id: "n", state: expect.any(Object), v: [4, 10, 0, 0, 0, 0] }],
    });
  });

  it("forgets characters that left, so they are sent again when they come back", () => {
    const world = { players: { a: character("a", "r1") }, npcs: {} };
    const sent = new Map<string, string>();
    takeChangedStatuses(world, "r1", sent);
    world.players.a = character("a", "r2");
    takeChangedStatuses(world, "r1", sent);
    expect(sent.size).toBe(0);
  });
});
