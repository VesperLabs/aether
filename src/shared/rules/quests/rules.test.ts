import { describe, expect, it } from "vitest";
import {
  acceptQuest,
  completeQuest,
  findAbilityQuestItem,
  findBagQuestItem,
  findInventoryQuestItem,
  getPlayerQuestStatus,
  getPlayerQuests,
  markKeeperObjectivesReady,
  nextNpcKillCount,
  type QuestDefinition,
  type QuestProgressInput,
} from "./rules";

const claw = ["stackable", "common", "crabClaw"];
const clawItem = (amount: number, id = "claw") => ({
  id,
  slot: "stackable",
  rarity: "common",
  key: "crabClaw",
  amount,
});

const bounty: QuestDefinition = {
  id: "crabs",
  objectives: [{ type: "bounty", monster: "crab", amount: 3 }],
  rewards: { exp: 25, gold: 5, items: [{ id: "gloves" }] },
};
const collect: QuestDefinition = {
  id: "claws",
  objectives: [{ type: "item", item: claw, amount: 30 }],
  rewards: { exp: 25, gold: 5 },
};
const chat: QuestDefinition = {
  id: "tudwick",
  objectives: [{ type: "chat", keeper: "tudwick" }],
};

const progress = (overrides: Partial<QuestProgressInput> = {}): QuestProgressInput => ({
  quests: [],
  npcKills: {},
  inventory: [],
  abilities: {},
  ...overrides,
});

describe("finding quest items", () => {
  it("matches slot, rarity and key in the inventory, bags and abilities", () => {
    const loose = clawItem(2);
    const bagged = clawItem(4, "bagged");
    const ability = clawItem(6, "ability");
    expect(findInventoryQuestItem([null, loose], claw)).toBe(loose);
    expect(findInventoryQuestItem([{ ...loose, key: "other" }], claw)).toBeUndefined();
    expect(findBagQuestItem([{ base: "bag", items: [null, bagged] }], claw)).toBe(bagged);
    expect(findBagQuestItem([loose], claw)).toBeNull();
    expect(findAbilityQuestItem({ a: null, b: ability }, claw)).toBe(ability);
    expect(findAbilityQuestItem({ a: null }, claw)).toBeNull();
  });
});

describe("getPlayerQuestStatus", () => {
  it("is null until the quest is accepted", () => {
    expect(getPlayerQuestStatus(progress(), bounty)).toBeNull();
  });

  it("counts kills for bounty objectives", () => {
    const quests = [{ questId: "crabs" }];
    expect(getPlayerQuestStatus(progress({ quests, npcKills: { crab: 2 } }), bounty)).toMatchObject(
      {
        isReady: undefined,
        objectives: [{ numKilled: 2, isReady: false, objectiveId: 0 }],
      },
    );
    expect(getPlayerQuestStatus(progress({ quests, npcKills: { crab: 3 } }), bounty)?.isReady).toBe(
      true,
    );
  });

  it("counts a carried item for item objectives, wherever it is", () => {
    const quests = [{ questId: "claws" }];
    const status = (p: Partial<QuestProgressInput>) =>
      getPlayerQuestStatus(progress({ quests, ...p }), collect);
    expect(status({ inventory: [clawItem(30)] })?.isReady).toBe(true);
    expect(status({ inventory: [{ base: "bag", items: [clawItem(30)] }] })?.isReady).toBe(true);
    expect(status({ abilities: { a: clawItem(29) } })).toMatchObject({
      isReady: undefined,
      objectives: [{ numCollected: 29 }],
    });
  });

  it("is ready when the record says so, and reports completion", () => {
    const status = getPlayerQuestStatus(
      progress({ quests: [{ questId: "tudwick", isReady: true, isCompleted: true }] }),
      chat,
    );
    expect(status).toMatchObject({ isReady: true, isCompleted: true });
  });
});

describe("getPlayerQuests", () => {
  it("adds the quest's rewards to each status", () => {
    const quests = getPlayerQuests(progress({ quests: [{ questId: "crabs" }] }), {
      crabs: bounty,
    });
    expect(quests).toHaveLength(1);
    expect(quests[0]).toMatchObject({ questId: "crabs", rewards: bounty.rewards });
    expect(getPlayerQuests(progress(), { crabs: bounty })).toEqual([]);
  });
});

describe("acceptQuest", () => {
  it("returns a new record only when the player does not have the quest", () => {
    expect(acceptQuest(progress(), "crabs")).toEqual({ questId: "crabs", isCompleted: false });
    expect(acceptQuest(progress({ quests: [{ questId: "crabs" }] }), "crabs")).toBeNull();
  });
});

describe("markKeeperObjectivesReady", () => {
  it("readies unfinished quests that name the keeper", () => {
    const quests = [
      { questId: "tudwick" },
      { questId: "tudwick", isCompleted: true },
      { questId: "crabs" },
    ];
    const result = markKeeperObjectivesReady(quests, { tudwick: chat, crabs: bounty }, "tudwick");
    expect(result[0]).toEqual({ questId: "tudwick", isReady: true });
    expect(result[1]).toBe(quests[1]);
    expect(result[2]).toBe(quests[2]);
  });
});

describe("nextNpcKillCount", () => {
  it("starts at 1 and counts up", () => {
    expect(nextNpcKillCount({}, "crab")).toBe(1);
    expect(nextNpcKillCount({ crab: 4 }, "crab")).toBe(5);
  });
});

describe("completeQuest", () => {
  const ready = { isReady: true, isCompleted: false };
  const input = (overrides: Partial<Parameters<typeof completeQuest>[0]> = {}) => ({
    status: ready,
    quest: bounty,
    inventory: [],
    maxInventoryItems: 4,
    ...overrides,
  });

  it("refuses quests that are done, unfinished or not accepted", () => {
    expect(completeQuest(input({ status: { isReady: true, isCompleted: true } })).error).toBe(
      "Quest has already been completed.",
    );
    expect(completeQuest(input({ status: { isReady: false, isCompleted: false } })).error).toBe(
      "Quest objectives are not complete.",
    );
    expect(completeQuest(input({ status: null })).error).toBe("Quest objectives are not complete.");
  });

  it("returns the reward and the items to remove", () => {
    const result = completeQuest(input({ quest: { ...bounty, objectives: collect.objectives } }));
    expect(result).toEqual({
      itemsToAdd: [{ id: "gloves" }],
      itemsToRemove: [{ itemId: "crabClaw", amount: 30 }],
      exp: 25,
      gold: 5,
    });
  });

  it("gives no gold when the quest has none", () => {
    expect(completeQuest(input({ quest: chat })).gold).toBe(0);
  });

  it("fails when the reward does not fit, still handing out the items that did", () => {
    const quest = { ...bounty, rewards: { exp: 1, items: [{ id: "a" }, null, { id: "b" }] } };
    const inventory = [{ id: "x" }, { id: "y" }, { id: "z" }];
    const result = completeQuest(input({ quest, inventory }));
    expect(result.error).toBe("Cannot turn in quest. Inventory is full");
    expect(result.itemsToAdd).toEqual([{ id: "a" }]);
  });

  it("reuses empty slots before growing the inventory", () => {
    const inventory = [{ id: "x" }, null, { id: "y" }, { id: "z" }];
    expect(completeQuest(input({ inventory })).error).toBeUndefined();
  });
});
