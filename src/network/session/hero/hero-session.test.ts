import { describe, expect, it } from "vitest";
import { getSelf } from "@/network/session/client-state";
import type { FullCharacterWire } from "@/network/sync/character-state";
import { KNOCKBACK_DURATION } from "@/rules/movement/knockback";
import type { TileMap } from "@/rules/movement/tilemap";
import { createHeroSession, type HeroSession } from "./hero-session";
import { SNAP_DISTANCE } from "./position-correction";

/* An open 20x20 room of 16px tiles. */
const map: TileMap = {
  grid: {
    width: 20,
    height: 20,
    tileWidth: 16,
    tileHeight: 16,
    solid: Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => false)),
  },
  widthInPixels: 320,
  heightInPixels: 320,
  objects: {},
};

const sword = { type: "weapon", stats: { range: 20, spCost: 1 } };
const bow = { type: "ranged", stats: { range: 200, spCost: 1 } };

function heroRecord(extra: Partial<FullCharacterWire> = {}) {
  return {
    id: "me",
    socketId: "me",
    nid: 0,
    roomName: "town",
    x: 160,
    y: 160,
    vx: 0,
    vy: 0,
    direction: "down",
    state: {},
    stats: { hp: 10, mp: 10, sp: 50, walkSpeed: 100, attackDelay: 500, offHandAttackDelay: 300 },
    profile: { race: "human" },
    equipment: { handRight: sword },
    activeItemSlots: ["handRight", "handLeft"],
    abilities: {},
    buffs: [],
    kind: "player",
    bodySize: 8,
    ...extra,
  } as unknown as FullCharacterWire;
}

function setup(extra: Partial<FullCharacterWire> = {}) {
  let time = 1000;
  const sent: [string, ...unknown[]][] = [];
  const session = createHeroSession({
    send: ((name: string, ...args: unknown[]) => {
      sent.push([name, ...args]);
    }) as never,
    now: () => time,
  });
  session.receive("heroInit", { socketId: "me", players: [heroRecord(extra)] });
  const advance = (ms: number) => (time += ms);
  const names = () => sent.map(([name]) => name);
  return { session, sent, names, advance };
}

const ctx = { seconds: 0.016, map };
const walkRight = { keys: { x: 1, y: 0 }, direction: "right" };

function frames(session: HeroSession, advance: (ms: number) => void, n: number, intent = {}) {
  let view;
  for (let i = 0; i < n; i++) {
    advance(16);
    view = session.frame(intent, ctx);
  }
  return view!;
}

