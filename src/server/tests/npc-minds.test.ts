// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { botPersonalities } from "@/content";
import { once, startTestServer, type TestServer } from "./test-server";

/** NPCs whose actor has a `mind`: the planning brain from `rules/bots` on an NPC body. */
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

const distance = (a: Anything, b: Anything) => Math.hypot(a.x - b.x, a.y - b.y);

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

describe("NPC minds", () => {
  it("spawns with a human body the room sees, and a mind instead of behaviors", async () => {
    const { socket } = await server.login();
    const joined = once(socket, "npcJoin");
    const traveler = await spawn(socket, "traveler");
    expect(traveler.mind.personality).toBe("wanderer");
    expect((await joined)[0].profile.race).toBe("human");
    expect(traveler.equipment.handLeft?.key).toBe("hatchet");
  });

  it("an idler picks its strategy and stands still", async () => {
    const { socket } = await server.login();
    const loiterer = await spawn(socket, "loiterer");
    let moving = false;
    for (let ms = 0; ms < 3000; ms += 100) {
      await server.run(socket, 100);
      moving ||= loiterer.vx !== 0 || loiterer.vy !== 0;
    }
    expect(loiterer.mind.memory.strategy).toBe("idle");
    expect(moving).toBe(false);
  });

  it("a wanderer strolls around where it spawned, and never far", async () => {
    const { socket } = await server.login();
    const traveler = await spawn(socket, "traveler");
    const radius = botPersonalities.wanderer.wanderRadius;
    let furthest = 0;
    await server.until(socket, () => furthest > 8, {
      step: () => {
        furthest = Math.max(furthest, distance(traveler, traveler.startingCoords));
        expect(furthest).toBeLessThan(radius + 40);
      },
      maxMs: 30000,
    });
  });

  it("comes back by itself after dying", async () => {
    const { socket } = await server.login();
    const traveler = await spawn(socket, "traveler");
    traveler.setDead();
    await server.until(socket, () => !traveler.state.isDead, { maxMs: 20000 });
  });

  it("a tamed copy follows its owner instead of thinking for itself", async () => {
    const { socket, player } = await server.login();
    const traveler = await spawn(socket, "traveler");
    traveler.x = player.x;
    traveler.y = player.y;
    expect((await cheat(socket, "/npc tame traveler")).type).toBe("system");
    const pet = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.state.ownerId === socket.id,
    );
    expect(pet.mind).toBeUndefined();
    expect(pet.behaviors).toContain("follow");
  });
});
