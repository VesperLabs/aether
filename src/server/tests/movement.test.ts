// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Socket tests for the movement commands: cheats fail, normal play works. */
let httpServer: http.Server;
let gameServer: GameServer;
let url: string;
const sockets: Socket[] = [];

type Anything = any;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function login() {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass: "warrior" });
  await heroInit;
  const player = (gameServer.world as Anything).players[socket.id as string];
  return { socket, player };
}

const ping = (socket: Socket) =>
  new Promise<boolean>((resolve) => socket.emit("latency", () => resolve(true)));

/** Resolves true when the event arrives within the window, false otherwise. */
const arrives = (socket: Socket, event: string, ms = 300) =>
  Promise.race([once(socket, event).then(() => true), wait(ms).then(() => false)]);

/** A door in the player's room that leads somewhere. */
function findDoor(player: Anything) {
  const doors = (gameServer.world as Anything).doors[player.room.name] as Record<string, Anything>;
  return Object.values(doors).find((d) => d.destMap && d.destDoor) as Anything;
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

describe("updateState", () => {
  it("accepts the two flags the client sends", async () => {
    const { socket, player } = await login();
    socket.emit("updateState", { isAiming: true, isHoldingAttack: true });
    await ping(socket);
    expect(player.state.isAiming).toBe(true);
    expect(player.state.isHoldingAttack).toBe(true);
  });

  it("drops any other key, including ones sent next to valid flags", async () => {
    const { socket, player } = await login();
    socket.emit("updateState", { isDead: true, isInvincible: true });
    socket.emit("updateState", { isAiming: true, isDead: true });
    socket.emit("updateState", { isAiming: "yes" } as never);
    await ping(socket);
    expect(player.state.isDead).toBeFalsy();
    expect(player.state.isInvincible).toBeUndefined();
    expect(player.state.isAiming).not.toBe("yes");
  });
});

describe("respawn", () => {
  it("does nothing while the player is alive", async () => {
    const { socket, player } = await login();
    player.stats.hp = 1;
    const { x, y } = player;
    socket.emit("respawn");
    await ping(socket);
    expect(player.stats.hp).toBe(1);
    expect(player.x).toBe(x);
    expect(player.y).toBe(y);
  });

  it("revives a dead player", async () => {
    const { socket, player } = await login();
    player.state.isDead = true;
    player.stats.hp = 0;
    const init = once(socket, "heroInit");
    socket.emit("respawn");
    await init;
    expect(player.state.isDead).toBe(false);
    expect(player.stats.hp).toBeGreaterThan(0);
  });
});

describe("enterDoor", () => {
  it("fails from far away", async () => {
    const { socket, player } = await login();
    const door = findDoor(player);
    player.x = door.x + 2000;
    player.y = door.y + 2000;
    const init = arrives(socket, "heroInit");
    socket.emit("enterDoor", door.name);
    expect(await init).toBe(false);
    expect(player.x).toBe(door.x + 2000);
  });

  it("works next to the door", async () => {
    const { socket, player } = await login();
    const door = findDoor(player);
    player.x = door.centerPos.x;
    player.y = door.centerPos.y - player.bodyOffsetY;
    const init = once(socket, "heroInit");
    socket.emit("enterDoor", door.name);
    await init;
    expect(player.room.name).toBe(door.destMap);
  });

  it("ignores an unknown door name", async () => {
    const { socket, player } = await login();
    socket.emit("enterDoor", "no-such-door");
    expect(await ping(socket)).toBe(true);
    expect(player.room).toBeTruthy();
  });
});

describe("playerInput", () => {
  it("accepts normal walking and does not send corrections", async () => {
    const { socket, player } = await login();
    const correction = arrives(socket, "positionCorrection", 400);
    const { x, y } = player;
    // find a direction without a wall by trying small steps along the line
    for (let i = 1; i <= 3; i++) {
      socket.emit("playerInput", { x: x + i * 3, y, vx: 100, vy: 0, d: 3 });
    }
    await ping(socket);
    expect(await correction).toBe(false);
    expect(player.x).toBe(x + 9);
  });

  it("rejects a teleport, keeps the last position and corrects the client", async () => {
    const { socket, player } = await login();
    const { x, y } = player;
    const correction = once(socket, "positionCorrection");
    socket.emit("playerInput", { x: x + 800, y, vx: 100, vy: 0, d: 3 });
    const [position] = await correction;
    expect(position).toEqual({ x, y });
    expect(player.x).toBe(x);
  });

  it("rejects positions outside the map", async () => {
    const { socket, player } = await login();
    const { x, y } = player;
    const correction = once(socket, "positionCorrection");
    socket.emit("playerInput", { x: -50, y, vx: 0, vy: 0, d: 3 });
    await correction;
    expect(player.x).toBe(x);
  });

  it("rejects walking into a wall", async () => {
    const { socket, player } = await login();
    const { grid } = player.room.map;
    // the nearest solid tile within reach is where the cheater tries to stand
    let target: { x: number; y: number } | undefined;
    const tx0 = Math.floor(player.x / grid.tileWidth);
    const ty0 = Math.floor(player.y / grid.tileHeight);
    for (let r = 1; r < 6 && !target; r++) {
      for (let dy = -r; dy <= r && !target; dy++) {
        for (let dx = -r; dx <= r && !target; dx++) {
          if (grid.solid[ty0 + dy]?.[tx0 + dx]) {
            target = {
              x: (tx0 + dx + 0.5) * grid.tileWidth,
              y: (ty0 + dy + 0.5) * grid.tileHeight - player.bodyOffsetY,
            };
          }
        }
      }
    }
    expect(target).toBeTruthy();
    const { x, y } = player;
    const correction = once(socket, "positionCorrection");
    socket.emit("playerInput", { ...target, vx: 0, vy: 0, d: 3 });
    await correction;
    expect(player.x).toBe(x);
    expect(player.y).toBe(y);
  });

  it("does not correct the first update after a door teleport", async () => {
    const { socket, player } = await login();
    const door = findDoor(player);
    player.x = door.centerPos.x;
    player.y = door.centerPos.y - player.bodyOffsetY;
    const init = once(socket, "heroInit");
    socket.emit("enterDoor", door.name);
    await init;
    const { x, y } = player;
    const correction = arrives(socket, "positionCorrection", 300);
    socket.emit("playerInput", { x, y, vx: 0, vy: 0, d: 3 });
    await ping(socket);
    expect(await correction).toBe(false);
  });
});
