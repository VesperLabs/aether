/*
 * Runs headless bots against any server, on real time.
 *
 *   npm run bots -- --url http://localhost:8000 --count 5 --brain wander
 *   npm run bots -- --url <url> --count 3 --brain grind --email-prefix bot --password botbot
 *
 * Without --email-prefix bots use `demoLogin` (dev servers). With it, bot N logs in as
 * `<prefix>N@bots.aether` (see `npm run seed:bots`).
 */
import { parseArgs } from "node:util";
import { realClock } from "@/rules/world/clock";
import { createRng } from "@/rules/world/rng";
import { createBot } from "./bot";
import { BRAINS, isBrainName } from "./brains/brains";
import { connectBot, type BotLogin } from "./net/connect";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "./maps/load-map";

const STEP_MS = 50;

function main() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "http://localhost:8000" },
      count: { type: "string", default: "1" },
      brain: { type: "string", default: "wander" },
      "email-prefix": { type: "string" },
      password: { type: "string", default: "botbot" },
      "char-class": { type: "string", default: "warrior" },
      seed: { type: "string", default: "1" },
      "public-dir": { type: "string", default: DEFAULT_PUBLIC_DIR },
    },
  });
  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1) throw new Error(`Bad --count: ${values.count}`);
  if (!isBrainName(values.brain)) {
    throw new Error(`Unknown --brain ${values.brain}; one of ${Object.keys(BRAINS).join(", ")}`);
  }
  const brain = BRAINS[values.brain];
  const loadMap = createMapLoader(values["public-dir"]);
  const seed = Number(values.seed);

  for (let n = 1; n <= count; n++) {
    const prefix = values["email-prefix"];
    const login: BotLogin = prefix
      ? { kind: "account", email: `${prefix}${n}@bots.aether`, password: values.password }
      : { kind: "demo", charClass: values["char-class"] };
    const socket = connectBot(values.url, login, (message, ...rest) =>
      console.log(`bot ${n}: ${message}`, ...rest),
    );
    const bot = createBot({ socket, clock: realClock, loadMap, brain, rng: createRng(seed + n) });
    bot.run(STEP_MS);
  }
}

main();
