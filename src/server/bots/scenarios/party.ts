import type { Scenario } from "../scenario";

export const party: Scenario = {
  name: "party",
  description: "three bots form a party, the leader changes room, one bot leaves",
  async run({ spawn, log, check }) {
    const leader = await spawn("Bot Leader");
    const second = await spawn("Bot Two");
    const third = await spawn("Bot Three");

    const partyId = await leader.inviteToParty(second);
    check((await leader.inviteToParty(third)) === partyId, "both bots join the leader's party");

    const from = leader.roomName;
    const to = from === "town" ? "grassland" : "town";
    log(`leader warps from ${from} to ${to}`);
    const heard = second.waitFor(
      "partyUpdate",
      (u) => !!u.party?.members.some((m) => m.id === leader.id && m.roomName === to),
    );
    await leader.cheat(`/warp ${to}`);
    check(!!(await heard.catch(() => null)), "party members hear the leader changed room");

    const left = second.waitFor(
      "partyUpdate",
      (u) => !u.party?.members.some((m) => m.id === third.id),
    );
    third.send("partyLeave");
    check(!!(await left.catch(() => null)), "party members hear a bot left");
  },
};
