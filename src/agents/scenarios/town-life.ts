import { createResident } from "../brains";
import { rulePlanner } from "../planner";
import type { Scenario } from "./scenario";

const LIVE_MS = 20_000;
const AGREE_DISTANCE = 2;

export const townLife: Scenario = {
  name: "town-life",
  description: "three residents live 20 seconds among the maps' own mobs without breaking anything",
  world: "full",
  async run({ spawn, live, clock, log, check }) {
    const residents = [
      await spawn("Agent Mira"),
      await spawn("Agent Oskar"),
      await spawn("Agent Tilde"),
    ];
    const brain = createResident(rulePlanner);

    await Promise.all(residents.map((r) => live(r, brain, LIVE_MS)));
    await clock.sleep(200); // a few pose ticks after they stopped

    for (const r of residents) {
      const { senses } = r;
      const served = senses.characters.get(senses.selfId);
      log(`${r.name}: ${senses.expGained} exp, ${senses.corrections.length} corrections`);
      check(
        senses.isDead ||
          (!!served && Math.hypot(served.x - senses.x, served.y - senses.y) <= AGREE_DISTANCE),
        `${r.name} and the server agree where it is`,
      );
    }
    check(
      residents.some((r) => r.senses.expGained > 0),
      "the residents hunt something",
    );
  },
};
