import { createResident } from "../brains";
import { rulePlanner, type Planner } from "../planner";
import type { Scenario } from "./scenario";

export const resident: Scenario = {
  name: "resident",
  description: "a resident brain is offered a crab and a player, chooses, and acts on its plans",
  async run({ spawn, live, log, check }) {
    const local = await spawn("Agent Resident");
    const visitor = await spawn("Agent Visitor");
    await visitor.cheat(`/tp ${Math.round(local.senses.x + 40)} ${Math.round(local.senses.y)}`);
    const appeared = local.waitFor("npcJoin");
    await local.cheat("/summon crab 1");
    const crab = await appeared;
    await local.cheat("/heal");

    /* Records every question, then decides like the rule planner (most urgent option first) */
    const asked: string[][] = [];
    const recording: Planner = (situation, question, options) => {
      asked.push(Object.keys(options));
      return rulePlanner(situation, question, options);
    };
    const greeted = visitor.waitFor("message", (m) => m?.type === "chat", 20000);
    /* A summoned crab respawns after it dies, so watch for its death rather than check later */
    const killed = local.waitFor(
      "assignDamage",
      (hits) => hits.some((h) => h.type === "death" && h.to === crab.id),
      12000,
    );

    await live(local, createResident(recording), 12000);
    log(`menus: ${asked.map((o) => o.join("/")).join(" → ")}`);
    check(asked[0]?.includes("hunt") === true, "it is offered the crab to hunt");
    check(!!(await killed.catch(() => null)), "it hunts the crab down");
    const hello = await greeted.catch(() => null);
    check(!!hello, `it greets the visitor${hello ? `: "${hello.message}"` : ""}`);

    await local.cheat("/despawn");
  },
};
