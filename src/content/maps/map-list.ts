import type { MapDefinition } from "./map-types";

export const mapList = [
  {
    name: "grassland",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/grassland.json",
  },
  {
    name: "grassland-2",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/grassland-2.json",
  },
  {
    name: "grassland-3",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/grassland-3.json",
  },
  {
    name: "mine",
    music: "./assets/music/mine.mp3",
    json: "./assets/tilemaps/mine.json",
  },
  {
    name: "town",
    music: "./assets/music/market-day.mp3",
    json: "./assets/tilemaps/town.json",
  },
  {
    name: "townInside",
    music: "./assets/music/village-life-was-hard.mp3",
    json: "./assets/tilemaps/townInside.json",
  },
  {
    name: "townInside-tents",
    music: "./assets/music/the-wizards-concoction.mp3",
    json: "./assets/tilemaps/townInside-tents.json",
  },
  {
    name: "grassland-graveyard",
    music: "./assets/music/troubled-forest.mp3",
    json: "./assets/tilemaps/grassland-graveyard.json",
  },
  {
    name: "grassland-peaks",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/grassland-peaks.json",
  },
  {
    name: "grassland-peaks-2",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/grassland-peaks-2.json",
  },
  {
    name: "grassland-peaks-3",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/grassland-peaks-3.json",
  },
  {
    name: "dungeon-aqueducts",
    music: "./assets/music/over-ancient-waters.mp3",
    json: "./assets/tilemaps/dungeon-aqueducts.json",
  },
] as const satisfies readonly MapDefinition[];
