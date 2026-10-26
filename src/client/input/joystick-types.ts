import type Phaser from "phaser";

export interface JoystickSettings {
  sprites: { cap: Phaser.GameObjects.Sprite; base: Phaser.GameObjects.Sprite };
  singleDirection?: boolean;
  maxDistanceInPixels?: number;
  /** 0 for the mouse pointer, 1, 2, 3 for touch pointers. */
  device?: number;
}

// The plugin adds `scene.add.joystick(settings)` to Phaser's game object factory.
declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      joystick(settings: JoystickSettings): Joystick;
    }
  }
}

/** The joystick game object. `deltaX` and `deltaY` go from -1 to 1. */
export interface Joystick
  extends Phaser.GameObjects.GameObject, Phaser.GameObjects.Components.Transform {
  cursors: Phaser.Math.Vector2;
  singleDirection: boolean;
  maxDistanceInPixels: number;
  device: number;
  layer: Phaser.GameObjects.Layer;
  readonly deltaX: number;
  readonly deltaY: number;
  onKeyDown(pointer: Phaser.Input.Pointer): void;
  onKeyUp(pointer: Phaser.Input.Pointer): void;
}

/** The plugin manager calls that Phaser's own typings leave out or get wrong for this plugin. */
export interface JoystickPluginManager {
  registerGameObject(type: string, factory: unknown, creator: unknown): void;
  removeGameObject(type: string, factory: boolean, creator: boolean): void;
}

/** `this` of the plugin's methods. Phaser clears these references when the plugin is destroyed. */
export interface VJoyPluginInstance {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
  systems: Phaser.Scenes.Systems | null;
  pluginManager: JoystickPluginManager | null;
  joystickFactory: unknown;
  joystickCreator: unknown;
  gameDestroy: () => void;
  destroy: () => void;
}
