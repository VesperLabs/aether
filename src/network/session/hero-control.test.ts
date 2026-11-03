import { describe, expect, it } from "vitest";
import { getDodgeVelocity } from "@/rules/movement/dodge";
import { getLungeVelocity } from "@/rules/movement/lunge";
import { ATTACK_WALK_SPEED_SCALE } from "@/rules/movement/walking";
import {
  crowdAround,
  PLAYER_INPUT_THROTTLE_MS,
  createPlayerInputThrottle,
  getFrameSeconds,
  getHeroStep,
  getLatestHeldDirection,
  nextPlayerInput,
  type HeroStepInput,
} from "./hero-control";

const hero = { x: 10.4, y: 20.6, roomName: "town" };

function step(overrides: Partial<HeroStepInput>) {
  return getHeroStep({
    keys: { x: 0, y: 0 },
    walkSpeed: 100,
    isRooted: false,
    current: { x: 0, y: 0 },
    lastCrowdPush: { x: 0, y: 0 },
    seconds: 1,
    self: { id: "me", x: 0, y: 0 },
    neighbours: [],
    ...overrides,
  });
}

describe("nextPlayerInput", () => {
  it("sends the first input with the room, rounded", () => {
    const throttle = createPlayerInputThrottle();
    expect(nextPlayerInput(throttle, hero, 50.4, 0, "right", 1000)).toEqual({
      vx: 50,
      vy: 0,
      x: 10,
      y: 21,
      d: expect.any(Number),
      roomName: "town",
    });
  });

  it("throttles unchanged input and flushes after the window", () => {
    const throttle = createPlayerInputThrottle();
    nextPlayerInput(throttle, hero, 50, 0, "right", 1000);
    expect(nextPlayerInput(throttle, hero, 50, 0, "right", 1010)).toBeUndefined();
    const later = nextPlayerInput(throttle, hero, 50, 0, "right", 1000 + PLAYER_INPUT_THROTTLE_MS);
    expect(later).toBeDefined();
    expect(later?.roomName).toBeUndefined();
  });

  it("flushes a stop, a turn, a room change and unthrottled sends", () => {
    const throttle = createPlayerInputThrottle();
    nextPlayerInput(throttle, hero, 50, 0, "right", 1000);
    expect(nextPlayerInput(throttle, hero, 0, 0, "right", 1001)).toBeDefined();
    expect(nextPlayerInput(throttle, hero, 0, 0, "right", 1002)).toBeUndefined();
    expect(nextPlayerInput(throttle, hero, 0, 0, "left", 1003)).toBeDefined();
    const moved = nextPlayerInput(throttle, { ...hero, roomName: "cave" }, 0, 0, "left", 1004);
    expect(moved?.roomName).toBe("cave");
    expect(nextPlayerInput(throttle, hero, 0, 0, "left", 1005, true)).toBeDefined();
  });

  it("flushes the spot an idle hero drifted to, once", () => {
    const throttle = createPlayerInputThrottle();
    const walking = { x: 10, y: 10, roomName: "town", isIdle: false, isEnteringDoor: false };
    nextPlayerInput(throttle, walking, 0, 0, "down", 0);
    const drifted = { ...walking, x: 11, isIdle: true };
    expect(nextPlayerInput(throttle, drifted, 0, 0, "down", 10)?.x).toBe(11);
    expect(nextPlayerInput(throttle, drifted, 0, 0, "down", 20)).toBeUndefined();
  });

  it("sends nothing while idle or entering a door", () => {
    const throttle = createPlayerInputThrottle();
    expect(nextPlayerInput(throttle, { ...hero, isIdle: true }, 1, 0, "up", 0)).toBeUndefined();
    expect(
      nextPlayerInput(throttle, { ...hero, isEnteringDoor: true }, 1, 0, "up", 0),
    ).toBeUndefined();
    expect(throttle.lastEmitted).toBeNull();
  });
});

describe("getHeroStep", () => {
  it("eases toward walk speed and roots when attacking", () => {
    expect(step({ keys: { x: 1, y: 0 } }).vx).toBeCloseTo(100);
    expect(step({ keys: { x: 1, y: 0 }, isRooted: true }).vx).toBeCloseTo(
      100 * ATTACK_WALK_SPEED_SCALE,
    );
  });

  it("lets the stick replace the keys", () => {
    const { vx, vy } = step({ keys: { x: 1, y: 0 }, stick: { x: 0, y: -1 } });
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(-100);
  });

  it("stops at a mob's edge without being shoved back", () => {
    const mob = { id: "mob", x: 15, y: 0, isSolid: true };
    const walking = step({ keys: { x: 1, y: 0 }, neighbours: [mob] });
    expect(walking.vx).toBeCloseTo(0);
    const standing = step({ neighbours: [{ ...mob, x: 5 }] });
    expect([standing.vx, standing.vy]).toEqual([0, 0]);
  });

  it("reports the walk without crowd drift, so a nudge doesn't animate walking", () => {
    const nudged = step({ neighbours: [{ id: "friend", x: 5, y: 0 }] });
    expect(nudged.vx).not.toBe(0);
    expect(nudged.walk).toEqual({ x: 0, y: 0 });
  });

  it("uses roll and lunge velocity, lunge first, keeping the crowd push", () => {
    const push = { x: 3, y: 0 };
    const roll = step({ rollAngle: 0, lastCrowdPush: push });
    expect(roll.vx).toBeCloseTo(getDodgeVelocity(0).x);
    expect(roll.crowdPush).toBe(push);
    const lunge = step({ rollAngle: 0, lungeAngle: Math.PI / 2 });
    expect(lunge.vy).toBeCloseTo(getLungeVelocity(Math.PI / 2).y);
  });

  it("drifts out of a crowd", () => {
    const { crowdPush } = step({ neighbours: [{ id: "a", x: 4, y: 0 }] });
    expect(crowdPush.x).toBeLessThan(0);
  });
});

describe("helpers", () => {
  it("caps the frame and picks the latest held key", () => {
    expect(getFrameSeconds(500)).toBe(0.1);
    expect(
      getLatestHeldDirection([
        { direction: "up", isDown: true, timeDown: 5 },
        { direction: "left", isDown: true, timeDown: 9 },
        { direction: "down", isDown: false, timeDown: 20 },
      ]),
    ).toBe("left");
  });
});

describe("crowdAround", () => {
  it("marks nearby mobs solid and players soft, skipping self, the dead and the far", () => {
    const hero = { id: "me", x: 0, y: 0 };
    const crowd = crowdAround(hero, {
      npcs: [
        { id: "mob", x: 10, y: 0 },
        { id: "dead", x: 5, y: 0, state: { isDead: true } },
        { id: "far", x: 100, y: 0 },
      ],
      players: [hero, { id: "friend", x: 0, y: 10 }],
    });
    expect(crowd).toEqual([
      { id: "mob", x: 10, y: 0, isSolid: true },
      { id: "friend", x: 0, y: 10, isSolid: false },
    ]);
  });
});
