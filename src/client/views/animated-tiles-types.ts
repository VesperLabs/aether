import type Phaser from "phaser";

export type Tilemap = Phaser.Tilemaps.Tilemap;
export type Tile = Phaser.Tilemaps.Tile;

export interface AnimationFrameData {
  duration: number;
  tileid: number;
}

/** One animated tile of a tileset, and the tiles on each layer that follow it. */
export interface AnimatedTileData {
  index: number;
  frames: AnimationFrameData[];
  currentFrame: number;
  tiles: Tile[][];
  rate: number;
  next: number;
}

/** The animations of one map. */
export interface MapAnimData {
  map: Tilemap;
  animatedTiles: AnimatedTileData[];
  active: boolean;
  rate: number;
  activeLayer: boolean[];
}

/** What `resume` and `pause` switch on or off: the plugin or one of its maps. */
export interface PlaybackScope {
  active: boolean;
  activeLayer: boolean[];
  animatedTiles: AnimatedTileData[];
}
