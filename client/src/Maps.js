const mapList = [
  {
    name: "map-grassland",
    json: "./assets/tilemaps/grassland.json",
  },
  {
    name: "map-grassland-2",
    json: "./assets/tilemaps/grassland-2.json",
  },
  {
    name: "map-mine",
    json: "./assets/tilemaps/mine.json",
  },
  {
    name: "map-town",
    json: "./assets/tilemaps/town.json",
  },
  {
    name: "map-townInside",
    json: "./assets/tilemaps/townInside.json",
  },
  {
    name: "map-grassland-graveyard",
    json: "./assets/tilemaps/grassland-graveyard.json",
  },
  {
    name: "map-dungeon-aqueducts",
    json: "./assets/tilemaps/dungeon-aqueducts.json",
  },
];
const imageList = [
  {
    image: "./assets/tilesets/extras.png",
    name: "tileset-extras",
  },
  {
    image: "./assets/tilesets/collide.png",
    name: "tileset-collide",
  },
  {
    image: "./assets/tilesets/grassland.png",
    name: "tileset-grassland",
  },
  {
    image: "./assets/tilesets/grassland-shadows.png",
    name: "tileset-grassland-shadows",
  },
  {
    image: "./assets/tilesets/mine.png",
    name: "tileset-mine",
  },
  {
    image: "./assets/tilesets/mine-shadows.png",
    name: "tileset-mine-shadows",
  },
  {
    image: "./assets/tilesets/town.png",
    name: "tileset-town",
  },
  {
    image: "./assets/tilesets/town-shadows.png",
    name: "tileset-town-shadows",
  },
  {
    image: "./assets/tilesets/townInside.png",
    name: "tileset-townInside",
  },
  {
    image: "./assets/tilesets/townInside-shadows.png",
    name: "tileset-townInside-shadows",
  },
  {
    image: "./assets/tilesets/dungeon.png",
    name: "tileset-dungeon",
  },
  {
    image: "./assets/tilesets/dungeon-shadows.png",
    name: "tileset-dungeon-shadows",
  },
];

const getMapByName = (name) => {
  return mapList?.find((m) => m?.mapName === name);
};

export { mapList, imageList, getMapByName };
