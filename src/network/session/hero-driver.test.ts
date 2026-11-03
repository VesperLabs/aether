import { describe, expect, it } from "vitest";
import type { TileMap } from "@/rules/movement/tilemap";
import { createHeroDrive, driveHero, type HeroFrame } from "./hero-driver";

/* An open 10x10 room of 16px tiles. */
const map: TileMap = {
  grid: {
    width: 10,
    height: 10,
    tileWidth: 16,
    tileHeight: 16,
    solid: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => false)),
  },
  widthInPixels: 160,
  heightInPixels: 160,
  objects: {},
};

const hero = { id: "me", x: 40, y: 40, bodySize: 4, roomName: "town", walkSpeed: 100 };

function frame(overrides: Partial<HeroFrame> = {}): HeroFrame {
  return { hero, map, players: [], direction: "right", seconds: 0.1, now: 0, ...overrides };
}

describe("driveHero", () => {
  it("walks through the room and sends the move", () => {
    const drive = createHeroDrive();
    const result = driveHero(drive, frame({ keys: { x: 1, y: 0 } }));
    expect(result.x).toBeGreaterThan(hero.x);
    expect(result.input).toMatchObject({ x: Math.round(result.x), d: expect.any(Number) });
  });

  it("sends the frame it stops on, then nothing while it stands still", () => {
    const drive = createHeroDrive();
    driveHero(drive, frame({ keys: { x: 1, y: 0 }, now: 0 }));
    drive.velocity = { x: 0, y: 0 };
    const stop = driveHero(drive, frame({ now: 10 }));
    expect(stop.input).toMatchObject({ vx: 0, vy: 0 });
    expect(driveHero(drive, frame({ now: 100 })).input).toBeUndefined();
  });

  it("sends a shove at once, even straight after another send", () => {
    const drive = createHeroDrive();
    driveHero(drive, frame({ keys: { x: 1, y: 0 }, now: 0 }));
    const shoved = driveHero(drive, frame({ shove: { x: 0, y: 200 }, now: 1 }));
    expect(shoved.y).toBeGreaterThan(hero.y);
    expect(shoved.input).toBeDefined();
  });

  it("is drifted gently by another player it overlaps", () => {
    const players = [{ id: "friend", x: hero.x + 5, y: hero.y }];
    const result = driveHero(createHeroDrive(), frame({ players }));
    expect(result.x).toBeLessThan(hero.x);
  });

  it("stays put without a map", () => {
    const result = driveHero(createHeroDrive(), frame({ keys: { x: 1, y: 0 }, map: undefined }));
    expect([result.x, result.y]).toEqual([hero.x, hero.y]);
  });
});
