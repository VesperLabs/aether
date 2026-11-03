import { describe, expect, it } from "vitest";
import { BODY_RADIUS, blockBySolid, getSeparationPush, getSeparationVelocity } from "./separation";

describe("getSeparationPush", () => {
  it("leaves bodies that do not overlap alone", () => {
    const push = getSeparationPush({ id: "a", x: 0, y: 0 }, [
      { id: "b", x: BODY_RADIUS * 2, y: 0 },
    ]);
    expect(push).toEqual({ x: 0, y: 0 });
  });

  it("pushes two movable bodies apart, each taking part of the overlap", () => {
    const a = getSeparationPush({ id: "a", x: 0, y: 0 }, [{ id: "b", x: 10, y: 0 }]);
    const b = getSeparationPush({ id: "b", x: 10, y: 0 }, [{ id: "a", x: 0, y: 0 }]);
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeCloseTo(-a.x);
    expect(a.y).toBe(0);
  });

  it("takes the whole overlap against a fixed body", () => {
    const movable = getSeparationPush({ id: "a", x: 0, y: 0 }, [{ id: "b", x: 0, y: 15 }]);
    const fixed = getSeparationPush({ id: "a", x: 0, y: 0 }, [
      { id: "b", x: 0, y: 15, isFixed: true },
    ]);
    expect(fixed.y).toBeCloseTo(movable.y * 2);
  });

  it("splits bodies on the same spot in opposite directions", () => {
    const a = getSeparationPush({ id: "a", x: 5, y: 5 }, [{ id: "b", x: 5, y: 5 }]);
    const b = getSeparationPush({ id: "b", x: 5, y: 5 }, [{ id: "a", x: 5, y: 5 }]);
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(0);
  });

  it("ignores itself and caps the push in a dense pile", () => {
    const pile = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, x: 1, y: 0 }));
    const push = getSeparationPush({ id: "me", x: 0, y: 0 }, [{ id: "me", x: 0, y: 0 }, ...pile]);
    expect(Math.hypot(push.x, push.y)).toBeLessThanOrEqual(4 + 1e-9);
  });

  it("settles a crowd apart over a few ticks", () => {
    const bodies = [
      { id: "a", x: 50, y: 50 },
      { id: "b", x: 52, y: 50 },
      { id: "c", x: 51, y: 52 },
    ];
    for (let tick = 0; tick < 60; tick++) {
      const pushes = bodies.map((body) => getSeparationPush(body, bodies));
      bodies.forEach((body, i) => {
        body.x += pushes[i].x;
        body.y += pushes[i].y;
      });
    }
    for (const a of bodies) {
      for (const b of bodies) {
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(BODY_RADIUS * 2 - 0.5);
      }
    }
  });
});

describe("getSeparationVelocity", () => {
  it("drifts a player out of a crowd slower than they walk", () => {
    const pile = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, x: 3, y: 0 }));
    const velocity = getSeparationVelocity({ id: "me", x: 0, y: 0 }, pile, 100);
    expect(velocity.x).toBeLessThan(0);
    expect(Math.hypot(velocity.x, velocity.y)).toBeLessThanOrEqual(18 + 1e-9);
  });

  it("never slows a player walking into a crowd, only slides them aside", () => {
    const velocity = getSeparationVelocity(
      { id: "me", x: 0, y: 0 },
      [{ id: "n", x: 5, y: 3 }],
      100,
      {
        x: 100,
        y: 0,
      },
    );
    expect(velocity.x).toBeCloseTo(0);
    expect(velocity.y).toBeLessThan(0);
  });
});

describe("getSeparationPush cap", () => {
  it("never pushes further than the cap it is given", () => {
    const push = getSeparationPush(
      { id: "a", x: 0, y: 0 },
      [{ id: "p", x: 1, y: 0, isFixed: true }],
      undefined,
      1.5,
    );
    expect(Math.hypot(push.x, push.y)).toBeCloseTo(1.5);
  });
});

describe("blockBySolid", () => {
  const mob = { id: "mob", x: 15, y: 0, isSolid: true };

  it("stops walking into a solid neighbour and keeps the sideways part", () => {
    expect(blockBySolid({ id: "me", x: 0, y: 0 }, [mob], { x: 100, y: 50 })).toEqual({
      x: 0,
      y: 50,
    });
  });

  it("lets the player walk away from it", () => {
    expect(blockBySolid({ id: "me", x: 0, y: 0 }, [mob], { x: -100, y: 0 })).toEqual({
      x: -100,
      y: 0,
    });
  });

  it("ignores soft and out-of-reach neighbours", () => {
    const body = { id: "me", x: 0, y: 0 };
    const walk = { x: 100, y: 0 };
    expect(blockBySolid(body, [{ ...mob, isSolid: false }], walk)).toEqual(walk);
    expect(blockBySolid(body, [{ ...mob, x: BODY_RADIUS * 2 + 1 }], walk)).toEqual(walk);
  });
});

describe("getSeparationVelocity with solid neighbours", () => {
  it("never pushes a player off a solid neighbour", () => {
    const push = getSeparationVelocity(
      { id: "me", x: 0, y: 0 },
      [{ id: "mob", x: 5, y: 0, isSolid: true }],
      100,
    );
    expect(push).toEqual({ x: 0, y: 0 });
  });
});
