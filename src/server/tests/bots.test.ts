// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { botPersonalities } from "@/content";
import { once, startTestServer, type TestServer } from "./test-server";

/** Server-run players, driven through the `/bot` cheats against the real game server. */
let server: TestServer;

type Anything = any;

/** Sends a cheat and resolves with its status line. */
async function cheat(socket: Socket, command: string): Promise<Anything> {
  const reply = once(socket, "message");
  socket.emit("message", { message: command });
  return (await reply)[0];
}

const botRadius = botPersonalities.wanderer.wanderRadius;
const bots = (): Anything[] => Object.values(server.world.bots);
const character = (bot: Anything): Anything => server.world.players[bot.id];

beforeAll(async () => {
  process.env.ENABLE_CHEATS = "true";
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("bots", () => {
  it("spawns bots as players the room can see", async () => {
    const { socket } = await server.login("warrior");
    const joined = once(socket, "playerJoin");
    const reply = await cheat(socket, "/bot spawn idler mage 2");

    expect(reply.message).toMatch(/^Spawned idler/);
    expect(bots()).toHaveLength(2);
    expect(bots().map((bot) => character(bot)?.charClass)).toEqual(["mage", "mage"]);
    expect((await joined)[0]).toBeTruthy();
    await cheat(socket, "/bot despawn all");
  });

  it("an idle bot picks its strategy and stands still", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/bot spawn idler");
    await server.run(socket, 500);

    const [bot] = bots();
    expect(bot.memory.strategy).toBe("idle");
    expect(character(bot).vx).toBe(0);
    await cheat(socket, "/bot despawn all");
  });

  it("a dead bot respawns by itself", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/bot spawn idler");
    const [bot] = bots();
    character(bot).setDead();
    await server.run(socket, 500);
    expect(character(bot).state.isDead).toBe(true);

    await server.run(socket, 4000);
    expect(character(bot).state.isDead).toBe(false);
    await cheat(socket, "/bot despawn all");
  });

  it("a wanderer strolls around near where it spawned", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/bot spawn wanderer");
    const [bot] = bots();
    const distanceFromHome = () =>
      Math.hypot(character(bot).x - bot.home.x, character(bot).y - bot.home.y);

    await server.until(socket, () => distanceFromHome() > 16);
    await server.run(socket, 10000);
    expect(distanceFromHome()).toBeLessThan(botRadius + 32);
    await cheat(socket, "/bot despawn all");
  });

  it("a paused bot stops where it is", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/bot spawn wanderer");
    const [bot] = bots();
    await server.until(socket, () => bot.walk?.status === "walking");
    await cheat(socket, "/bot pause all");
    const { x, y } = character(bot);
    await server.run(socket, 2000);
    expect(character(bot)).toMatchObject({ x, y, vx: 0, vy: 0 });
    await cheat(socket, "/bot despawn all");
  });

  it("lists, pauses and removes bots by name", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/bot spawn idler");
    const [bot] = bots();
    const name = character(bot).profile.userName;

    expect((await cheat(socket, "/bot list")).message).toContain(name);
    await cheat(socket, `/bot pause ${name}`);
    expect(bot.isPaused).toBe(true);

    const removed = once(socket, "remove");
    await cheat(socket, `/bot despawn ${name}`);
    expect((await removed)[0]).toBe(bot.id);
    expect(server.world.players[bot.id]).toBeUndefined();
    expect(bots()).toHaveLength(0);
  });

  it("refuses a spawn it can't read", async () => {
    const { socket } = await server.login();
    expect((await cheat(socket, "/bot spawn dragon")).message).toMatch(/^Usage/);
    expect((await cheat(socket, "/bot dance")).message).toMatch(/^Usage/);
  });
});
