import type { MapImageDefinition } from "./map-types";

export const mapImageList = [
  { image: "./assets/tilesets/extras.png", name: "tileset-extras" },
  { image: "./assets/tilesets/collide.png", name: "tileset-collide" },
  { image: "./assets/tilesets/grassland.png", name: "tileset-grassland" },
  { image: "./assets/tilesets/grassland-spring.png", name: "tileset-grassland-spring" },
  { image: "./assets/tilesets/grassland-fall.png", name: "tileset-grassland-fall" },
  { image: "./assets/tilesets/grassland-winter.png", name: "tileset-grassland-winter" },
  {
    image: "./assets/tilesets/grassland-shadows.png",
    name: "tileset-grassland-shadows",
  },
  { image: "./assets/tilesets/mine.png", name: "tileset-mine" },
  { image: "./assets/tilesets/mine-shadows.png", name: "tileset-mine-shadows" },
  { image: "./assets/tilesets/town.png", name: "tileset-town" },
  { image: "./assets/tilesets/town-spring.png", name: "tileset-town-spring" },
  { image: "./assets/tilesets/town-fall.png", name: "tileset-town-fall" },
  { image: "./assets/tilesets/town-winter.png", name: "tileset-town-winter" },
  { image: "./assets/tilesets/town-shadows.png", name: "tileset-town-shadows" },
  { image: "./assets/tilesets/town-inside.png", name: "tileset-town-inside" },
  {
    image: "./assets/tilesets/town-inside-shadows.png",
    name: "tileset-town-inside-shadows",
  },
  { image: "./assets/tilesets/dungeon.png", name: "tileset-dungeon" },
  {
    image: "./assets/tilesets/dungeon-shadows.png",
    name: "tileset-dungeon-shadows",
  },
] as const satisfies readonly MapImageDefinition[];
