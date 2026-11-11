// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { once, startTestServer, type TestServer } from "./test-server";

/** Adventurers: ordinary actors whose `behaviors` make them act their own way, on the same brain as mobs. */
let server: TestServer;

type Anything = any;

async function cheat(socket: Socket, command: string): Promise<Anything> {
  const reply = once(socket, "message");
  socket.emit("message", { message: command });
  return (await reply)[0];
}

/** Spawns one of `actor` next to the player and returns it. */
async function spawn(socket: Socket, actor: string): Promise<Anything> {
  expect((await cheat(socket, `/npc spawn ${actor}`)).type).toBe("system");
  return Object.values<Anything>(server.world.npcs).find(
    (npc) => npc.name === actor && npc.state.isCheatSpawned,
  );
}

beforeAll(async () => {
  process.env.ENABLE_CHEATS = "true";
  server = await startTestServer();
}, 60000);

afterEach(() => {
  for (const npc of Object.values<Anything>(server.world.npcs)) {
    if (!npc.state.isCheatSpawned && !npc.state.ownerId) continue;
    delete server.world.npcs[npc.id];
    server.world.netIds.release(npc.id);
  }
});

afterAll(() => server?.close());

describe("adventurers", () => {
  it("spawn with the body and gear their actor gives them", async () => {
    const { socket } = await server.login();
    const joined = once(socket, "npcJoin");
    const traveler = await spawn(socket, "traveler");
    expect((await joined)[0].profile.race).toBe("human");
    expect(traveler.equipment.handLeft?.key).toBe("hatchet");
  });

  it("one that guards stays where it spawned", async () => {
    const { socket } = await server.login();
    const loiterer = await spawn(socket, "loiterer");
    let moving = false;
    for (let ms = 0; ms < 3000; ms += 100) {
      await server.run(socket, 100);
      moving ||= loiterer.vx !== 0 || loiterer.vy !== 0;
    }
    expect(loiterer.state.behavior).toBe("guard");
    expect(moving).toBe(false);
  });

  it("one with only the default behaviors wanders off", async () => {
    const { socket } = await server.login();
    const traveler = await spawn(socket, "traveler");
    const start = { x: traveler.x, y: traveler.y };
    await server.until(socket, () => Math.hypot(traveler.x - start.x, traveler.y - start.y) > 4, {
      maxMs: 30000,
    });
  });

  it("come back by themselves after dying", async () => {
    const { socket } = await server.login();
    const traveler = await spawn(socket, "traveler");
    traveler.setDead();
    await server.until(socket, () => !traveler.state.isDead, { maxMs: 20000 });
  });

  it("a tamed one follows its owner", async () => {
    const { socket, player } = await server.login();
    const loiterer = await spawn(socket, "loiterer");
    loiterer.x = player.x;
    loiterer.y = player.y;
    expect((await cheat(socket, "/npc tame loiterer")).type).toBe("system");
    const pet = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.state.ownerId === socket.id,
    );
    player.x += 200;
    await server.until(socket, () => pet.state.behavior === "follow", { maxMs: 5000 });
  });
});
