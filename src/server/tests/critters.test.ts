// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pinSeason, setHour } from "@/rules/seasons";
import { spawnNpc } from "../game-world";
import { startTestServer, type TestServer } from "./test-server";

/** Actors kept to their `active` times: butterflies by day in spring and summer. */
let server: TestServer;

type Anything = any;

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

const butterflies = () =>
  Object.values<Anything>(server.world.npcs).filter((npc) => npc.name === "butterfly");

async function at(socket: Anything, season: "spring" | "summer" | "fall" | "winter", hour: number) {
  const { world } = server;
  pinSeason(world.calendar, season);
  setHour(world.calendar, world.now(), hour);
  await server.run(socket, 200);
}

describe("actor active times", () => {
  it("are placed on the maps", () => {
    expect(butterflies().length).toBeGreaterThan(0);
  });

  it("are out by day in summer and away at night", async () => {
    const { socket } = await server.login("warrior");
    await at(socket, "summer", 12);
    for (const b of butterflies()) expect(b.state).toMatchObject({ isDead: false });
    for (const b of butterflies()) expect(b.state.isAway).toBeFalsy();

    await at(socket, "summer", 22);
    for (const b of butterflies()) expect(b.state).toMatchObject({ isAway: true, isDead: true });
  });

  it("stay away through fall and winter, even by day", async () => {
    const { socket } = await server.login("warrior");
    await at(socket, "winter", 12);
    for (const b of butterflies()) expect(b.state.isAway).toBe(true);
    await at(socket, "fall", 12);
    for (const b of butterflies()) expect(b.state.isAway).toBe(true);
  });

  it("come back home in spring, whole", async () => {
    const { socket } = await server.login("warrior");
    await at(socket, "winter", 12);
    await at(socket, "spring", 9);
    for (const b of butterflies()) {
      expect(b.state).toMatchObject({ isAway: false, isDead: false });
      expect(b.stats.hp).toBe(b.stats.maxHp);
    }
  });

  it("tells the room when one leaves", async () => {
    const { socket, player } = await server.login("warrior");
    await at(socket, "summer", 12);
    const room = server.world.rooms[player.roomName];
    const here = spawnNpc(server.world, room, { name: "butterfly", x: player.x, y: player.y })!;
    await server.run(socket, 100);
    const left: Anything[] = [];
    socket.on("npcAway", (payload: Anything) => left.push(payload));
    await at(socket, "summer", 22);
    expect(left).toContainEqual({ id: here.id });
  });
});
