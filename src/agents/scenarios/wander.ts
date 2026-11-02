import { wander as wanderBrain } from "../brains";
import type { Scenario } from "./scenario";

/** How far apart the agent and the server may think it is, in pixels, once it stands still. */
const AGREE_DISTANCE = 2;

export const wander: Scenario = {
  name: "wander",
  description: "an agent runs the wander brain; afterwards it and the server agree where it is",
  async run({ spawn, live, clock, log, check }) {
    const agent = await spawn("Agent Wanderer");
    const { senses } = agent;
    const room = senses.roomName;

    await live(agent, wanderBrain, 4000);
    await clock.sleep(200); // a few pose ticks after it stopped
    const served = senses.characters.get(senses.selfId);
    log(`wandered with ${senses.corrections.length} corrections (walls end a stroll)`);
    check(senses.roomName === room, "it stays in its room");
    check(
      !!served && Math.hypot(served.x - senses.x, served.y - senses.y) <= AGREE_DISTANCE,
      `the server agrees where it stands (${Math.round(senses.x)},${Math.round(senses.y)})`,
    );
  },
};
