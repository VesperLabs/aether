import type { Scenario } from "./scenario";

export const swarmed: Scenario = {
  name: "swarmed",
  description: "a bot with 1 hp picks a fight with six crabs, dies, and respawns",
  async run({ spawn, log, check }) {
    const bot = await spawn("Bot Unlucky");
    const room = bot.senses.roomName;
    await bot.cheat("/summon crab 6");
    await bot.cheat("/hp 1");

    const crab = bot.senses.npcsNear("crab")[0];
    check(!!crab, "six crabs are summoned around it");
    if (!crab) return;

    const outcome = await bot.fight(crab.id);
    log(`the fight ended: ${outcome}`);
    check(outcome === "died", "the fight ends when the bot dies, not on a timeout");
    check(bot.senses.isDead, "the bot knows it is dead");

    await bot.respawn();
    check(!bot.senses.isDead, "after respawning it is alive again");
    log(`respawned in ${bot.senses.roomName} (was in ${room})`);
    await bot.cheat("/warp " + room);
    await bot.cheat("/despawn");
  },
};
