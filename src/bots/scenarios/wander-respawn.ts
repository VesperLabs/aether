import { wander } from "../brains";
import type { Scenario } from "./scenario";

export const wanderRespawn: Scenario = {
  name: "wander-respawn",
  description: "a wandering bot killed by a player gets back up and carries on wandering",
  async run({ spawn, live, clock, check }) {
    const wanderer = await spawn("Bot Wanderer");
    const killer = await spawn("Bot Killer");
    await wanderer.cheat("/hp 1");

    const died = wanderer.waitFor("assignDamage", (hits) =>
      hits.some((h) => h.type === "death" && h.to === wanderer.id),
    );
    const respawned = died.then(() => wanderer.waitFor("heroInit", () => true, 10000));
    /* The killer chases it down while it wanders */
    const hunting = (async () => {
      while (!wanderer.senses.isDead) {
        const { x, y } = wanderer.senses;
        await killer.cheat(`/tp ${Math.round(x + 15)} ${Math.round(y)}`);
        await killer.attackToward(x, y);
      }
    })();

    await live(wanderer, wander, 15000);
    await hunting;
    check(!!(await died.catch(() => null)), "the killer kills it");
    check(!!(await respawned.catch(() => null)), "it respawns on its own");
    const { x, y } = wanderer.senses;
    await live(wanderer, wander, 5000);
    await clock.sleep(200);
    check(
      !wanderer.senses.isDead && Math.hypot(wanderer.senses.x - x, wanderer.senses.y - y) > 0,
      "it carries on wandering",
    );
  },
};
