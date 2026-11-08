/**
 * `virtual:map-loots`: which items each map spawns on the ground (its "Loots" layer), at their
 * best odds, read from the maps whenever the wiki builds or a map changes in dev. The wiki gets
 * just this list instead of loading every map.
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { mapList } from "../src/content/maps/map-list";

const VIRTUAL_ID = "virtual:map-loots";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

interface SpawnItem {
  type: string;
  rarity: string;
  key: string;
  /** "1 in N" odds. */
  chance: number;
}

interface TiledLayer {
  name?: string;
  objects?: { properties?: { value?: unknown }[] }[];
  layers?: TiledLayer[];
}

function lootObjects(layers: TiledLayer[] = []): NonNullable<TiledLayer["objects"]> {
  return layers.flatMap((layer) => [
    ...(layer.name === "Loots" ? (layer.objects ?? []) : []),
    ...lootObjects(layer.layers),
  ]);
}

function readAll(repoRoot: string) {
  const loots: Record<string, SpawnItem[]> = {};
  for (const map of [...mapList].sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(repoRoot, "public", map.json);
    if (!fs.existsSync(file)) continue;
    const tiled = JSON.parse(fs.readFileSync(file, "utf8")) as { layers?: TiledLayer[] };
    /* One entry per item, at the best odds any of its spots gives */
    const best = new Map<string, SpawnItem>();
    for (const object of lootObjects(tiled.layers)) {
      const items = JSON.parse(String(object.properties?.[0]?.value ?? "[]")) as SpawnItem[];
      for (const { type, rarity, key, chance } of items) {
        const id = `${type}/${rarity}/${key}`;
        const seen = best.get(id);
        if (!seen || chance < seen.chance) best.set(id, { type, rarity, key, chance });
      }
    }
    if (best.size) loots[map.name] = [...best.entries()].sort().map(([, item]) => item);
  }
  return loots;
}

/** Serves `virtual:map-loots`, and reloads it in dev when a map is saved. */
export function mapLootsPlugin(repoRoot: string): Plugin {
  const tilemaps = path.join(repoRoot, "public/assets/tilemaps");
  return {
    name: "map-loots",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      for (const map of mapList) this.addWatchFile(path.join(repoRoot, "public", map.json));
      return `export default ${JSON.stringify(readAll(repoRoot))};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(tilemaps)) return;
      const module = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (module) server.moduleGraph.invalidateModule(module);
    },
  };
}
