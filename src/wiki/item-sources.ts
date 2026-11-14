import mapLoots from "virtual:map-loots";
import {
  actors,
  mapTitle,
  questList,
  readRef,
  type ActorDefinition,
  type AnyItemRef,
} from "@/content";

/**
 * Where a player can get an item: monsters that drop it, keepers that sell it, quests that give
 * it, and maps that spawn it on the ground.
 */
export interface ItemSources {
  drops: { name: string; chance: number; race?: string; tint?: string }[];
  sellers: string[];
  quests: string[];
  spawns: { map: string; chance: number }[];
}

/** Every item's sources, by item key. Built once from the content. */
const SOURCES = new Map<string, ItemSources>();

const sourcesOf = (ref: AnyItemRef) => {
  const { key } = readRef(ref);
  let sources = SOURCES.get(key);
  if (!sources) {
    sources = { drops: [], sellers: [], quests: [], spawns: [] };
    SOURCES.set(key, sources);
  }
  return sources;
};

for (const actor of Object.values(actors as Record<string, ActorDefinition>)) {
  for (const drop of actor.drops ?? []) {
    sourcesOf(drop.item).drops.push({
      name: actor.profile.userName,
      chance: drop.chance,
      race: actor.profile.race,
      tint: actor.profile.tint,
    });
  }
  for (const entry of actor.shop ?? []) {
    sourcesOf(entry.item).sellers.push(actor.profile.userName);
  }
}

for (const quest of Object.values(questList)) {
  for (const item of (quest as { rewards?: { items: readonly AnyItemRef[] } }).rewards?.items ??
    []) {
    sourcesOf(item).quests.push(quest.name);
  }
}

for (const [map, items] of Object.entries(mapLoots)) {
  for (const item of items) {
    sourcesOf(item.key).spawns.push({
      map: mapTitle(map),
      chance: item.chance,
    });
  }
}

/** Where to get the item `key`, or `undefined` when nothing in the game gives it. */
export function itemSources(key: string): ItemSources | undefined {
  return SOURCES.get(key);
}
