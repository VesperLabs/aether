import type { ServerWorld } from "./server-world";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ILVL_MULTIPLIER, ItemBuilder, QuestBuilder, keepers, mapList, nasties } from "@/content";
import type { TiledMapJson } from "@/rules/movement";
import { subscribeLoot, type LootItem } from "@/rules/loot";
import { subscribeThreat } from "@/rules/npc-behavior";
import { subscribeQuests } from "@/rules/quests";
import { npcBaseStats, subscribeStats } from "@/rules/stats";
import { addRoom, createRoom, createWorld } from "@/rules/world";
import { spawnLoot } from "./loot-adapter";
import { subscribeNpcMessages } from "./npc-messages";
import { Npc, type NpcDefinition } from "./npc";
import type { GameIo } from "@/network";
import type { Database } from "./persistence/database";

/* Find NPCs in data lists, and add `kind` to them */
function getNpcFromLists(name: string): NpcDefinition | undefined {
  if (Object.keys(keepers).includes(name)) {
    /* Flavour text is for the wiki; spawned keepers don't carry it. */
    const { flavor: _flavor, ...keeper } = keepers[name as keyof typeof keepers];
    return { ...(keeper as NpcDefinition), kind: "keeper" };
  }
  if (Object.keys(nasties).includes(name)) {
    /* Flavour text is for the wiki; spawned monsters don't carry it. */
    const { flavor: _flavor, ...nasty } = nasties[name as keyof typeof nasties];
    return { ...(nasty as NpcDefinition), kind: "nasty" };
  }
}

/** Puts every NPC the map places into the world. */
function spawnNpcs(world: ServerWorld, room: Room) {
  for (const { name, x, y, properties = [] } of room.map.objects.Npcs ?? []) {
    const npc = getNpcFromLists(name);
    if (!npc) {
      console.log(`❌ Map npc "${name}" is broken or not found in ${room.name}`);
      continue;
    }

    const id = crypto.randomUUID();
    world.npcs[id] = new Npc(world, {
      id,
      room,
      ...npc,
      //need to merge these keys together, but add their values
      baseStats: npcBaseStats(npc),
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
export function createServerWorld({ io, db }: { io: GameIo; db: Database }): ServerWorld {
  const world = createWorld(QuestBuilder.buildAllQuests()) as ServerWorld;
  world.io = io;
  world.db = db;

  for (const asset of mapList) {
    addRoom(world, createRoom(asset.name, readMap(asset.json), Date.now()));
  }
  for (const room of Object.values(world.rooms)) spawnNpcs(world, room);

  subscribeNpcMessages(world.events, io);
  subscribeThreat(world.events, (victimId, attackerSocketId, amount) => {
    world.npcs[victimId]?.addThreat(attackerSocketId, amount);
  });
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
