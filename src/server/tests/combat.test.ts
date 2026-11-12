// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decodeTickVitals } from "@/network/sync";
import { once, startTestServer, type TestServer } from "./test-server";

/** Combat, spells and buffs over real sockets against the in-process game server. */
let server: TestServer;

type Anything = any;

async function login(charClass: string) {
  const { socket, world, player } = await server.login(charClass);
  const events: Record<string, Anything[]> = {};
  for (const name of ["assignDamage", "modifyPlayerStat", "buffUpdate"]) {
    events[name] = [];
    socket.on(name, (payload: Anything) => events[name].push(payload));
  }
  return { socket, world, player, events };
}

/** A mob in the player's room, set up to die to one hit and to never dodge or block. */
function weakMobNear(world: Anything, player: Anything, offset: { x: number; y: number }) {
  const mob = Object.values<Anything>(world.npcs).find(
    (npc) => npc.room?.name === player.roomName && !npc.state.isDead,
  );
  mob.stats.hp = 1;
  mob.stats.dodgeChance = 0;
  mob.stats.blockChance = 0;
  const place = () => {
    player.x = mob.x - offset.x;
    player.y = mob.y - offset.y;
  };
  place();
  return { mob, place };
}

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("attacking", () => {
  it("attacks a mob until it dies, and the killer gets exp and kill credit", async () => {
    const { socket, world, player, events } = await login("warrior");
    const { mob, place } = weakMobNear(world, player, { x: 0, y: 0 });
    const expBefore = player.stats.exp;

    await server.until(socket, () => mob.state.isDead, {
      step: () => {
        place();
        socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
      },
      everyMs: 150,
    });

    const hits = events.assignDamage.flat();
    expect(hits.some((hit) => hit.type === "death" && hit.to === mob.id)).toBe(true);
    expect(hits.some((hit) => hit.type === "exp" && hit.to === player.id)).toBe(true);
    expect(mob.stats.hp).toBe(0);
    expect(player.stats.exp).toBeGreaterThan(expBefore);
    expect(player.npcKills[mob.name]).toBeGreaterThan(0);
    /* Attacking costs sp. */
    expect(events.modifyPlayerStat.some((e) => e.type === "sp" && e.amount < 0)).toBe(true);
  });

  it("a mob that is hit locks onto the attacker's socket id", async () => {
    const { socket, world, player } = await login("warrior");
    const { mob, place } = weakMobNear(world, player, { x: 0, y: 0 });
    mob.stats.hp = mob.stats.maxHp = 100000;
    player.id = "not-the-socket-id";

    await server.until(socket, () => mob.stats.hp < 100000, {
      step: () => {
        place();
        socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
      },
      everyMs: 150,
    });

    expect(mob.state.lockedPlayerId).toBe(socket.id);
  });

  it("does not attack again before the attack delay has passed", async () => {
    const { socket, player, events } = await login("warrior");
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await server.run(socket, 150);
    expect(player.state.isAttacking).toBe(true);
    const spCosts = events.modifyPlayerStat.filter((e) => e.type === "sp");
    expect(spCosts).toHaveLength(1);
  });

  it("can't attack without the stamina to pay for it", async () => {
    const { socket, player, events } = await login("warrior");
    player.stats.sp = 0;
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await server.run(socket, 150);
    expect(player.state.isAttacking).toBeFalsy();
    expect(events.modifyPlayerStat.filter((e) => e.type === "sp")).toHaveLength(0);
  });
});

