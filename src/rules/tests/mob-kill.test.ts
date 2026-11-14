import { describe, expect, it } from "vitest";
import { actors, questList } from "@/content";
import { mobKilledEvents } from "../combat";
import { createLoot, subscribeLoot, type LootSpawn } from "../loot";
import { getPlayerQuestStatus, nextNpcKillCount, subscribeQuests } from "../quests";
import { createArena, createArenaCharacter } from "./scenario-arena";

const quest = { id: "hornet-hunting", objectives: [...questList["hornet-hunting"].objectives] };
const needed = quest.objectives[0].type === "bounty" ? quest.objectives[0].amount : 0;

/** A player with the hunting quest, a loot table that always drops, and a hornet to kill. */
function setup() {
  const arena = createArena();
  const { world } = arena;
  arena.addPlayer(createArenaCharacter("p1", 100, 100));
  const progress = {
    quests: [{ questId: quest.id, isCompleted: false }],
    npcKills: {} as Record<string, number>,
    inventory: [],
    abilities: {},
  };
  const spawned: Array<{ room: string; spawn: LootSpawn }> = [];
  const loots: ReturnType<typeof createLoot>[] = [];

  subscribeQuests(world.events, (_id, mobName) => {
    progress.npcKills[mobName] = nextNpcKillCount(progress.npcKills, mobName);
  });
  subscribeLoot(world.events, {
    rng: () => 0,
    rollWorldDrop: () => "crabClaw",
    buildItem: (ref) =>
      ({ id: "i1", slot: "stackable", rarity: "common", key: ref, amount: 1 }) as never,
    getMobDropInfo: () => ({}),
    spawnLoot: (room, spawn) => {
      spawned.push({ room, spawn });
      loots.push(
        createLoot(spawn, { id: `loot-${loots.length}`, roomName: room, now: arena.world.tick }),
      );
    },
  });

  const kill = (n: number) => {
    const hornet = actors.hornet;
    const killer = { id: "p1", level: 3, magicFind: 0 };
    for (let i = 0; i < n; i++) {
      const mob = {
        id: `h${i}`,
        name: "hornet",
        stats: { level: hornet.baseStats.level ?? 1 },
        x: 300 + i,
        y: 120,
      };
      for (const event of mobKilledEvents(killer, ["p1"], "arena", [mob]))
        world.events.emit("mobKilled", event);
    }
  };
  return { arena, progress, spawned, loots, kill };
}

describe("a mob dies", () => {
  it("drops loot where it died", () => {
    const { spawned, kill } = setup();
    kill(1);
    expect(spawned).toHaveLength(1);
    expect(spawned[0].room).toBe("arena");
    expect(spawned[0].spawn).toMatchObject({ x: 300, y: 120, npcId: "h0" });
  });

  it("advances the bounty quest until it is ready", () => {
    const { progress, kill } = setup();
    kill(needed - 1);
    expect(progress.npcKills.hornet).toBe(needed - 1);
    expect(getPlayerQuestStatus(progress, quest)?.isReady).toBe(false);

    kill(1);
    const status = getPlayerQuestStatus(progress, quest);
    expect(status?.objectives?.[0]).toMatchObject({ numKilled: needed, isReady: true });
    expect(status?.isReady).toBe(true);
  });

  it("is counted for nobody who is not a recipient", () => {
    const { arena, progress } = setup();
    const events = mobKilledEvents({ id: "p2", level: 1, magicFind: 0 }, [], "arena", [
      { id: "h", name: "hornet", stats: { level: 1 }, x: 0, y: 0 },
    ]);
    arena.world.events.emit("mobKilled", events[0]);
    expect(progress.npcKills.hornet).toBeUndefined();
  });
});
