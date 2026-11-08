import type { ServerWorld } from "./server-world";
import {
  ILVL_MULTIPLIER,
  ItemBuilder,
  QuestBuilder,
  actors,
  isActorId,
  mapList,
  type Dice,
} from "@/content";
import { createServerDice } from "./server-dice";
import { readMapFile } from "./map-files";
import { subscribeLoot, type LootItem } from "@/rules/loot";
import { subscribeThreat } from "@/rules/npc-behavior";
import { subscribeQuests } from "@/rules/quests";
import { npcBaseStats, subscribeStats } from "@/rules/stats";
import { addRoom, createRoom, createWorld } from "@/rules/world";
import { createTickHealth } from "./tick-health";
import { spawnLoot } from "./loot-adapter";
import { subscribeNpcMessages } from "./npc-messages";
import { subscribeKnockbackMessages, subscribePoseForgetting } from "./net/handlers/movement";
import { subscribeDebugMessages } from "./debug-messages";
import { Npc, type NpcDefinition } from "./npc";
import { subscribeCompanions } from "./companions";
import { DEFAULT_SERVER_FPS, createNetIds, type GameIo } from "@/network";
import type { Database } from "./persistence/database";

/** An actor's content, ready to place. Flavour text is for the wiki; spawned actors don't carry it. */
function getActorDefinition(name: string): NpcDefinition | undefined {
  if (!isActorId(name)) return;
  const { flavor: _flavor, ...actor } = actors[name];
  return actor as NpcDefinition;
}

/** Puts every NPC the map places into the world. */
function spawnNpcs(world: ServerWorld, room: Room) {
  for (const placed of room.map.objects.Npcs ?? []) {
    if (!spawnNpc(world, room, placed)) {
      console.log(`❌ Map npc "${placed.name}" is broken or not found in ${room.name}`);
    }
  }
}

/** Puts one actor into a room. Returns undefined when no actor has that name. */
export function spawnNpc(
  world: ServerWorld,
  room: Room,
  {
    name,
    x,
    y,
    properties = [],
  }: { name: string; x: number; y: number; properties?: { name: string; value: unknown }[] },
): Npc | undefined {
  const npc = getActorDefinition(name);
  if (!npc) return;
  const id = world.dice.newId();
  world.npcs[id] = new Npc(world, {
    id,
    room,
    ...npc,
    //need to merge these keys together, but add their values
    baseStats: npcBaseStats(npc),
    name,
    kind: "npc",
    x,
    y,
    state: {
      ...npc.state,
      ...Object.fromEntries(properties.map((p) => [p.name, p.value])),
    },
    startingCoords: { x: npc?.x, y: npc?.y },
  }) as unknown as Npc;
  world.npcs[id].nid = world.netIds.take(id);
  return world.npcs[id];
}

/** The game world with every map loaded, its NPCs spawned and the event subscribers wired up. */
export function createServerWorld({
  io,
  db,
  now,
  dice = createServerDice(),
  mapNpcs = true,
}: {
  io: GameIo;
  db: Database;
  now: () => number;
  /** Every roll and id in the world; pass seeded dice to replay a run exactly. */
  dice?: Dice;
  /** Whether to spawn the NPCs the maps place. Simulations turn this off for a controlled world. */
  mapNpcs?: boolean;
}): ServerWorld {
  const world = createWorld(QuestBuilder.buildAllQuests(dice)) as ServerWorld;
  world.io = io;
  world.db = db;
  world.now = now;
  world.netIds = createNetIds();
  world.observers = new Set();
  world.dice = dice;
  world.rng = dice.random;
  world.tickHealth = createTickHealth(1000 / DEFAULT_SERVER_FPS);

  for (const asset of mapList) {
    addRoom(world, createRoom(asset.name, readMapFile(asset.json), now()));
  }
  if (mapNpcs) for (const room of Object.values(world.rooms)) spawnNpcs(world, room);

  subscribeNpcMessages(world.events, io);
  subscribeKnockbackMessages(world.events, world);
  subscribePoseForgetting(world.events, world);
  subscribeDebugMessages(world.events, io);
  subscribeThreat(world.events, (victimId, attackerId, amount) => {
    world.npcs[victimId]?.addThreat(attackerId, amount);
  });
  subscribeCompanions(world.events, world);
  subscribeStats(world.events, (characterId, amount) => {
    world.players[characterId]?.assignExp(amount);
  });
  subscribeQuests(world.events, (characterId, mobName) => {
    world.players[characterId]?.addNpcKill(mobName);
  });
  subscribeLoot(world.events, {
    rng: world.rng,
    ilvlMultiplier: ILVL_MULTIPLIER,
    rollWorldDrop: (ilvl, magicFind) => ItemBuilder.rollDrop(dice, ilvl, magicFind),
    buildItem: (type, rarity, key) =>
      ItemBuilder.buildItem(dice, type, rarity, key) as LootItem | null,
    getMobDropInfo: (mobId) => {
      const npc = world.npcs[mobId];
      return npc && { drops: npc.drops, noWorldDrops: npc.state?.noWorldDrops };
    },
    spawnLoot: (roomName, spawn) => spawnLoot(world, roomName, spawn),
  });
  return world;
}
