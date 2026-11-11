import type { MapDefinition } from "./map-types";

export const mapList = [
  {
    name: "meadow",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/meadow.json",
    seasons: "cycle",
  },
  {
    name: "town-road",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/town-road.json",
    seasons: "cycle",
  },
  {
    name: "wildwood",
    music: "./assets/music/stories-of-long-ago.mp3",
    json: "./assets/tilemaps/wildwood.json",
    seasons: "cycle",
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
  },
  {
    name: "foothills",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/foothills.json",
    seasons: "cycle",
  },
  {
    name: "peak-camp",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/peak-camp.json",
    seasons: "winter",
  },
  {
    name: "summit",
    music: "./assets/music/our-mountain.mp3",
    json: "./assets/tilemaps/summit.json",
    seasons: "winter",
  },
  {
    name: "aqueducts",
    music: "./assets/music/over-ancient-waters.mp3",
    json: "./assets/tilemaps/aqueducts.json",
  },
] as const satisfies readonly MapDefinition[];