describe("casting spells", () => {
  it("casts a spell, pays its mana, and respects the cast delay", async () => {
    const { socket, player, events } = await login("mage");
    const mpCost = player.abilities[1].stats.mpCost;

    socket.emit("startCast", { abilitySlot: 1 });
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 600);

    const mpPayments = events.modifyPlayerStat.filter((e) => e.type === "mp");
    expect(mpPayments).toEqual([expect.objectContaining({ amount: -mpCost })]);
    expect(player.state.lastCast.fireball).toBeGreaterThan(0);
  });

  it("a timed spell pays nothing until it lands, and only fires through startCast", async () => {
    const { socket, player, events } = await login("mage");
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 300);
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(0);
    await server.run(socket, 300);
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(1);
    expect(player.pendingCast).toBeUndefined();
  });

  it("moving does not cancel a cast, but a moving player cannot start one", async () => {
    const { socket, player, events } = await login("mage");
    player.vx = 50;
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    expect(player.pendingCast).toBeUndefined();

    player.vx = 0;
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    player.vx = 50;
    await server.run(socket, 500);
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(1);
  });

  it("roots the caster: a step sent mid-cast is put back", async () => {
    const { socket, player } = await login("mage");
    const { x, y } = player;
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    const correction = once(socket, "positionCorrection");
    socket.emit("playerInput", { x: x + 3, y, vx: 100, vy: 0, d: 3 });
    expect((await correction)[0]).toEqual({ x, y });
    expect(player.x).toBe(x);
  });

  it("faces the caster toward its aim until the spell fires, whatever its client says", async () => {
    const { socket, player } = await login("mage");
    socket.emit("changeDirection", { direction: "up", lastAngle: Math.PI });
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    expect(player.direction).toBe("left");
    socket.emit("changeDirection", { direction: "up", lastAngle: Math.PI / 2 });
    await server.run(socket, 50);
    expect(player.direction).toBe("down");
    await server.run(socket, 600);
    socket.emit("changeDirection", { direction: "up" });
    await server.run(socket, 50);
    expect(player.direction).toBe("up");
  });

  it("cancelling a cast costs nothing and starts no cooldown", async () => {
    const { socket, player, events } = await login("mage");
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 200);
    expect(player.pendingCast).toBeDefined();
    socket.emit("cancelCast");
    await server.run(socket, 600);
    expect(player.pendingCast).toBeUndefined();
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(0);
    expect(player.state.lastCast.fireball).toBeFalsy();
  });

  it("a start sent mid-cast is answered, so the client never waits on a cast it won't get", async () => {
    const { socket, player } = await login("mage");
    const cancels: Anything[] = [];
    socket.on("playerCastCancelled", (payload: Anything) => cancels.push(payload));
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 100);
    expect(cancels).toEqual([{ socketId: player.socketId }]);
  });

  it("calling off a cast the server has no record of still frees the client", async () => {
    const { socket, player } = await login("mage");
    const cancels: Anything[] = [];
    socket.on("playerCastCancelled", (payload: Anything) => cancels.push(payload));
    socket.emit("cancelCast");
    await server.run(socket, 100);
    expect(cancels).toEqual([{ socketId: player.socketId }]);
  });

  it("a rogue casting stealth becomes stealthed", async () => {
    const { socket, player } = await login("rogue");
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await server.until(socket, () => player.hasBuff("stealth"), { maxMs: 3000 });
  });

  it("a cast refused for its cost does not start the spell's cooldown", async () => {
    const { socket, player } = await login("rogue");
    player.stats.sp = 0;
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await server.run(socket, 100);
    expect(player.state.lastCast.stealth).toBeFalsy();
    player.stats.sp = player.stats.maxSp;
    socket.emit("castSpell", { abilitySlot: 1, castAngle: 0 });
    await server.until(socket, () => player.hasBuff("stealth"), { maxMs: 3000 });
  });

  it("statuses carry the server's hp, mp and sp, so the client's copy matches through costs and regen", async () => {
    const { socket, player } = await login("rogue");
    /* Keep the latest status the way the client does: each one replaces the last */
    let mine: Anything = null;
    socket.on("statuses", ({ p = [] }: Anything) => {
      mine = p.find((s: Anything) => s.id === socket.id) ?? mine;
    });
    const seenSp = () => decodeTickVitals(mine?.v)?.sp;

    /* One dodge pays its cost, then one regen tick refills a little: the client must match both */
    const full = player.stats.sp;
    socket.emit("dodge", { angle: 0 });
    await server.until(socket, () => player.stats.sp < full, { maxMs: 2000 });
    await server.until(socket, () => seenSp() === player.stats.sp, { maxMs: 2000 });
    const spent = player.stats.sp;
    await server.until(socket, () => player.stats.sp > spent, { maxMs: 15000 });
    await server.until(socket, () => seenSp() === player.stats.sp, { maxMs: 2000 });
  }, 20000);

  it("does not cast a spell the player cannot afford", async () => {
    const { socket, player, events } = await login("mage");
    player.stats.mp = 0;
    socket.emit("startCast", { abilitySlot: 1 });
    await server.run(socket, 600);
    expect(events.modifyPlayerStat.filter((e) => e.type === "mp")).toHaveLength(0);
  });

  it("kills a mob with a spell", async () => {
    const { socket, world, player, events } = await login("mage");
    const { mob, place } = weakMobNear(world, player, { x: 12, y: 0 });
    player.stats.mp = player.stats.maxMp;

    await server.until(socket, () => mob.state.isDead, {
      step: () => {
        place();
        player.stats.mp = player.stats.maxMp;
        socket.emit("startCast", { abilitySlot: 1 });
      },
      everyMs: 150,
    });

    expect(
      events.assignDamage.flat().some((hit) => hit.type === "death" && hit.to === mob.id),
    ).toBe(true);
  });
});

describe("buffs", () => {
  const buffNames = (update: Anything, id: string) =>
    update.players.find((p: Anything) => p.id === id)?.buffs.map((b: Anything) => b.name);

  it("applies a buff, tells the room, and removes it when it times out", async () => {
    const { socket, player, events } = await login("warrior");

    player.addBuff({ name: "evasion", level: 1, caster: player });
    expect(player.hasBuff("evasion")).toBe(true);
    const dodgeWithBuff = player.stats.dodgeChance;
    await server.until(socket, () =>
      events.buffUpdate.some((u) => buffNames(u, socket.id as string)?.includes("evasion")),
    );

    /* Pretend it was cast long ago. */
    player.getBuff("evasion").spawnTime = server.clock.now() - 60000;
    await server.until(socket, () => !player.hasBuff("evasion"));
    await server.until(socket, () =>
      events.buffUpdate.some(
        (u) =>
          buffNames(u, socket.id as string) &&
          !buffNames(u, socket.id as string).includes("evasion"),
      ),
    );
    expect(player.stats.dodgeChance).toBeCloseTo(dodgeWithBuff - 5);
  });

  it("replaces a buff of the same name instead of stacking it", async () => {
    const { player } = await login("warrior");
    player.addBuff({ name: "haste", level: 1, caster: player });
    player.addBuff({ name: "haste", level: 2, caster: player });
    expect(player.buffs.filter((b: Anything) => b.name === "haste")).toHaveLength(1);
    expect(player.getBuff("haste").level).toBe(2);
  });

  it("stun stops a player from attacking", async () => {
    const { socket, player, events } = await login("warrior");
    player.addBuff({ name: "stun", level: 1, caster: player });
    player.buffs.find((b: Anything) => b.name === "stun").duration = 60000;
    socket.emit("attack", { count: 1, direction: "down", castAngle: 0 });
    await server.run(socket, 200);
    expect(events.modifyPlayerStat.filter((e) => e.type === "sp")).toHaveLength(0);
  });
});
