import { describe, expect, it } from "vitest";
import { countKeeperQuestsToAct, countQuestsToTurnIn } from "./quest-badges";

const hero = [
  { questId: "a", isReady: true, isCompleted: false },
  { questId: "b", isReady: false, isCompleted: false },
  { questId: "c", isReady: true, isCompleted: true },
];

describe("quest badges", () => {
  it("counts only ready, unfinished quests to turn in", () => {
    expect(countQuestsToTurnIn(hero)).toBe(1);
    expect(countQuestsToTurnIn(undefined)).toBe(0);
  });

  it("counts a keeper's new and ready quests, not ones in progress or done", () => {
    const keeper = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(countKeeperQuestsToAct(keeper, hero)).toBe(2);
  });
});
