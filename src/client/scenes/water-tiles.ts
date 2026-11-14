import type Phaser from "phaser";

/** Is the world point on a water tile of the shown map (the `water` collide tile)? */
export function isWaterAt(map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) {
  const tile = map?.getTileAtWorldXY(x, y, false, undefined, "Collide");
  return (tile?.properties as { water?: boolean } | undefined)?.water === true;
}
