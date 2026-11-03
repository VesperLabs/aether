/*
 * A local world full of bots you can join from the browser with the normal client.
 *
 *   npm run sim -- --bots 20 --speed 1       real time
 *   npm run sim -- --bots 20 --speed turbo   as fast as the CPU allows
 *
 * Listens on PORT (default 8000) with a fake database; nothing is saved.
 */
import { parseArgs } from "node:util";
import { createBot } from "@/bots/bot";
import { BRAINS } from "@/bots/brains/brains";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "@/bots/maps/load-map";
import { connectBot } from "@/bots/net/connect";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import { realClock } from "@/rules/world/clock";
import { createRng } from "@/rules/world/rng";
import { createApp } from "@/server/app/create-app";
import { readConfig } from "@/server/config/config";
import { createConsoleLogger } from "@/server/log/logger";
import { initFakeDatabase } from "@/server/persistence/fake";
import { createSimClock } from "./sim-clock";

const { values } = parseArgs({
  options: {
    bots: { type: "string", default: "20" },
    speed: { type: "string", default: "1" },
    seed: { type: "string", default: "1" },
  },
});
const count = Number(values.bots);
if (!Number.isInteger(count) || count < 0) throw new Error(`Bad --bots: ${values.bots}`);
if (values.speed !== "1" && values.speed !== "turbo") {
  throw new Error(`Bad --speed ${values.speed}; use 1 or turbo`);
}
const seed = Number(values.seed);

async function main() {
  const config = readConfig({ PORT: "8000", ...process.env });
  const logger = createConsoleLogger({ debug: config.debug });
  const turbo = values.speed === "turbo";
  const simClock = turbo ? createSimClock({ fps: config.fps, mode: "turbo" }) : undefined;
  const clock = simClock ?? realClock;
  const db = await initFakeDatabase(logger);
  const app = await createApp(config, { db, clock, seed, logger });
  const url = `http://localhost:${app.port}`;
  logger.info(`Sim world on ${url} with ${count} bots (speed ${values.speed})`);

  const loadMap = createMapLoader(DEFAULT_PUBLIC_DIR);
  const brains = [BRAINS.wander, BRAINS.grind];
  const stops: Array<() => void> = [];
  const sockets: ClientGameSocket[] = [];
  for (let n = 0; n < count; n++) {
    const socket = connectBot(url, { kind: "demo", charClass: "warrior" }, () => {});
    sockets.push(socket);
    const brain = brains[n % brains.length]!;
    const bot = createBot({ socket, clock, loadMap, brain, rng: createRng(seed + n) });
    stops.push(bot.run(1000 / config.fps));
  }

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    for (const stop of stops) stop();
    for (const socket of sockets) socket.disconnect();
    await app.close();
    simClock?.dispose();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
