import type { MapDefinition } from "./map-types";

export const mapList = [
  {
    name: "meadow",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/meadow.json",
    seasons: "cycle",
    isOutdoors: true,
  },
  {
    name: "town-road",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/town-road.json",
    seasons: "cycle",
    isOutdoors: true,
  },
  {
    name: "wildwood",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/wildwood.json",
    seasons: "cycle",
    isOutdoors: true,
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
    seasons: "cycle",
    isOutdoors: true,
  },
  {
    name: "town-houses",
    music: "./assets/music/village-life-was-hard.mp3",
    json: "./assets/tilemaps/town-houses.json",
  },
  {
    name: "tents",
    music: "./assets/music/the-wizards-concoction.mp3",
    json: "./assets/tilemaps/tents.json",
  },
  {
    name: "graveyard",
    music: "./assets/music/troubled-forest.mp3",
    json: "./assets/tilemaps/graveyard.json",
    seasons: "cycle",
    isOutdoors: true,
  },
  {
    name: "foothills",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/foothills.json",
    seasons: "cycle",
    isOutdoors: true,
  },
  {
    name: "peak-camp",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/peak-camp.json",
    seasons: "winter",
    isOutdoors: true,
  },
  {
    name: "summit",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/summit.json",
    seasons: "winter",
    isOutdoors: true,
  },
  {
    name: "aqueducts",
    music: "./assets/music/over-ancient-waters.mp3",
    json: "./assets/tilemaps/aqueducts.json",
  },
] as const satisfies readonly MapDefinition[];
