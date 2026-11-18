// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { threatOfHit } from "../owned-npcs";
import { once, startTestServer, type TestServer } from "./test-server";

/** Followers from `/npc spawn ... follower` and `/npc follow`, against the real game server. */
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

/** Summons one follower and returns it. */
async function summon(socket: Socket, actor: string) {
  const reply = await cheat(socket, `/npc spawn ${actor} follower`);
  expect(reply.type).toBe("system");
  const follower = ownedBy(socket.id as string).find((npc) => npc.name === actor);
  expect(follower).toBeTruthy();
  return follower;
}

beforeAll(async () => {
  process.env.ENABLE_CHEATS = "true";
  server = await startTestServer();
}, 60000);

afterEach(async () => {
  /* Spawned NPCs and followers would otherwise wander into the next test. */
  for (const npc of Object.values<Anything>(server.world.npcs)) {
    if (!npc.state.isCheatSpawned && !npc.state.ownerId) continue;
    delete server.world.npcs[npc.id];
    server.world.netIds.release(npc.id);
  }
});

afterAll(() => server?.close());

describe("followers", () => {
  it("/npc spawn ... follower gives you a follower, and /npc clear sends it away", async () => {
    const { socket } = await server.login();
    const follower = await summon(socket, "bear");
    expect((await cheat(socket, "/npc list")).message).toContain("Bear");

    await cheat(socket, "/npc clear");
    expect(server.world.npcs[follower.id]).toBeUndefined();
    expect(ownedBy(socket.id as string)).toHaveLength(0);
  });

  it("a swimmer that follows you walks on land", async () => {
    const { socket, player } = await server.login();
    const fish = await summon(socket, "fish");
    expect(fish.habitat).toBe("land");
    expect(fish.isOutOfBounds()).toBe(false);
    expect({ x: fish.x, y: fish.y }).toEqual({ x: player.x, y: player.y });
  });

  it("admin cheats can make anyone a follower, keepers included", async () => {
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
    expect((await cheat(socket, "/npc follow dog")).type).toBe("system");
    expect(ownedBy(socket.id as string).map((npc) => npc.name)).toEqual(["dog"]);
  });

  it("/npc spawn takes wild or follower, then the count, each in its place", async () => {
    const { socket } = await server.login();
    await cheat(socket, "/npc spawn crab follower 2");
    expect(ownedBy(socket.id as string)).toHaveLength(2);
    expect((await cheat(socket, "/npc spawn crab 2 follower")).type).toBe("error");
    expect((await cheat(socket, "/npc spawn crab wild 2")).type).toBe("system");
  });

  it("/npc spawn puts weapons in its hands, right then left", async () => {
    const { socket } = await server.login();
    expect((await cheat(socket, "/npc spawn crab follower 1 sword dagger")).type).toBe("system");
    const [crab] = ownedBy(socket.id as string);
    expect(crab.equipment.handRight?.key).toBe("sword");
    expect(crab.equipment.handLeft?.key).toBe("dagger");
    expect((await cheat(socket, "/npc spawn crab wild 1 healthPotion")).type).toBe("error");
    expect((await cheat(socket, "/npc spawn crab wild 1 none dagger")).type).toBe("system");
    await cheat(socket, "/npc clear");
  });

  it("/npc follow takes a copy: the wild one drops and respawns at its spot", async () => {
    const { socket, player } = await server.login();
    await cheat(socket, "/npc spawn crab");
    const wild = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.isCheatSpawned,
    );
    wild.x = player.x;
    wild.y = player.y;
    expect((await cheat(socket, "/npc follow crab")).type).toBe("system");

    const [follower] = ownedBy(socket.id as string);
    expect(follower.name).toBe("crab");
    expect(follower).not.toBe(wild);
    expect(follower.state.ownerId).toBe(socket.id);
    expect(wild.state.isDead).toBe(true);
    expect(wild.state.ownerId).toBeFalsy();

    await server.until(socket, () => !wild.state.isDead, { maxMs: 20000 });
    expect({ x: wild.x, y: wild.y }).toEqual(wild.startingCoords);
    await cheat(socket, "/npc clear");
  });

  it("follows its owner, even into another room", async () => {
    const { socket, player } = await server.login();
    const follower = await summon(socket, "crab");

    player.x += 200;
    const gap = () => Math.hypot(follower.x - player.x, follower.y - player.y);
    const before = gap();
    await server.run(socket, 1500);
    expect(follower.state.behavior).toBe("follow");
    expect(gap()).toBeLessThan(before - 40);

    await cheat(socket, "/warp mine");
    await server.run(socket, 100);
    expect(follower.room.name).toBe("mine");
    await cheat(socket, "/npc clear");
  });

  it("warps beside its owner once it has been wedged for a while, dissolving on screens", async () => {
    const { socket, player } = await server.login();
    const follower = await summon(socket, "crab");
    const warps: Anything[] = [];
    socket.on("warpNpc", (warp: Anything) => warps.push(warp));

    /* Barely able to move (owned NPCs walk at their owner's pace): it gets nowhere, as when wedged */
    const walkSpeed = player.stats.walkSpeed;
    player.stats.walkSpeed = 0.5;
    player.x += 200;
    await server.run(socket, 3000);
    player.stats.walkSpeed = walkSpeed;

    expect(Math.hypot(follower.x - player.x, follower.y - player.y)).toBeLessThan(40);
    expect(warps).toContainEqual(expect.objectContaining({ id: follower.id }));
    socket.off("warpNpc");
    await cheat(socket, "/npc clear");
  });

  it("comes through a door with its owner, in the room the owner loads", async () => {
    const { socket, player } = await server.login();
    const follower = await summon(socket, "crab");
    const doors = server.world.doors[player.room.name] as Record<string, Anything>;
    const door = Object.values(doors).find((d) => d.destMap && d.destDoor);
    player.x = door.centerPos.x;
    player.y = door.centerPos.y - player.bodyOffsetY;
    const init = once(socket, "heroInit");
    socket.emit("enterDoor", door.name);
    const [state] = (await init) as Anything[];
    expect(state.npcs.map((n: Anything) => n.id)).toContain(follower.id);
    await server.run(socket, 2000);
    expect(follower.room.name).toBe(door.destMap);
    expect(Math.hypot(follower.x - player.x, follower.y - player.y)).toBeLessThan(200);
    await cheat(socket, "/npc clear");
  });

  it("is never hurt by its owner's attacks", async () => {
    const { socket, player } = await server.login("warrior");
    const follower = await summon(socket, "bear");
    const hp = follower.stats.hp;
    for (let i = 0; i < 5; i++) {
      follower.x = player.x;
      follower.y = player.y + 10;
      socket.emit("attack", { count: 1, direction: "down", castAngle: Math.PI / 2 });
      await server.run(socket, 400);
    }
    expect(follower.stats.hp).toBe(hp);
    await cheat(socket, "/npc clear");
  });

  it("fights whatever attacks its owner, and the owner gets the kill", async () => {
    const { socket, player } = await server.login();
    player.stats.hp = player.stats.maxHp = 1_000_000;
    const follower = await summon(socket, "bear");
    await cheat(socket, "/npc spawn crab");
    const crab = Object.values<Anything>(server.world.npcs).find(
      (npc) => npc.name === "crab" && npc.state.spawnedBy === socket.id && !npc.state.ownerId,
    );
    crab.behaviors = { fight: { starts: "onSight" } };
    crab.stats.hp = crab.stats.maxHp = 5;
    const killsBefore = player.npcKills?.crab ?? 0;

    await server.until(socket, () => crab.state.isDead, {
      step: () => {
        crab.x = player.x + 20;
        crab.y = player.y;
        /* Players from earlier tests stand on this spawn too: make sure it goes for this one */
        crab.setLockedPlayerId(player.socketId);
        follower.state.isDead = false;
      },
      maxMs: 30000,
    });

    expect(player.npcKills.crab).toBe(killsBefore + 1);
  });

  it("draws more threat than its owner for the same hit, so it pulls foes off them", async () => {
    const { socket, player } = await server.login();
    const follower = await summon(socket, "crab");
    expect(threatOfHit(server.world, follower.id, 10)).toBeGreaterThan(
      threatOfHit(server.world, player.socketId, 10) * 2,
    );
  });

  it("casts its self buffs while following, out of a fight", async () => {
    const { socket } = await server.login();
    const follower = await summon(socket, "whiteFang");
    expect(follower.abilities["1"]?.base).toBe("stealth");
    await server.until(socket, () => follower.hasBuff("stealth"), { maxMs: 30000 });
  });
});
