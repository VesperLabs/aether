import { rollLook } from "../look";
import { createRng } from "@/rules/world";
import type { Scenario } from "./scenario";

export const restyle: Scenario = {
  name: "restyle",
  description: "two bots roll their own looks on the character screen and come out different",
  async run({ spawn, log, check }) {
    const [a, b] = [await spawn("Bot Ada"), await spawn("Bot Bea")];
    const before = JSON.stringify(a.senses.hero?.profile);
    await a.restyle(rollLook(createRng(1)));
    await b.restyle(rollLook(createRng(2)));
    const looks = [a, b].map((bot) => {
      const { hair, face, tint, gender } = bot.senses.hero?.profile ?? {};
      return { hair, face, tint, gender };
    });
    log(looks.map((l) => JSON.stringify(l)).join(" vs "));
    check(JSON.stringify(a.senses.hero?.profile) !== before, "the server shows the new look");
    check(JSON.stringify(looks[0]) !== JSON.stringify(looks[1]), "the two bots look different");
    check(a.senses.hero?.profile?.userName === "Bot Ada", "restyling keeps its name");
  },
};
