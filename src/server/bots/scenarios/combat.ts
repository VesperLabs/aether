import type { Scenario } from "../scenario";

export const combat: Scenario = {
  name: "combat",
  description: "a party of two summons a crab, one kills it, both get experience",
  async run({ spawn, log, check }) {
    const fighter = await spawn("Bot Fighter");
    const buddy = await spawn("Bot Buddy");
    await fighter.inviteToParty(buddy);
    await buddy.cheat(`/tp ${Math.round(fighter.x)} ${Math.round(fighter.y)}`);

    const appeared = fighter.waitFor("npcJoin");
    await fighter.cheat("/summon crab 1");
    const crab = await appeared;
    check(!!crab?.id, "a summoned crab appears for the bots");

    const killed = await fighter.fight(crab.id);
    check(killed, "the fighter kills the crab");
    check(buddy.room.characters.get(crab.id)?.isDead === true, "the buddy sees it die");

    await buddy.sync();
    log(`fighter gained ${fighter.expGained} exp, buddy ${buddy.expGained}`);
    check(fighter.expGained > 0, "the fighter gets experience");
    check(buddy.expGained > 0, "the party member shares the kill experience");

    await fighter.cheat("/despawn");
  },
};
