import type { Scenario } from "./scenario";

const POTION = "smallHpPotion";

export const potionSpam: Scenario = {
  name: "potion-spam",
  description: "a bot drinks two potions back to back; the cooldown should stop the second",
  knownIssue: 140,
  async run({ spawn, log, check }) {
    const bot = await spawn("Agent Drinker");
    await bot.cheat(`/give ${POTION} 10`);
    await bot.cheat("/hp 1");

    const potions = () =>
      bot.senses.hero?.inventory?.find((i: { key?: string } | null) => i?.key === POTION);
    const potion = potions();
    check(!!potion, "the bot has potions");
    if (!potion) return;
    const before = potion.amount ?? 0;

    for (let i = 0; i < 2; i++) {
      bot.consume(potion.id);
    }
    await bot.sync();
    const after = potions()?.amount ?? 0;
    log(`potions ${before} → ${after}`);
    check(before - after === 1, "only one potion is used while the cooldown runs");
  },
};
