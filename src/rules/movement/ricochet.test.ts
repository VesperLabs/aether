import { describe, expect, it } from "vitest";
import { moveRicocheting, readTileMap, type TiledMapJson } from ".";

/** 4x4 map of 32px tiles with one wall at tile (2, 1): x 64-96, y 32-64. */
const walls = readTileMap({
  width: 4,
  height: 4,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [{ firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] }],
  layers: [
    { name: "Collide", type: "tilelayer", data: [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
} as TiledMapJson);
const options = { depth: 0, groundOffset: 0 };

describe("moveRicocheting", () => {
  it("flies on unchanged where there is no wall", () => {
    const body = { x: 10, y: 100 };
    const { velocity, distance } = moveRicocheting(walls, body, { x: 60, y: 0 }, 0.5, options);
    expect(body.x).toBeCloseTo(40);
    expect(body.y).toBe(100);
    expect(velocity).toEqual({ x: 60, y: 0 });
    expect(distance).toBeCloseTo(30);
  });

  it("banks off a wall it flies into, keeping the part along the wall", () => {
    const body = { x: 40, y: 40 };
    const { velocity } = moveRicocheting(walls, body, { x: 120, y: 30 }, 0.5, options);
    expect(velocity).toEqual({ x: -120, y: 30 });
    /* Mirrored off the face: back out, never through it */
    expect(body.x).toBeLessThan(64);
  });

  it("goes `depth` into the wall before it turns back", () => {
    /* Its middle reaches 3px past the face (x 64) and no further */
    let deepest = 0;
    const body = { x: 50, y: 40 };
    let velocity = { x: 60, y: 0 };
    for (let i = 0; i < 40; i++) {
      ({ velocity } = moveRicocheting(walls, body, velocity, 1 / 60, { ...options, depth: 3 }));
      deepest = Math.max(deepest, body.x);
    }
    expect(deepest).toBeGreaterThan(64 + 2);
    expect(deepest).toBeLessThanOrEqual(64 + 3);
    expect(velocity.x).toBe(-60);
  });

  it("turns back short of the wall with a depth below 0", () => {
    const body = { x: 50, y: 40 };
    let velocity = { x: 60, y: 0 };
    let deepest = 0;
    for (let i = 0; i < 40; i++) {
      ({ velocity } = moveRicocheting(walls, body, velocity, 1 / 60, { ...options, depth: -4 }));
      deepest = Math.max(deepest, body.x);
    }
    expect(deepest).toBeLessThanOrEqual(60);
  });

  it("goes back out of a wall it is already in, without bouncing", () => {
    const body = { x: 66, y: 40 };
    const { velocity } = moveRicocheting(walls, body, { x: -60, y: 0 }, 0.2, options);
    expect(velocity.x).toBe(-60);
    expect(body.x).toBeLessThan(64);
  });

  it("loses the share of its speed into the wall it isn't bouncy enough to keep", () => {
    const body = { x: 40, y: 40 };
    const { velocity } = moveRicocheting(walls, body, { x: 120, y: 30 }, 0.5, {
      ...options,
      bounciness: 0.5,
    });
    expect(velocity).toEqual({ x: -60, y: 30 });
  });

  it("bounces off the map edge too", () => {
    const body = { x: 10, y: 120 };
    const { velocity } = moveRicocheting(walls, body, { x: -60, y: 0 }, 0.5, options);
    expect(velocity.x).toBe(60);
  });

  it("meets walls at its ground point, below where it flies", () => {
    /* Flying 20px above a row that is clear, its ground point runs into the wall */
    const body = { x: 40, y: 22 };
    const { velocity } = moveRicocheting(walls, body, { x: 120, y: 0 }, 0.5, {
      ...options,
      groundOffset: 20,
    });
    expect(velocity.x).toBe(-120);
  });
});
