// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Cheat chat commands against the real game server, with ENABLE_CHEATS on. */
let httpServer: http.Server;
let gameServer: GameServer;
let url: string;
const sockets: Socket[] = [];

type Anything = any;

/** Resolves with the first `event` whose payload matches. */
function waitFor<T = Anything>(
  socket: Socket,
  event: string,
  matches: (arg: T) => boolean = () => true,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const listener = (arg: T) => {
      if (!matches(arg)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(arg);
    };
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`timed out waiting for "${event}"`));
    }, timeoutMs);
    socket.on(event, listener);
  });
}

async function login(charClass = "warrior") {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await waitFor(socket, "connect");
  const heroInit = waitFor(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  await heroInit;
  return socket;
}

/** Sends a cheat and resolves with its status line. */
function cheat(socket: Socket, command: string) {
  const reply = waitFor(socket, "message", (m: Anything) => m?.type !== "chat");
  socket.emit("message", { message: command });
  return reply;
}

const serverPlayer = (socket: Socket): Anything => gameServer.world.players[socket.id as string];

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  process.env.ENABLE_CHEATS = "true";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.close();
});

describe("cheats", () => {
  it("/hp sets hp and /heal fills it", async () => {
    const socket = await login();
    await cheat(socket, "/hp 1");
    expect(serverPlayer(socket).stats.hp).toBe(1);
    await cheat(socket, "/heal");
    expect(serverPlayer(socket).stats.hp).toBe(serverPlayer(socket).stats.maxHp);
  });

  it("/give puts an item in the inventory", async () => {
    const socket = await login();
    const reply = await cheat(socket, "/give smallHpPotion 5");
    expect(reply.type).toBe("info");
    expect(serverPlayer(socket).inventory.some((i: Anything) => i?.key === "smallHpPotion")).toBe(
      true,
    );
  });

  it("/name renames the character", async () => {
    const socket = await login();
    await cheat(socket, "/name Bot One");
    expect(serverPlayer(socket).profile.userName).toBe("Bot One");
  });

  it("/tp moves within the room and /warp changes room", async () => {
    const socket = await login();
    await cheat(socket, "/tp 100 120");
    expect(serverPlayer(socket)).toMatchObject({ x: 100, y: 120 });

    const rooms = Object.keys(gameServer.world.rooms);
    const other = rooms.find((r) => r !== serverPlayer(socket).roomName) as string;
    const arrived = waitFor(socket, "heroInit");
    await cheat(socket, `/warp ${other}`);
    await arrived;
    expect(serverPlayer(socket).roomName).toBe(other);
  });

  it("/goto joins another player", async () => {
    const leader = await login();
    await cheat(leader, "/name Leader");
    await cheat(leader, "/tp 200 200");
    const follower = await login();
    await cheat(follower, "/goto leader");
    expect(serverPlayer(follower)).toMatchObject({
      roomName: serverPlayer(leader).roomName,
      x: 200,
      y: 200,
    });
  });

  it("/summon adds mobs the room sees, and /despawn removes them", async () => {
    const socket = await login();
    const watcher = await login();
    const joined = waitFor(watcher, "npcJoin");
    const reply = await cheat(socket, "/summon crab 3");
    expect(reply.type).toBe("info");
    expect((await joined).state.isSummoned).toBe(true);

    const removed = waitFor(watcher, "npcRemove");
    await cheat(socket, "/despawn");
    await removed;
    const left = Object.values(gameServer.world.npcs).filter((n: Anything) => n.state?.isSummoned);
    expect(left).toHaveLength(0);
  });

  it("rejects bad arguments with an error", async () => {
    const socket = await login();
    expect((await cheat(socket, "/summon nothing")).type).toBe("error");
    expect((await cheat(socket, "/tp x")).type).toBe("error");
    expect((await cheat(socket, "/warp nowhere")).type).toBe("error");
  });
});
