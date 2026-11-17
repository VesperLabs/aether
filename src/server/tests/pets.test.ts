// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/content";
import { catchAsOwned } from "../catching";
import { emptyPetSlots, STORED_PET_SLOTS } from "@/rules/capture";
import { bringOutPet } from "../pets";
import { startTestServer, type TestServer } from "./test-server";

/** Pets, caught and saved to the account in slots: one out, the rest stored; lost when they die. */
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

const ownedBy = (ownerId: string): Anything[] =>
  Object.values<Anything>(server.world.npcs).filter((npc) => npc.state.ownerId === ownerId);

/** Catches a crab spawned at the player's feet, as a ball does. */
async function catchCrab(socket: Socket, player: Anything) {
  await cheat(socket, "/npc spawn crab");
  const wild = Object.values<Anything>(server.world.npcs).find(
    (npc) => npc.name === "crab" && npc.state.isCheatSpawned && !npc.state.isDead,
  );
  wild.x = player.x;
  wild.y = player.y;
  return catchAsOwned(server.world, player, wild, [], { asPet: true })!;
}

/** Logs in and catches a crab. */
async function catchFirstCrab() {
  const { socket, player } = await server.login();
  const pet = await catchCrab(socket, player);
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

describe("pets", () => {
  it("a caught pet is saved in the active slot, out with its owner", async () => {
    const { player, pet } = await catchFirstCrab();
    expect(pet.name).toBe("crab");
    expect(player.pets.active).toMatchObject({ name: "crab", id: pet.state.petId });
  });

  it("with one out, the next catch is stored and leaves the world at once", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    const second = await catchCrab(socket, player);
    expect(player.pets.stored1).toMatchObject({ name: "crab", id: second.state.petId });
    expect(server.world.npcs[second.id]).toBeUndefined();
    expect(ownedBy(socket.id as string)).toEqual([pet]);
  });

  it("with every slot full, a ball that would catch lets it go, and says why", async () => {
    const { socket, player } = await catchFirstCrab();
    for (const slot of STORED_PET_SLOTS) {
      player.pets = { ...player.pets, [slot]: { id: slot, name: "bat" } };
    }
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
    expect(ownedBy(socket.id as string)).toHaveLength(1);
    expect(wild.state.isDead).toBeFalsy();
  });

  it("dies for good: off the account at once, out of the world once its death plays", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    pet.setDead();
    await server.run(socket, 50);
    expect(player.pets).toEqual(emptyPetSlots());
    await server.until(socket, () => !server.world.npcs[pet.id]);
    expect(ownedBy(socket.id as string)).toHaveLength(0);
  });

  it("moving a stored one into the active slot swaps them: it comes out, the other goes in", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    const second = await catchCrab(socket, player);
    socket.emit("movePet", { from: "stored1", to: "active" });
    await server.until(socket, () => player.pets.active?.id === second.state.petId);
    expect(player.pets.stored1?.id).toBe(pet.state.petId);
    expect(server.world.npcs[pet.id]).toBeUndefined();
    const [out] = ownedBy(socket.id as string);
    expect(out.state.petId).toBe(second.state.petId);
  });

  it("a double-click puts the active one in the first free store, and brings it back", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    const id = pet.state.petId;
    socket.emit("swapPet", { slot: "active" });
    await server.until(socket, () => !player.pets.active);
    expect(player.pets.stored1?.id).toBe(id);
    expect(ownedBy(socket.id as string)).toHaveLength(0);
    socket.emit("swapPet", { slot: "stored1" });
    await server.until(socket, () => player.pets.active?.id === id);
    expect(ownedBy(socket.id as string)).toHaveLength(1);
  });

  it("released, it leaves the world and the account", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    socket.emit("releasePet", { slot: "active" });
    await server.until(socket, () => !player.pets.active);
    expect(server.world.npcs[pet.id]).toBeUndefined();
  });

  it("/pet away stores it, still saved, and /pet out brings it back", async () => {
    const { socket, player, pet } = await catchFirstCrab();
    expect((await cheat(socket, "/pet away")).type).toBe("system");
    expect(server.world.npcs[pet.id]).toBeUndefined();
    expect(player.pets.stored1).toMatchObject({ name: "crab" });

    expect((await cheat(socket, "/pet out")).type).toBe("system");
    const [back] = ownedBy(socket.id as string);
    expect(back.state.petId).toBe(player.pets.active?.id);
    /* `/npc clear` is for temporary NPCs: it leaves this one */
    await cheat(socket, "/npc clear");
    expect(server.world.npcs[back.id]).toBeDefined();
  });

  it("/npc catch catches the nearest wild NPC as a pet, as a ball does", async () => {
    const { socket, player } = await server.login();
    await cheat(socket, "/npc spawn crab");
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.isCheatSpawned && !npc.state.isDead,
    );
    wild.x = player.x;
    wild.y = player.y;
    expect((await cheat(socket, "/npc catch crab")).type).toBe("system");
    expect(player.pets.active).toMatchObject({ name: "crab" });
    expect(wild.state.isDead).toBe(true);
  });

  it("/npc follow is temporary too: not saved in a slot", async () => {
    const { socket, player } = await catchFirstCrab();
    await cheat(socket, "/npc spawn crab");
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.isCheatSpawned && !npc.state.isDead,
    );
    wild.x = player.x;
    wild.y = player.y;
    expect((await cheat(socket, "/npc follow crab")).type).toBe("system");
    expect(ownedBy(socket.id as string)).toHaveLength(2);
    expect(player.pets.stored1).toBeNull();
  });

  it("followers are never saved, never count, and respawn when they die", async () => {
    const { socket, player } = await server.login();
    await cheat(socket, "/npc spawn crab follower 2");
    const pets = ownedBy(socket.id as string);
    expect(pets).toHaveLength(2);
    expect(player.pets).toEqual(emptyPetSlots());
    pets[0].setDead();
    await server.run(socket, 3000);
    expect(server.world.npcs[pets[0].id]).toBeDefined();
  });

  it("the active one comes back at its owner's feet when they log in; stored ones wait", async () => {
    const { player } = await server.login();
    player.pets = {
      ...emptyPetSlots(),
      active: { id: "saved-crab", name: "crab" },
      stored1: { id: "saved-bat", name: "bat" },
    };
    bringOutPet(server.world, player);
    const pets = ownedBy(player.socketId);
    expect(pets.map((pet) => pet.state.petId)).toEqual(["saved-crab"]);
    expect({ x: pets[0].x, y: pets[0].y }).toEqual({ x: player.x, y: player.y });
    /* Already resting in the room its owner is sent, before any tick */
    expect(pets[0].buffs.map((b: Anything) => b.name)).toContain("rest");
  });
});
