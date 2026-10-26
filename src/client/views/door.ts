import Phaser from "phaser";
import type { Point } from "@/shared/rules/world";

/** A door object from the map's "Doors" layer, which always has a position and size. */
export type DoorObject = Phaser.Types.Tilemaps.TiledObject & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class Door extends Phaser.GameObjects.Sprite {
  isEnabled?: boolean;
  heroSpawn?: boolean;
  private destDoor: string | undefined;
  private destMap: string | undefined;
  private centerPos: Point;
  constructor(scene: Phaser.Scene, args: DoorObject) {
    const { x, y, width, height, name, properties } = args;
    super(scene, x, y, "icons");
    this.setOrigin(0, 0);
    this.name = name;
    this.destDoor = properties?.find((p: { name: string; value: string }) => p.name === "destDoor")?.value;
    this.destMap = properties?.find((p: { name: string; value: string }) => p.name === "destMap")?.value;
    this.displayWidth = width;
    this.displayHeight = height;
    this.centerPos = {
      x: x + width / 2,
      y: y + height / 2,
    };
    scene.events.once("shutdown", this.destroy, this);
  }
  getProps() {
    return {
      name: this?.name,
      destMap: this?.destMap,
      destDoor: this?.destDoor,
      x: this?.x,
      y: this?.y,
      width: this?.width,
      height: this?.height,
      centerPos: this?.centerPos,
    };
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}
