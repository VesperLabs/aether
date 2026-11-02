import type { AnimatedTileData, AnimationFrameData, Tile, Tilemap } from "./animated-tiles-types";

/** Scan a map's tilesets for animated tiles and collect the layer tiles that use each animation. */
export function readAnimatedTiles(map: Tilemap): AnimatedTileData[] {
  let animatedTiles: AnimatedTileData[] = [];
  // loop through all tilesets
  map.tilesets.forEach(
    // Go through the data stored on each tile (not tile on the tilemap but tile in the tileset)
    (tileset) => {
      let tileData = tileset.tileData as Record<number, { animation?: AnimationFrameData[] }>;
      Object.keys(tileData).forEach((indexKey) => {
        const index = parseInt(indexKey);
        // If tile has animation info we'll dive into it
        if (tileData[index].hasOwnProperty("animation")) {
          let animatedTileData: AnimatedTileData = {
            index: index + tileset.firstgid, // gid of the original tile
            frames: [], // array of frames
            currentFrame: 0, // start on first frame
            tiles: [], // array with one array per layer with list of tiles that depends on this animation data
            rate: 1, // multiplier, set to 2 for double speed or 0.25 quarter speed
            next: 0, // set below, once the frames are known
          };
          // push all frames to the animatedTileData
          (tileData[index].animation as AnimationFrameData[]).forEach((frameData) => {
            let frame = {
              duration: frameData.duration,
              tileid: frameData.tileid + tileset.firstgid,
            };
            animatedTileData.frames.push(frame);
          });
          // time until jumping to next frame
          animatedTileData.next = animatedTileData.frames[0].duration;
          // set correct currentFrame if animation starts with different tile than the one with animation flag
          animatedTileData.currentFrame = animatedTileData.frames.findIndex(
            (f: AnimationFrameData) => f.tileid === index + tileset.firstgid,
          );
          // Go through all layers for tiles
          map.layers.forEach((layer) => {
            //In newer version of phaser there is only one type of layer, so checking for static is breaking the plugin
            if (layer.tilemapLayer && layer.tilemapLayer.type) {
              if (layer.tilemapLayer.type === "StaticTilemapLayer") {
                // We just push an empty array if the layer is static (impossible to animate).
                // If we just skip the layer, the layer order will be messed up
                // when updating animated tiles and things will look awful.
                animatedTileData.tiles.push([]);
                return;
              }
            }

            // tiles array for current layer
            let tiles: Tile[] = [];
            // loop through all rows with tiles...
            layer.data.forEach((tileRow) => {
              // ...and loop through all tiles in that row
              tileRow.forEach((tile) => {
                // Tiled start index for tiles with 1 but animation with 0. Thus that wierd "-1"
                if (tile.index - tileset.firstgid === index) {
                  tiles.push(tile);
                }
              });
            });
            // add the layer's array with tiles to the tiles array.
            // this will make it possible to control layers individually in the future
            animatedTileData.tiles.push(tiles);
          });
          // animatedTileData is finished for current animation, push it to the animatedTiles-property of the plugin
          animatedTiles.push(animatedTileData);
        }
      });
    },
  );
  return animatedTiles;
}
