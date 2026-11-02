import { wander as wanderBrain } from "../brains";
import { agreesWithServer } from "./agreement";
import type { Scenario } from "./scenario";

const LIVE_MS = 120_000;

export const wander: Scenario = {
  name: "wander",
  description: "a bot roams for two minutes, finds its way through doors into other zones",
  async run({ spawn, live, clock, log, check }) {
    const bot = await spawn("Bot Wanderer");
    const { senses } = bot;
    const rooms = [senses.roomName];
    const stopWatching = bot.on("heroInit", () => rooms.push(senses.roomName));

    await live(bot, wanderBrain, LIVE_MS);
    stopWatching();
    await clock.sleep(200); // a few pose ticks after it stopped
    log(`went ${rooms.join(" → ")} with ${senses.corrections.length} corrections`);
    check(new Set(rooms).size > 1, "it walks through a door into another zone");
    check(
      agreesWithServer(senses),
      `the server agrees where it stands (${Math.round(senses.x)},${Math.round(senses.y)})`,
    );
  },
};
