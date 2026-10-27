import { mapList } from "./map-list";
import type { MapDefinition } from "./map-types";

export function getMapByName(name: string | undefined): MapDefinition | undefined {
  return mapList.find((m) => m?.name === name);
}
