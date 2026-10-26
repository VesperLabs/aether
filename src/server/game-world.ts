import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  ILVL_MULTIPLIER,
  ItemBuilder,
  QuestBuilder,
  keepers,
  mapList,
  nasties,
} from "@/shared/content";
import type { TiledMapJson } from "@/shared/rules/movement";
import { subscribeLoot, type LootItem } from "@/shared/rules/loot";
import { subscribeQuests } from "@/shared/rules/quests";
import { getBaseStats, mergeAndAddValues, subscribeStats } from "@/shared/rules/stats";
import { addRoom, createRoom, createWorld } from "@/shared/rules/world";
import { spawnLoot } from "./loot-adapter";
import { Npc } from "./npc";

/* Find NPCs in data lists, and add `kind` to them */
function getNpcFromLists(name: string) {
  if (Object.keys(keepers).includes(name)) return { ...keepers[name], kind: "keeper" };
  if (Object.keys(nasties).includes(name)) return { ...nasties[name], kind: "nasty" };
}

/** Puts every NPC the map places into the world. */
function spawnNpcs(world: ServerWorld, room: Room) {
  for (const { name, x, y, properties = [] } of room.map.objects.Npcs ?? []) {
    const npc = getNpcFromLists(name);
    if (!npc) {
      console.log(`❌ Map npc "${name}" is broken or not found in ${room.name}`);
      continue;
    }
    const baseLevel = npc?.baseStats?.level;
    const baseStats = getBaseStats({ level: baseLevel, charClass: npc?.charClass });

    // remove level so it does not get added twice
    const { level: _level, ...npcBaseStats } = {
      ...baseStats,
      maxHp: 0,
      maxMp: 0,
      maxDamage: baseStats.maxDamage + 1,
      minDamage: baseStats.minDamage + 1,
      walkSpeed: baseStats.walkSpeed - 30,
      intelligence: baseStats.intelligence + baseLevel * 2,
      strength: baseStats.strength + baseLevel * 2,
      dexterity: baseStats.dexterity + baseLevel * 2,
      vitality: baseStats.vitality + baseLevel * 5,
    };

    const id = crypto.randomUUID();
    world.npcs[id] = new Npc(world, {
      id,
      room,
      ...npc,
      //need to merge these keys together, but add their values
      baseStats: mergeAndAddValues(npcBaseStats, npc?.baseStats),
      name,
      kind: npc?.kind,
      x,
      y,
      state: {
        ...npc.state,
        ...Object.fromEntries(properties.map((p) => [p.name, p.value])),
      },
      startingCoords: { x: npc?.x, y: npc?.y },
    }) as unknown as Npc;
  }
}

const readMap = (file: string): TiledMapJson =>
  JSON.parse(fs.readFileSync(path.resolve(process.env.PUBLIC_DIR || "public", file), "utf8"));

/** The game world with every map loaded, its NPCs spawned and the event subscribers wired up. */
export function createServerWorld({ io, db }: { io: any; db: any }): ServerWorld {
  const world = createWorld(QuestBuilder.buildAllQuests()) as ServerWorld;
  world.io = io;
  world.db = db;

  for (const asset of mapList as readonly MapAsset[]) {
    addRoom(world, createRoom(asset.name, readMap(asset.json), Date.now()));
  }
  for (const room of Object.values(world.rooms)) spawnNpcs(world, room);

  subscribeStats(world.events, (characterId, amount) => {
    world.players[characterId]?.assignExp(amount);
  });
  subscribeQuests(world.events, (characterId, mobName) => {
    world.players[characterId]?.addNpcKill(mobName);
  });
  subscribeLoot(world.events, {
    rng: Math.random,
    ilvlMultiplier: ILVL_MULTIPLIER,
    rollWorldDrop: (ilvl, magicFind) => ItemBuilder.rollDrop(ilvl, magicFind),
    buildItem: (type, rarity, key) => ItemBuilder.buildItem(type, rarity, key) as LootItem | null,
    getMobDropInfo: (mobId) => {
      const npc = world.npcs[mobId];
      return npc && { drops: npc.drops, noWorldDrops: npc.state?.noWorldDrops };
    },
    spawnLoot: (roomName, spawn) => spawnLoot(world, roomName, spawn),
  });
  return world;
}
