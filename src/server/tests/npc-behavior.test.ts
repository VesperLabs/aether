// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "./test-server";

/** Mobs deciding what to do, over real sockets against the in-process game server. */
let server: TestServer;

type Anything = any;

async function login(charClass: string) {
  const { socket, world, player } = await server.login(charClass);
  const attacks: Anything[] = [];
  socket.on("npcAttack", (payload: Anything) => attacks.push(payload));
  return { socket, world, player, attacks };
}

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("npc behavior", () => {
  it("a mob notices a nearby player, locks on and attacks them", async () => {
    const { world, player, attacks, socket } = await login("warrior");
    const mob = Object.values<Anything>(world.npcs).find(
      (npc) =>
        npc.room?.name === player.roomName &&
        !npc.talks &&
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

    await server.until(socket, () => attacks.some((a) => a.id === mob.id), {
      step: place,
      maxMs: 20000,
    });

    expect(mob.state.lockedPlayerId).toBe(socket.id);
  });

  it("an attack windup waits for world ticks, not wall-clock time", async () => {
    const { socket, world, player } = await login("warrior");
    const mob = Object.values<Anything>(world.npcs).find(
      (npc) => npc.room?.name === player.roomName && !npc.state.isDead,
    );
    world.loop.pause();
    try {
      const target = { id: player.id, x: mob.x, y: mob.y };
      mob.intendAttack({ direction: "down", castAngle: 0, windupMs: 10 }, target);
      expect(mob.state.isAiming).toBe(true);
      await server.run(socket, 50);
      expect(mob.state.isAiming).toBe(true);
      mob.update(0, 16);
      expect(mob.state.isAiming).toBe(false);
    } finally {
      world.loop.resume();
    }
  });
});
