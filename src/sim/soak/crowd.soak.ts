import { afterAll, describe, expect, it } from "vitest";
import { createBot } from "@/bots/bot";
import { BRAINS } from "@/bots/brains/brains";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "@/bots/maps/load-map";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import { createRng } from "@/rules/world/rng";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";

/** Bots (SOAK_BOTS, default 50) in one world for SOAK_MINUTES (default 30) game-minutes. */
const BOTS = Number(process.env.SOAK_BOTS ?? 50);
const MINUTES = Number(process.env.SOAK_MINUTES ?? 30);
const SEED = Number(process.env.SOAK_SEED ?? 7);

describe(`soak: ${BOTS} bots for ${MINUTES} game-minutes`, () => {
  let sim: SimServer | undefined;
  afterAll(async () => {
    await sim?.close();
  });

  it("runs clean, leaks nobody and pauses when everyone leaves", async () => {
    sim = await createSimServer({ seed: SEED, mode: "turbo" });
    const loadMap = createMapLoader(DEFAULT_PUBLIC_DIR);
    const brains = [BRAINS.wander, BRAINS.grind];

    const sockets: ClientGameSocket[] = [];
    const stops: Array<() => void> = [];
    for (let n = 0; n < BOTS; n++) {
      const socket = await sim.connect();
      const bot = createBot({
        socket,
        clock: sim.clock,
        loadMap,
        brain: brains[n % brains.length]!,
        rng: createRng(SEED * 1000 + n),
      });
      const init = nextMessage(socket, "heroInit", { timeoutMs: 10_000 });
      socket.emit("demoLogin", { charClass: "warrior" });
      await init;
      sockets.push(socket);
      stops.push(bot.run(sim.clock.interval));
    }
    expect(Object.keys(sim.world.players)).toHaveLength(BOTS);

    const started = performance.now();
    await sim.clock.advance(MINUTES * 60 * 1000);
    const seconds = (performance.now() - started) / 1000;

    for (const stop of stops) stop();
    for (const socket of sockets) socket.disconnect();
    await sim.clock.settle();

    const ticks = (MINUTES * 60 * 1000) / sim.clock.interval;
    console.log(
      `SOAK ${BOTS} bots, ${MINUTES} game-min: ${seconds.toFixed(1)}s real, ` +
        `${(ticks / seconds).toFixed(0)} ticks/s (${((MINUTES * 60) / seconds).toFixed(1)}x realtime), ` +
        `${sim.log.at("error").length} errors, ${sim.log.at("warn").length} warnings`,
    );

    expect(sim.log.at("error")).toEqual([]);
    expect(Object.keys(sim.world.players)).toEqual([]);
    expect(sim.world.loop.isRunning()).toBe(false);
  }, 3_600_000);
});
