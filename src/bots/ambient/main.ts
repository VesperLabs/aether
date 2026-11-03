/*
 * Runs ambient bots next to a server: they log in while humans play and leave after they go.
 * Bot N logs in as `botN@bots.aether` (see `npm run seed:bots`).
 *
 * Env: AMBIENT_BOTS (default 3, 0 disables), BOT_PASSWORD (required in production),
 * PORT (the local server, default 8000), AMBIENT_GRACE_MS (default 60000), PUBLIC_DIR.
 */
import { realClock } from "@/rules/world/clock";
import { connectBot } from "../net/connect";
import { fetchHumansOnline } from "../net/humans-online";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "../maps/load-map";
import { readAmbientConfig } from "./config";
import { createAmbientRunner } from "./runner";

function main() {
  const config = readAmbientConfig(process.env);
  const log = (message: string) => console.log(`🤖 ${message}`);
  if (!config.count) {
    log("ambient bots disabled (AMBIENT_BOTS=0)");
    return;
  }
  const url = `http://localhost:${config.port}`;
  const runner = createAmbientRunner({
    count: config.count,
    graceMs: config.graceMs,
    pollMs: 10_000,
    seed: 1,
    clock: realClock,
    fetchHumans: () => fetchHumansOnline(url),
    connect: (n) =>
      connectBot(
        url,
        { kind: "account", email: `bot${n}@bots.aether`, password: config.password },
        (message) => log(`bot ${n}: ${message}`),
      ),
    loadMap: createMapLoader(process.env.PUBLIC_DIR || DEFAULT_PUBLIC_DIR),
    log,
  });
  const shutdown = () => {
    runner.stop();
    process.exit();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  log(`watching ${url} for humans (${config.count} bots)`);
  runner.start();
}

main();
