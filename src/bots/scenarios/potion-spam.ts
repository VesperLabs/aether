import { POTION_COOLDOWN } from "@/rules/combat";
import type { InventoryItem } from "@/rules/inventory";
import type { Scenario } from "./scenario";

const POTION = "smallHpPotion";

export const potionSpam: Scenario = {
  name: "potion-spam",
  description: "a bot drinks two potions back to back; the cooldown should stop the second",
  async run({ spawn, clock, log, check }) {
    const bot = await spawn("Bot Drinker");
    await bot.cheat(`/give ${POTION} 10`);
    await bot.cheat("/hp 1");

    const inventory = (): (InventoryItem | null)[] => bot.senses.hero?.inventory ?? [];
    const potions = () => inventory().find((item) => item?.key === POTION);
    const potion = potions();
    check(!!potion?.id, "the bot has potions");
    if (!potion?.id) return;
    const { id } = potion;
    const before = Number(potion.amount ?? 0);

    for (let i = 0; i < 2; i++) {
      bot.consume(id);
    }
    await bot.sync();
    const after = Number(potions()?.amount ?? 0);
    log(`potions ${before} → ${after}`);
    check(before - after === 1, "only one potion is used while the cooldown runs");

    await clock.sleep(POTION_COOLDOWN);
    bot.consume(id);
    await bot.sync();
    const later = Number(potions()?.amount ?? 0);
    check(after - later === 1, "once the cooldown is over, the next potion works");
  },
};
