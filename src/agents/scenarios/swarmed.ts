import type { Scenario } from "./scenario";

export const swarmed: Scenario = {
  name: "swarmed",
  description: "an agent with 1 hp picks a fight with six crabs, dies, and respawns",
  async run({ spawn, log, check }) {
    const agent = await spawn("Agent Unlucky");
    const room = agent.senses.roomName;
    await agent.cheat("/summon crab 6");
    await agent.cheat("/hp 1");

    const crab = agent.senses.npcsNear("crab")[0];
    check(!!crab, "six crabs are summoned around it");
    if (!crab) return;

    const outcome = await agent.fight(crab.id);
    log(`the fight ended: ${outcome}`);
    check(outcome === "died", "the fight ends when the agent dies, not on a timeout");
    check(agent.senses.isDead, "the agent knows it is dead");

    await agent.respawn();
    check(!agent.senses.isDead, "after respawning it is alive again");
    log(`respawned in ${agent.senses.roomName} (was in ${room})`);
    await agent.cheat("/warp " + room);
    await agent.cheat("/despawn");
  },
};
