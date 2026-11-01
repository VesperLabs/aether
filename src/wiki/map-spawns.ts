import { mapList } from "@/content";
import { useEffect, useState } from "react";

/** Where each mob spawns and which spawns follow a leader, read from the map files. */
export interface MapSpawns {
  /** Mob key → the maps it is on, with how many spawn there. */
  foundIn: Record<string, { map: string; count: number }[]>;
  /** Leader key → mob key → how many of them follow it. */
  followers: Record<string, Record<string, number>>;
}

interface TiledNpc {
  name: string;
  properties?: { name: string; value: unknown }[];
}

/** "grassland-peaks-3" → "Grassland Peaks 3". */
const mapTitle = (name: string) =>
  name.replace(
    /(^|-)(\w)/g,
    (_, dash: string, letter: string) => `${dash ? " " : ""}${letter.toUpperCase()}`,
  );

async function loadSpawns(): Promise<MapSpawns> {
  const spawns: MapSpawns = { foundIn: {}, followers: {} };
  const maps = await Promise.all(
    mapList.map(async ({ name, json }) => {
      const map = (await (await fetch(json)).json()) as {
        layers: { name: string; objects?: TiledNpc[] }[];
      };
      return { name, npcs: map.layers.find((layer) => layer.name === "Npcs")?.objects ?? [] };
    }),
  );
  for (const { name, npcs } of maps) {
    const counts: Record<string, number> = {};
    for (const npc of npcs) {
      counts[npc.name] = (counts[npc.name] ?? 0) + 1;
      const leader = npc.properties?.find((property) => property.name === "leader")?.value;
      if (typeof leader === "string") {
        const pack = (spawns.followers[leader] ??= {});
        pack[npc.name] = (pack[npc.name] ?? 0) + 1;
      }
    }
    for (const [mob, count] of Object.entries(counts)) {
      (spawns.foundIn[mob] ??= []).push({ map: mapTitle(name), count });
    }
  }
  return spawns;
}

let loading: Promise<MapSpawns> | undefined;

/** The spawn data, loaded once for the whole wiki. Undefined until the maps arrive. */
export function useMapSpawns(): MapSpawns | undefined {
  const [spawns, setSpawns] = useState<MapSpawns>();
  useEffect(() => {
    let live = true;
    loading ??= loadSpawns();
    loading.then((data) => live && setSpawns(data)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return spawns;
}
