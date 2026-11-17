// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/content";
import { catchAsCompanion } from "../catching";
import { bringOutCompanions } from "../kept-companions";
import { startTestServer, type TestServer } from "./test-server";

/** Caught companions saved to the account, one at a time, and lost when they die. */
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

/** Logs in and catches a crab spawned at their feet, as a ball does. */
async function tameCrab() {
  const { socket, player } = await server.login();
  await cheat(socket, "/npc spawn crab");
  const wild = Object.values<Anything>(server.world.npcs).find(
    (npc) => npc.name === "crab" && npc.state.isCheatSpawned && !npc.state.isDead,
  );
  wild.x = player.x;
  wild.y = player.y;
  const pet = catchAsCompanion(server.world, player, wild, [], { keep: true })!;
  return { socket, player, pet };
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

describe("kept companions", () => {
  it("a caught companion is saved to its owner's account", async () => {
    const { player, pet } = await tameCrab();
    expect(pet.name).toBe("crab");
    expect(player.companions).toMatchObject([{ name: "crab" }]);
  });

  it("keeps one at a time: a ball that would catch a second lets it go, and says why", async () => {
    const { socket, player } = await tameCrab();
    /* A wild one the map placed, as a ball meets in play */
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) =>
        npc.room.name === player.roomName &&
        !npc.state.ownerId &&
        !npc.state.isDead &&
        !npc.state.isCheatSpawned &&
        !npc.talks,
    );
    wild.x = player.x + 60;
    wild.y = player.y;
    wild.vx = wild.vy = 0;
    wild.behaviors = { guard: {} };
    /* Balls stop on the first thing they meet: everyone else goes behind the throw */
    for (const other of [
      ...Object.values<Anything>(server.world.players).filter((p) => p !== player),
      ...Object.values<Anything>(server.world.npcs).filter((npc) => npc !== wild),
    ])
      other.x = player.x - 200;

    const ball = ItemBuilder.buildItem(server.world.dice, "pokeball")!;
    ball.amount = 2;
    player.inventory = [ball];
    const messages: Anything[] = [];
    socket.on("message", (m: Anything) => messages.push(m));
    const random = server.world.dice.random;
    server.world.dice.random = () => 0;
    socket.emit("throwItem", { location: "inventory", item: { id: ball.id }, angle: 0 });
    await server.until(socket, () => messages.some((m) => m.type === "error"));
    server.world.dice.random = random;
    /* Thrown as usual, but nothing more was caught */
    expect(player.inventory[0].amount).toBe(1);
    expect(companionsOf(socket.id as string)).toHaveLength(1);
    expect(wild.state.isDead).toBeFalsy();
  });

  it("dies for good: off the account at once, out of the world once its death plays", async () => {
    const { socket, player, pet } = await tameCrab();
    pet.setDead();
    await server.run(socket, 50);
    expect(player.companions).toEqual([]);
    await server.until(socket, () => !server.world.npcs[pet.id]);
    expect(companionsOf(socket.id as string)).toHaveLength(0);
  });

  it("/companion away puts it away still saved, and /companion out brings it back", async () => {
    const { socket, player, pet } = await tameCrab();
    expect((await cheat(socket, "/companion away")).type).toBe("system");
    expect(server.world.npcs[pet.id]).toBeUndefined();
    expect(player.companions).toMatchObject([{ name: "crab" }]);

    expect((await cheat(socket, "/companion out")).type).toBe("system");
    const [back] = companionsOf(socket.id as string);
    expect(back.name).toBe("crab");
    expect(back.state.keptId).toBe(player.companions[0].id);
    /* `/npc clear` is for temporary NPCs: it leaves this one */
    await cheat(socket, "/npc clear");
    expect(server.world.npcs[back.id]).toBeDefined();
    /* Only one: out again brings no second copy */
    await cheat(socket, "/companion out");
    expect(companionsOf(socket.id as string)).toHaveLength(1);
  });

  it("/npc tame is temporary too: not saved, and not refused with one kept", async () => {
    const { socket, player } = await tameCrab();
    await cheat(socket, "/npc spawn crab");
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.isCheatSpawned && !npc.state.isDead,
    );
    wild.x = player.x;
    wild.y = player.y;
    expect((await cheat(socket, "/npc tame crab")).type).toBe("system");
    expect(companionsOf(socket.id as string)).toHaveLength(2);
    expect(player.companions).toMatchObject([{ name: "crab" }]);
  });

  it("temporary pets are never saved, never count, and respawn when they die", async () => {
    const { socket, player } = await server.login();
    await cheat(socket, "/npc spawn crab pet 2");
    const pets = companionsOf(socket.id as string);
    expect(pets).toHaveLength(2);
    expect(player.companions).toEqual([]);
    pets[0].setDead();
    await server.run(socket, 3000);
    expect(server.world.npcs[pets[0].id]).toBeDefined();
  });

  it("comes back at its owner's feet when they log in", async () => {
    const { player } = await server.login();
    player.companions = [{ id: "saved-crab", name: "crab" }];
    bringOutCompanions(server.world, player);
    const [pet] = companionsOf(player.socketId);
    expect(pet.name).toBe("crab");
    expect(pet.state.keptId).toBe(player.companions[0].id);
    expect({ x: pet.x, y: pet.y }).toEqual({ x: player.x, y: player.y });
    /* Already resting in the room its owner is sent, before any tick */
    expect(pet.buffs.map((b: Anything) => b.name)).toContain("rest");
  });
});
