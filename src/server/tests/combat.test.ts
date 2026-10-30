// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Combat, spells and buffs over real sockets against the in-process game server. */
let httpServer: http.Server;
let gameServer: GameServer;
let url: string;
const sockets: Socket[] = [];

type Anything = any;

function once<T = Anything>(socket: Socket, event: string, timeoutMs = 5000): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (...args: T[]) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls `step` every `everyMs` until `done` is true, or fails after `timeoutMs`. */
async function until(done: () => boolean, step: () => void, everyMs = 100, timeoutMs = 15000) {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > timeoutMs) throw new Error("condition not reached in time");
    step();
    await sleep(everyMs);
  }
}

async function login(charClass: string) {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  await heroInit;
  const world = gameServer.world as Anything;
  const player = world.players[socket.id as string];
  const events: Record<string, Anything[]> = {};
  for (const name of ["assignDamage", "modifyPlayerStat", "buffUpdate"]) {
    events[name] = [];
    socket.on(name, (payload: Anything) => events[name].push(payload));
  }
  return { socket, world, player, events };
}

/** A mob in the player's room, set up to die to one hit and to never dodge or block. */
function weakMobNear(world: Anything, player: Anything, offset: { x: number; y: number }) {
  const mob = Object.values<Anything>(world.npcs).find(
    (npc) => npc.room?.name === player.roomName && !npc.state.isDead,
  );
  mob.stats.hp = 1;
  mob.stats.dodgeChance = 0;
  mob.stats.blockChance = 0;
  const place = () => {
    player.x = mob.x - offset.x;
    player.y = mob.y - offset.y;
  };
  place();
  return { mob, place };
}

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.close();
});

describe("attacking", () => {
  it("attacks a mob until it dies, and the killer gets exp and kill credit", async () => {
    const { socket, world, player, events } = await login("warrior");
    const { mob, place } = weakMobNear(world, player, { x: 0, y: 0 });
    const expBefore = player.stats.exp;

    await until(
      () => mob.state.isDead,
      () => {
        place();
        socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
      },
      150,
    );

    const hits = events.assignDamage.flat();
    expect(hits.some((hit) => hit.type === "death" && hit.to === mob.id)).toBe(true);
    expect(hits.some((hit) => hit.type === "exp" && hit.to === player.id)).toBe(true);
    expect(mob.stats.hp).toBe(0);
    expect(player.stats.exp).toBeGreaterThan(expBefore);
    expect(player.npcKills[mob.name]).toBeGreaterThan(0);
    /* Attacking costs sp. */
    expect(events.modifyPlayerStat.some((e) => e.type === "sp" && e.amount < 0)).toBe(true);
  });

  it("a mob that is hit locks onto the attacker's socket id", async () => {
    const { socket, world, player } = await login("warrior");
    const { mob, place } = weakMobNear(world, player, { x: 0, y: 0 });
    mob.stats.hp = mob.stats.maxHp = 100000;
    player.id = "not-the-socket-id";

    await until(
      () => mob.stats.hp < 100000,
      () => {
        place();
        socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
      },
      150,
    );

    expect(mob.state.lockedPlayerId).toBe(socket.id);
  });

  it("does not attack again before the attack delay has passed", async () => {
    const { socket, player, events } = await login("warrior");
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await sleep(150);
    expect(player.state.isAttacking).toBe(true);
    const spCosts = events.modifyPlayerStat.filter((e) => e.type === "sp");
    expect(spCosts).toHaveLength(1);
  });

  it("can't attack without the stamina to pay for it", async () => {
    const { socket, player, events } = await login("warrior");
    player.stats.sp = 0;
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await sleep(150);
    expect(player.state.isAttacking).toBeFalsy();
    expect(events.modifyPlayerStat.filter((e) => e.type === "sp")).toHaveLength(0);
  });
});

describe("casting spells", () => {
  it("casts a spell, pays its mana, and respects the cast delay", async () => {
    const { socket, player, events } = await login("mage");
    const mpCost = player.abilities[1].stats.mpCost;

    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await sleep(200);

    const mpPayments = events.modifyPlayerStat.filter((e) => e.type === "mp");
    expect(mpPayments).toEqual([expect.objectContaining({ amount: -mpCost })]);
    expect(player.state.lastCast.fireball).toBeGreaterThan(0);
  });

  it("a rogue casting stealth becomes stealthed", async () => {
    const { socket, player } = await login("rogue");
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await until(
      () => player.hasBuff("stealth"),
      () => {},
      50,
      3000,
    );
  });

  it("does not cast a spell the player cannot afford", async () => {
    const { socket, player, events } = await login("mage");
    player.stats.mp = 0;
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await sleep(200);
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(0);
  });

  it("kills a mob with a spell", async () => {
    const { socket, world, player, events } = await login("mage");
    const { mob, place } = weakMobNear(world, player, { x: 12, y: 0 });
    player.stats.mp = player.stats.maxMp;

    await until(
      () => mob.state.isDead,
      () => {
        place();
        player.stats.mp = player.stats.maxMp;
        socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
      },
      150,
    );

    expect(
      events.assignDamage.flat().some((hit) => hit.type === "death" && hit.to === mob.id),
    ).toBe(true);
  });
});

describe("buffs", () => {
  const buffNames = (update: Anything, id: string) =>
    update.players.find((p: Anything) => p.id === id)?.buffs.map((b: Anything) => b.name);

  it("applies a buff, tells the room, and removes it when it times out", async () => {
    const { socket, player, events } = await login("warrior");

    player.addBuff({ name: "evasion", level: 1, caster: player });
    expect(player.hasBuff("evasion")).toBe(true);
    const dodgeWithBuff = player.stats.dodgeChance;
    await until(
      () => events.buffUpdate.some((u) => buffNames(u, socket.id as string)?.includes("evasion")),
      () => {},
    );

    /* Pretend it was cast long ago. */
    player.getBuff("evasion").spawnTime = Date.now() - 60000;
    await until(
      () => !player.hasBuff("evasion"),
      () => {},
    );
    await until(
      () =>
        events.buffUpdate.some(
          (u) =>
            buffNames(u, socket.id as string) &&
            !buffNames(u, socket.id as string).includes("evasion"),
        ),
      () => {},
    );
    expect(player.stats.dodgeChance).toBeCloseTo(dodgeWithBuff - 5);
  });

  it("replaces a buff of the same name instead of stacking it", async () => {
    const { player } = await login("warrior");
    player.addBuff({ name: "haste", level: 1, caster: player });
    player.addBuff({ name: "haste", level: 2, caster: player });
    expect(player.buffs.filter((b: Anything) => b.name === "haste")).toHaveLength(1);
    expect(player.getBuff("haste").level).toBe(2);
  });

  it("stun stops a player from attacking", async () => {
    const { socket, player, events } = await login("warrior");
    player.addBuff({ name: "stun", level: 1, caster: player });
    player.buffs.find((b: Anything) => b.name === "stun").duration = 60000;
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await sleep(200);
    expect(events.modifyPlayerStat.filter((e) => e.type === "sp")).toHaveLength(0);
  });
});
