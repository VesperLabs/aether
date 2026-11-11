import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapList } from "./map-list";

const TILEMAPS = "public/assets/tilemaps";

interface TiledProperty {
  readonly name: string;
  readonly value: unknown;
}
interface TiledObject {
  readonly name: string;
  readonly properties?: readonly TiledProperty[];
}
interface TiledMap {
  readonly layers: readonly { readonly name: string; readonly objects?: readonly TiledObject[] }[];
}

const readMap = (file: string): TiledMap => JSON.parse(readFileSync(`${TILEMAPS}/${file}`, "utf8"));
const property = (object: TiledObject, name: string) =>
  object.properties?.find((candidate) => candidate.name === name)?.value;
const doorsOf = (map: TiledMap) =>
  map.layers.find((layer) => layer.name === "Doors")?.objects ?? [];

describe("map doors", () => {
  const names = new Set<string>(mapList.map((map) => map.name));

  it("lists every map file, and every listed map has a file", () => {
    const files = readdirSync(TILEMAPS).filter((file) => file.endsWith(".json"));
    expect(new Set(files.map((file) => file.replace(/\.json$/, "")))).toEqual(names);
  });

  it("only lead to maps and doors that exist", () => {
    const broken: string[] = [];
    for (const { name, json } of mapList)
      for (const door of doorsOf(readMap(json.split("/").pop()!))) {
        const destMap = String(property(door, "destMap"));
        const destDoor = property(door, "destDoor");
        const target = names.has(destMap) && readMap(`${destMap}.json`);
        if (!target) broken.push(`${name} ${door.name} → missing map ${destMap}`);
        else if (!doorsOf(target).some((candidate) => candidate.name === destDoor))
          broken.push(`${name} ${door.name} → ${destMap} has no door ${String(destDoor)}`);
      }
    expect(broken).toEqual([]);
  });
});
