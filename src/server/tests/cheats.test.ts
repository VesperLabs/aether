// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "./test-server";

/** Cheat chat commands against the real game server, with ENABLE_CHEATS on. */
let server: TestServer;

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
  const socket = await server.connect();
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

const serverPlayer = (socket: Socket): Anything => server.world.players[socket.id as string];

beforeAll(async () => {
  process.env.ENABLE_CHEATS = "true";
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

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
    expect(reply.type).toBe("system");
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

    const rooms = Object.keys(server.world.rooms);
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

  it("/spawn adds mobs the room sees, and /despawn removes them", async () => {
    const socket = await login();
    const watcher = await login();
    const joined = waitFor(watcher, "npcJoin");
    const reply = await cheat(socket, "/spawn crab 3");
    expect(reply.type).toBe("system");
    expect((await joined).state.isCheatSpawned).toBe(true);

    const removed = waitFor(watcher, "npcRemove");
    await cheat(socket, "/despawn");
    await removed;
    const left = Object.values(server.world.npcs).filter((n: Anything) => n.state?.isCheatSpawned);
    expect(left).toHaveLength(0);
  });

  it("rejects bad arguments with an error", async () => {
    const socket = await login();
    expect((await cheat(socket, "/spawn nothing")).type).toBe("error");
    expect((await cheat(socket, "/tp x")).type).toBe("error");
    expect((await cheat(socket, "/warp nowhere")).type).toBe("error");
  });
});
