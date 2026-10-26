import type { MobKilledEvent } from "../events";
import type { GameEventBus } from "../world";
import { rollMobDrop } from "./rules";
import type { DropCandidate, DropTableEntry, LootItem, LootSpawn, Rng } from "./rules";

/** What loot needs to know about a mob beyond the event: its own drop table. */
export interface MobDropInfo {
  drops?: DropTableEntry[];
  noWorldDrops?: boolean;
}

/** How the host game plugs into loot (the rules hold no state and do no I/O). */
export interface LootHooks {
  rng: Rng;
  /** Multiplier from item level to mob level. */
  ilvlMultiplier: number;
  /** Rolls the world drop for (item level, magic find). */
  rollWorldDrop: (ilvl: number, magicFind: number) => DropCandidate | null;
  buildItem: (type: string, rarity: string, key: string) => LootItem | null;
  /** The mob that died, if the host still knows it. */
  getMobDropInfo: (mobId: string) => MobDropInfo | undefined;
  /** Puts a drop on the ground. */
  spawnLoot: (roomName: string, spawn: LootSpawn) => void;
}

/** The drop for one kill, or null if nothing dropped. */
export function lootForMobKill(
  kill: MobKilledEvent,
  mob: MobDropInfo | undefined,
  hooks: Pick<LootHooks, "rng" | "ilvlMultiplier" | "rollWorldDrop" | "buildItem">,
): LootSpawn | null {
  const candidate = rollMobDrop(
    {
      mobLevel: kill.mobLevel,
      magicFind: kill.killerMagicFind,
      noWorldDrops: mob?.noWorldDrops,
      drops: mob?.drops,
      ilvlMultiplier: hooks.ilvlMultiplier,
    },
    hooks.rng,
    hooks.rollWorldDrop,
  );
  if (!candidate) return null;
  return {
    x: kill.x,
    y: kill.y,
    item: hooks.buildItem(candidate.type, candidate.rarity, candidate.key),
    npcId: kill.mobId,
  };
}

/** Loot reacts to `mobKilled`: the mob may drop an item where it died. Returns an unsubscribe function. */
export function subscribeLoot(bus: GameEventBus, hooks: LootHooks): () => void {
  return bus.on("mobKilled", (kill) => {
    const spawn = lootForMobKill(kill, hooks.getMobDropInfo(kill.mobId), hooks);
    if (spawn) hooks.spawnLoot(kill.roomName, spawn);
  });
}
