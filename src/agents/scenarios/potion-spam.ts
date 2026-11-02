import { POTION_COOLDOWN } from "@/rules/combat";
import type { Scenario } from "./scenario";

const POTION = "smallHpPotion";

export const potionSpam: Scenario = {
  name: "potion-spam",
  description: "an agent drinks two potions back to back; the cooldown should stop the second",
  async run({ spawn, clock, log, check }) {
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

    await clock.sleep(POTION_COOLDOWN);
    bot.consume(potion.id);
    await bot.sync();
    const later = potions()?.amount ?? 0;
    check(after - later === 1, "once the cooldown is over, the next potion works");
  },
};
