import { afterEach, describe, expect, it } from "vitest";
import { getSelf } from "@/network/session/client-state";
import { createRng } from "@/rules/world/rng";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";
import { createBot, RESPAWN_DELAY_MS, type Bot } from "./bot";
import { idle } from "./brains/idle";
import type { Brain } from "./brains/brain";
import { wander } from "./brains/wander";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "./maps/load-map";

const loadMap = createMapLoader(DEFAULT_PUBLIC_DIR);

/** Connects a bot, logs it in with `demoLogin` and waits for its hero. */
async function joinBot(sim: SimServer, brain: Brain, seed: number): Promise<Bot> {
  const socket = await sim.connect();
  const bot = createBot({ socket, clock: sim.clock, loadMap, brain, rng: createRng(seed) });
  const init = nextMessage(socket, "heroInit");
  socket.emit("demoLogin", { charClass: "warrior" });
  await init;
  return bot;
}

/** Steps every bot once per world tick, `n` times. */
async function run(sim: SimServer, bots: Bot[], n: number) {
  for (let i = 0; i < n; i++) {
    for (const bot of bots) bot.step(sim.clock.interval / 1000);
    await sim.ticks(1);
  }
}

describe("bots on a sim server", () => {
  let sim: SimServer;
  afterEach(async () => {
    await sim?.close();
  });

  it("a wander bot walks and the server accepts every move", async () => {
    sim = await createSimServer({ seed: 3 });
    const bot = await joinBot(sim, wander, 3);
    const id = bot.clientState.selfId;
    const start = { ...sim.world.players[id]! };
    await run(sim, [bot], 300);

    const end = sim.world.players[id]!;
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(20);
    expect(bot.corrections).toBe(0);
  });

  it("two bots see each other in their client states", async () => {
    sim = await createSimServer({ seed: 4 });
    const alice = await joinBot(sim, wander, 1);
    const bob = await joinBot(sim, wander, 2);
    await run(sim, [alice, bob], 60);

    const bobOnServer = sim.world.players[bob.clientState.selfId]!;
    const bobInAlice = alice.clientState.players.get(bob.clientState.selfId);
    expect(bobInAlice).toBeDefined();
    expect(alice.clientState.players.has(alice.clientState.selfId)).toBe(true);
    expect(bob.clientState.players.has(alice.clientState.selfId)).toBe(true);
    /* Poses lag a tick or two behind the server. */
    expect(Math.hypot(bobInAlice!.x - bobOnServer.x, bobInAlice!.y - bobOnServer.y)).toBeLessThan(
      20,
    );
    expect(getSelf(alice.clientState)?.socketId).toBe(alice.clientState.selfId);
  });

  it("a dead bot respawns after a short delay", async () => {
    sim = await createSimServer({ seed: 6 });
    const bot = await joinBot(sim, idle, 6);
    const player = sim.world.players[bot.clientState.selfId]!;
    player.setDead();
    await run(sim, [bot], 5);
    expect(bot.session.deadFor()).toBeDefined();
    await run(sim, [bot], Math.ceil((RESPAWN_DELAY_MS + 500) / sim.clock.interval));
    expect(sim.world.players[bot.clientState.selfId]!.state.isDead).toBe(false);
  });

  it("a shoved bot is carried by the knockback without a correction", async () => {
    sim = await createSimServer({ seed: 7 });
    const bot = await joinBot(sim, idle, 7);
    const id = bot.clientState.selfId;
    const startX = sim.world.players[id]!.x;
    sim.world.events.emit("playerKnockedBack", { socketId: id, angle: 0 });
    await run(sim, [bot], 20);
    expect(sim.world.players[id]!.x - startX).toBeGreaterThan(15);
    expect(bot.corrections).toBe(0);
  });

  it("a stunned bot stops walking", async () => {
    sim = await createSimServer({ seed: 8 });
    const bot = await joinBot(sim, wander, 8);
    const id = bot.clientState.selfId;
    await run(sim, [bot], 30);
    const player = sim.world.players[id]!;
    player.addBuff({ name: "stun", level: 1, caster: player });
    await run(sim, [bot], 3);
    const x = player.x;
    const y = player.y;
    await run(sim, [bot], 5);
    expect([player.x, player.y]).toEqual([x, y]);
    expect(bot.corrections).toBe(0);
  });

  it("runs 20 game-seconds of 3 wander bots in turbo without errors", async () => {
    sim = await createSimServer({ seed: 5, mode: "turbo" });
    const bots: Bot[] = [];
    for (let n = 0; n < 3; n++) bots.push(await joinBot(sim, wander, 10 + n));
    const stops = bots.map((bot) => bot.run(sim.clock.interval));
    await sim.clock.advance(20 * 1000);
    for (const stop of stops) stop();

    expect(sim.log.at("error")).toEqual([]);
    for (const bot of bots) {
      expect(bot.steps).toBeGreaterThan(100);
      expect(sim.world.players[bot.clientState.selfId]).toBeDefined();
    }
  });
});
