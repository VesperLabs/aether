import type { Clock } from "@/agents";
import { DEFAULT_SERVER_FPS } from "@/network";
import { createTickLoop } from "@/rules/world";
import { createServerWorld } from "../game-world";
import { listenForConnections } from "../net/connection";
import { initFakeDatabase } from "../persistence";
import { serverSystems } from "../tick";
import { createLocalHub } from "./local-hub";
import { createSeededDice } from "./seeded-dice";
import { createVirtualTime } from "./virtual-time";

/** Lets pending promises and the fake database finish before time moves on. */
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * The real game server on virtual time, with agents connected in-process. The world has the real
 * maps (walls, doors) but no NPCs unless asked, and a seeded RNG, so nothing happens by chance. Time only moves when
 * nothing is left to do right now, and then jumps straight to the next timer (a tick, an agent's
 * sleep), so a minute of play takes milliseconds and every run is the same.
 *
 *   const sim = await createSimulation();
 *   await sim.run(async () => { const agent = await Agent.join(sim.connect(), {...}); ... });
 */
export async function createSimulation({
  fps = DEFAULT_SERVER_FPS,
  mapNpcs = false,
  seed = 1,
}: {
  fps?: number;
  /** Spawn the maps' own NPCs too. Off by default: scenarios summon exactly what they need. */
  mapNpcs?: boolean;
  /** Everything random in the run comes from this, so the same seed plays the same game. */
  seed?: number;
} = {}) {
  process.env.PUBLIC_DIR ??= "public";
  process.env.ENABLE_CHEATS = "true";
  const time = createVirtualTime();
  const dice = createSeededDice(seed);
  const hub = createLocalHub();
  const world = createServerWorld({
    io: hub.io,
    db: await initFakeDatabase(dice),
    now: time.now,
    dice,
    mapNpcs,
  });
  world.loop = createTickLoop(world, serverSystems, {
    fps,
    clock: time.now,
    setTimer: time.setTimer,
  });
  listenForConnections(world);

  const clock: Clock = { now: time.now, sleep: time.sleep };

  return {
    world,
    /** Agents in this simulation must use this clock. */
    clock,
    connect: hub.connect,
    /** Plays the simulation until `work` finishes, and resolves with its result. */
    async run<T>(work: () => Promise<T>): Promise<T> {
      let finished = false;
      const playing = work().finally(() => (finished = true));
      playing.catch(() => {}); // surfaced by the await below
      while (!finished) {
        await settle();
        if (finished || hub.deliver()) continue;
        if (!time.fireNext()) throw new Error("Simulation stalled: nothing is waiting on time");
      }
      return playing;
    },
    close: () => {
      world.loop.stop();
    },
  };
}
