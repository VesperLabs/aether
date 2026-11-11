/// <reference types="vite/client" />

/**
 * Items each map spawns on the ground, by map name, and the actors any map places
 * (see `scripts/map-loots-plugin.ts`).
 */
declare module "virtual:map-loots" {
  const mapLoots: Record<string, { type: string; rarity: string; key: string; chance: number }[]>;
  export default mapLoots;
  export const placedActors: string[];
}
