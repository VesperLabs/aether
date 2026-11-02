import type { Scenario } from "./scenario";

export const combat: Scenario = {
  name: "combat",
  description: "a party of two summons a crab, one kills it, both get experience",
  async run({ spawn, log, check }) {
    const fighter = await spawn("Agent Fighter");
    const buddy = await spawn("Agent Buddy");
    await fighter.inviteToParty(buddy);
    await buddy.cheat(`/tp ${Math.round(fighter.senses.x)} ${Math.round(fighter.senses.y)}`);

    const appeared = fighter.waitFor("npcJoin");
    await fighter.cheat("/summon crab 1");
    const crab = await appeared;
    check(!!crab?.id, "a summoned crab appears for the bots");

    const killed = await fighter.fight(crab.id);
    check(killed, "the fighter kills the crab");
    check(buddy.senses.characters.get(crab.id)?.isDead === true, "the buddy sees it die");

    await buddy.sync();
    log(`fighter gained ${fighter.senses.expGained} exp, buddy ${buddy.senses.expGained}`);
    check(fighter.senses.expGained > 0, "the fighter gets experience");
    check(buddy.senses.expGained > 0, "the party member shares the kill experience");

    await fighter.cheat("/despawn");
  },
};