describe("hero session", () => {
  it("walks the hero and sends playerInput", () => {
    const { session, names, advance } = setup();
    const view = frames(session, advance, 10, walkRight);
    expect(view.x).toBeGreaterThan(160);
    expect(names()).toContain("playerInput");
  });

  it("plays a knockback shove and sends it without waiting for a correction", () => {
    const { session, names, advance } = setup();
    session.receive("knockedBack", { angle: 0 });
    const view = frames(session, advance, 5, { keys: { x: -1, y: 0 } });
    /* Pushed right despite walking left */
    expect(view.x).toBeGreaterThan(160);
    expect(names().filter((n) => n === "playerInput").length).toBeGreaterThanOrEqual(5);
    expect(session.corrections).toBe(0);
  });

  it("ignores a knockback while dead", () => {
    const { session, advance } = setup({ state: { isDead: true } });
    session.receive("knockedBack", { angle: 0 });
    expect(frames(session, advance, 5).x).toBe(160);
  });

  it("stops a stunned hero after its shove ends", () => {
    const { session, names, advance } = setup({ buffs: [{ name: "stun" }] });
    const view = frames(session, advance, 10, walkRight);
    expect(view.x).toBe(160);
    expect(names()).not.toContain("playerInput");
    session.receive("knockedBack", { angle: 0 });
    expect(frames(session, advance, 3, walkRight).x).toBeGreaterThan(160);
    advance(KNOCKBACK_DURATION);
    const x = frames(session, advance, 1, walkRight).x;
    expect(frames(session, advance, 5, walkRight).x).toBe(x);
  });

  it("does not move while typing", () => {
    const { session, advance } = setup();
    expect(frames(session, advance, 10, { ...walkRight, isBlocked: true }).x).toBe(160);
  });

  it("holding a melee attack swings on repeat once each swing is ready, and roots", () => {
    const { session, sent, advance } = setup();
    const free = frames(session, advance, 10, walkRight).x - 160;
    const { session: holder, sent: held, advance: tick } = setup();
    const rooted = frames(holder, tick, 10, { ...walkRight, isHoldingAttack: true }).x - 160;
    expect(rooted).toBeLessThan(free);
    expect(sent.filter(([n]) => n === "attack")).toHaveLength(0);
    const swings = () => held.filter(([n]) => n === "attack");
    expect(swings()).toHaveLength(1);
    frames(holder, tick, 20, { isHoldingAttack: true }); /* 480ms in: not ready again */
    expect(swings()).toHaveLength(1);
    frames(holder, tick, 10, { isHoldingAttack: true });
    expect(swings()).toHaveLength(2);
  });

  it("dual wielders alternate hands, each waiting on its own weapon", () => {
    const { session, sent, advance } = setup({ equipment: { handRight: sword, handLeft: sword } });
    frames(session, advance, 100, { isHoldingAttack: true, angle: 1 });
    const counts = sent.filter(([n]) => n === "attack").map(([, a]) => (a as any).count);
    expect(counts.slice(0, 4)).toEqual([1, 2, 1, 2]);
    expect((sent.find(([n]) => n === "attack")![1] as any).castAngle).toBe(1);
  });

  it("refuses swings while stunned, dead, unarmed or out of SP", () => {
    for (const extra of [
      { buffs: [{ name: "stun" }] },
      { state: { isDead: true } },
      { equipment: {} },
      { stats: { sp: 0, attackDelay: 500 } },
    ] as Partial<FullCharacterWire>[]) {
      const { session } = setup(extra);
      expect(session.attack({ direction: "down" })).toBeUndefined();
    }
  });

  it("a bow walks freely while it shoots, and shoots when let go", () => {
    const { session, sent, advance } = setup({ equipment: { handRight: bow } });
    frames(session, advance, 5, { isHoldingAttack: true });
    expect(sent.filter(([n]) => n === "attack")).toHaveLength(0);
    frames(session, advance, 1, {});
    expect(sent.filter(([n]) => n === "attack")).toHaveLength(1);
    const view = frames(session, advance, 10, walkRight);
    expect(view.x).toBeGreaterThan(160 + 10);
  });

  it("aiming roots and tells the server where it aims", () => {
    const { session, names, advance } = setup({ equipment: { handRight: bow } });
    const view = frames(session, advance, 10, { ...walkRight, isAiming: true, angle: 0.5 });
    expect(view.x - 160).toBeLessThan(10);
    expect(names()).toContain("changeDirection");
  });

  it("eases small corrections in and snaps big ones", () => {
    const { session, advance } = setup();
    session.receive("positionCorrection", { x: 170, y: 160 });
    expect(frames(session, advance, 1).x).toBeLessThan(170);
    expect(frames(session, advance, 30).x).toBeCloseTo(170);
    session.receive("positionCorrection", { x: 170 + SNAP_DISTANCE + 10, y: 160 });
    expect(frames(session, advance, 1).x).toBe(170 + SNAP_DISTANCE + 10);
    expect(session.corrections).toBe(2);
  });

  it("knows how long the hero has been dead and sends respawn", () => {
    const { session, names, advance } = setup();
    expect(session.deadFor()).toBeUndefined();
    getSelf(session.clientState)!.state.isDead = true;
    session.receive("statuses", {});
    advance(500);
    expect(session.deadFor()).toBe(500);
    session.respawn();
    expect(names()).toContain("respawn");
    session.receive("heroInit", { socketId: "me", players: [heroRecord()] });
    expect(session.deadFor()).toBeUndefined();
  });

  it("rolls when ready and rejects a roll on cooldown", () => {
    const { session, names, advance } = setup();
    expect(session.dodge(0)).toBe(true);
    expect(session.dodge(0)).toBe(false);
    expect(frames(session, advance, 5).x).toBeGreaterThan(170);
    expect(names().filter((n) => n === "dodge")).toHaveLength(1);
  });

  it("pings and reports its lag", () => {
    const { session, sent, advance } = setup();
    session.ping();
    advance(80);
    (sent.find(([n]) => n === "latency")![1] as () => void)();
    expect(sent.at(-1)).toEqual(["reportLag", { ms: 40 }]);
  });
});
