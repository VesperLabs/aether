// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Mobs deciding what to do, over real sockets against the in-process game server. */
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
  const attacks: Anything[] = [];
  socket.on("npcAttack", (payload: Anything) => attacks.push(payload));
  return { socket, world, player, attacks };
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

describe("npc behavior", () => {
  it("a mob notices a nearby player, locks on and attacks them", async () => {
    const { world, player, attacks, socket } = await login("warrior");
    const mob = Object.values<Anything>(world.npcs).find(
      (npc) =>
        npc.room?.name === player.roomName &&
        npc.kind === "nasty" &&
        !npc.state.isDead &&
        npc.behaviors?.includes("aggressive"),
    );
    expect(mob).toBeTruthy();
    mob.state.isStatic = false;

    const place = () => {
      player.x = mob.x - 20;
      player.y = mob.y;
      player.stats.hp = player.stats.maxHp;
    };
    place();

    await until(() => attacks.some((a) => a.id === mob.id), place, 100, 20000);

    expect(mob.state.lockedPlayerId).toBe(socket.id);
  }, 30000);

  it("an attack windup waits for world ticks, not wall-clock time", async () => {
    const { world, player } = await login("warrior");
    const mob = Object.values<Anything>(world.npcs).find(
      (npc) => npc.room?.name === player.roomName && !npc.state.isDead,
    );
    world.loop.pause();
    try {
      const target = { id: player.id, x: mob.x, y: mob.y };
      mob.intendAttack({ direction: "down", castAngle: 0, windupMs: 10 }, target);
      expect(mob.state.isAiming).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mob.state.isAiming).toBe(true);
      mob.update(0, 16);
      expect(mob.state.isAiming).toBe(false);
    } finally {
      world.loop.resume();
    }
  });
});
