import type { MobKilledEvent } from "../events";
import type { GameEventBus } from "../world";
import { pickPreferredDrop, rollMobDrops } from "./rules";
import type { DropRef, DropTableEntry, LootItem, LootSpawn, Rng } from "./rules";

/** What loot needs to know about a mob beyond the event: its own drop table. */
interface MobDropInfo {
  drops?: DropTableEntry[];
  noWorldDrops?: boolean;
}

/** How the host game plugs into loot (the rules hold no state and do no I/O). */
export interface LootHooks {
  rng: Rng;
  /** Rolls the world drop for (mob level, magic find). */
  rollWorldDrop: (mobLevel: number, magicFind: number) => DropRef | null;
  buildItem: (ref: DropRef) => LootItem | null;
  /** The mob that died, if the host still knows it. */
  getMobDropInfo: (mobId: string) => MobDropInfo | undefined;
  /** Puts a drop on the ground. */
  spawnLoot: (roomName: string, spawn: LootSpawn) => void;
}

/** The drop for one kill, or null if nothing dropped. */
function lootForMobKill(
  kill: MobKilledEvent,
  mob: MobDropInfo | undefined,
  hooks: Pick<LootHooks, "rng" | "rollWorldDrop" | "buildItem">,
): LootSpawn | null {
  const refs = rollMobDrops(
    {
      mobLevel: kill.mobLevel,
      magicFind: kill.killerMagicFind,
      noWorldDrops: mob?.noWorldDrops,
      drops: mob?.drops,
    },
    hooks.rng,
    hooks.rollWorldDrop,
  );
  const built = refs.map(hooks.buildItem).filter((item): item is LootItem => !!item);
  const item = pickPreferredDrop(built);
  if (!item) return null;
  return {
    x: kill.x,
    y: kill.y,
    item,
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
