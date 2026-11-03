import { afterEach, describe, expect, it } from "vitest";
import { getSelf } from "@/network/session/mirror";
import { createRng } from "@/rules/world/rng";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";
import { createBot, type Bot } from "./bot";
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
    const id = bot.mirror.selfId;
    const start = { ...sim.world.players[id]! };
    await run(sim, [bot], 300);

    const end = sim.world.players[id]!;
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(20);
    expect(bot.corrections).toBe(0);
  });

  it("two bots see each other in their mirrors", async () => {
    sim = await createSimServer({ seed: 4 });
    const alice = await joinBot(sim, wander, 1);
    const bob = await joinBot(sim, wander, 2);
    await run(sim, [alice, bob], 60);

    const bobOnServer = sim.world.players[bob.mirror.selfId]!;
    const bobInAlice = alice.mirror.players.get(bob.mirror.selfId);
    expect(bobInAlice).toBeDefined();
    expect(alice.mirror.players.has(alice.mirror.selfId)).toBe(true);
    expect(bob.mirror.players.has(alice.mirror.selfId)).toBe(true);
    /* Poses lag a tick or two behind the server. */
    expect(Math.hypot(bobInAlice!.x - bobOnServer.x, bobInAlice!.y - bobOnServer.y)).toBeLessThan(
      20,
    );
    expect(getSelf(alice.mirror)?.socketId).toBe(alice.mirror.selfId);
  });

  it("runs 10 game minutes of 5 wander bots in turbo without errors", async () => {
    sim = await createSimServer({ seed: 5, mode: "turbo" });
    const bots: Bot[] = [];
    for (let n = 0; n < 5; n++) bots.push(await joinBot(sim, wander, 10 + n));
    const stops = bots.map((bot) => bot.run(sim.clock.interval));
    await sim.clock.advance(10 * 60 * 1000);
    for (const stop of stops) stop();

    expect(sim.log.at("error")).toEqual([]);
    for (const bot of bots) {
      expect(bot.steps).toBeGreaterThan(1000);
      expect(sim.world.players[bot.mirror.selfId]).toBeDefined();
    }
  }, 120_000);
});
