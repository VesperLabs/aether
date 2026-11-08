// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "./test-server";

/** Companions from `/npc spawn ... pet` and `/npc tame`, against the real game server. */
let server: TestServer;

type Anything = any;

/** Sends a cheat and waits for the server to answer it. */
function cheat(socket: Socket, command: string): Promise<Anything> {
  return new Promise((resolve) => {
    const listener = (m: Anything) => {
      if (m?.type === "chat") return;
      socket.off("message", listener);
      resolve(m);
    };
    socket.on("message", listener);
    socket.emit("message", { message: command });
  });
}

const companionsOf = (ownerId: string): Anything[] =>
  Object.values<Anything>(server.world.npcs).filter((npc) => npc.state.ownerId === ownerId);

/** Summons one companion and returns it. */
async function summon(socket: Socket, actor: string) {
  const reply = await cheat(socket, `/npc spawn ${actor} pet`);
  expect(reply.type).toBe("system");
  const pet = companionsOf(socket.id as string).find((npc) => npc.name === actor);
  expect(pet).toBeTruthy();
  return pet;
}

beforeAll(async () => {
  process.env.ENABLE_CHEATS = "true";
  server = await startTestServer();
}, 60000);

afterEach(async () => {
  /* Spawned NPCs and companions would otherwise wander into the next test. */
  for (const npc of Object.values<Anything>(server.world.npcs)) {
    if (!npc.state.isCheatSpawned && !npc.state.ownerId) continue;
    delete server.world.npcs[npc.id];
    server.world.netIds.release(npc.id);
  }
});

afterAll(() => server?.close());

describe("companions", () => {
  it("/npc spawn ... pet gives you a companion, and /npc clear sends it away", async () => {
    const { socket } = await server.login();
    const pet = await summon(socket, "bear");
    expect((await cheat(socket, "/npc list")).message).toContain("Bear");

    await cheat(socket, "/npc clear");
    expect(server.world.npcs[pet.id]).toBeUndefined();
    expect(companionsOf(socket.id as string)).toHaveLength(0);
  });

  it("admin cheats can make anyone a companion, keepers included", async () => {
    const { socket, player } = await server.login();
    const trista = await summon(socket, "trista");
    expect(trista.talks).toBe(true);
    await cheat(socket, "/npc clear");

    await cheat(socket, "/npc spawn dog");
    const dog = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "dog" && npc.state.spawnedBy === socket.id,
    );
    dog.x = player.x;
    dog.y = player.y;
    expect((await cheat(socket, "/npc tame dog")).type).toBe("system");
    expect(companionsOf(socket.id as string).map((npc) => npc.name)).toEqual(["dog"]);
  });

  it("/npc spawn takes the count last, and pet before it", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/npc spawn crab pet 2");
    expect(companionsOf(socket.id as string)).toHaveLength(2);
    expect((await cheat(socket, "/npc spawn crab 2 pet")).type).toBe("error");
  });

  it("/npc tame catches a copy: the wild one drops and respawns at its spot", async () => {
    const { socket, player } = await server.login();
    await cheat(socket, "/npc spawn crab");
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.isCheatSpawned,
    );
    wild.x = player.x;
    wild.y = player.y;
    expect((await cheat(socket, "/npc tame crab")).type).toBe("system");

    const [pet] = companionsOf(socket.id as string);
    expect(pet.name).toBe("crab");
    expect(pet).not.toBe(wild);
    expect(pet.behaviors).toContain("follow");
    expect(wild.state.isDead).toBe(true);
    expect(wild.state.ownerId).toBeFalsy();

    await server.until(socket, () => !wild.state.isDead, { maxMs: 20000 });
    expect({ x: wild.x, y: wild.y }).toEqual(wild.startingCoords);
    await cheat(socket, "/npc clear");
  });

  it("follows its owner, even into another room", async () => {
    const { socket, player } = await server.login();
    const pet = await summon(socket, "crab");

    player.x += 200;
    const gap = () => Math.hypot(pet.x - player.x, pet.y - player.y);
    const before = gap();
    await server.run(socket, 1500);
    expect(pet.state.behavior).toBe("follow");
    expect(gap()).toBeLessThan(before - 40);

    await cheat(socket, "/warp mine");
    await server.run(socket, 100);
    expect(pet.room.name).toBe("mine");
    await cheat(socket, "/npc clear");
  });

  it("is never hurt by its owner's attacks", async () => {
    const { socket, player } = await server.login("warrior");
    const pet = await summon(socket, "bear");
    const hp = pet.stats.hp;
    for (let i = 0; i < 5; i++) {
      pet.x = player.x;
      pet.y = player.y + 10;
      socket.emit("attack", { count: 1, direction: "down", castAngle: Math.PI / 2 });
      await server.run(socket, 400);
    }
    expect(pet.stats.hp).toBe(hp);
    await cheat(socket, "/npc clear");
  });

  it("fights whatever attacks its owner, and the owner gets the kill", async () => {
    const { socket, player } = await server.login();
    player.stats.hp = player.stats.maxHp = 1_000_000;
    const pet = await summon(socket, "bear");
    await cheat(socket, "/npc spawn crab");
    const crab = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.spawnedBy === socket.id && !npc.state.ownerId,
    );
    crab.behaviors = ["aggressive"];
    crab.state.isStatic = false;
    crab.stats.hp = crab.stats.maxHp = 5;
    const killsBefore = player.npcKills?.crab ?? 0;

    await server.until(socket, () => crab.state.isDead, {
      step: () => {
        crab.x = player.x + 20;
        crab.y = player.y;
        pet.state.isDead = false;
      },
      maxMs: 30000,
    });

    expect(player.npcKills.crab).toBe(killsBefore + 1);
  });
});
