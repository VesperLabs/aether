/**
 * @author       Florian Vazelle <ponythugflorian@gmail.com>
 * @license      {@link https://opensource.org/licenses/MIT | MIT License}
 */
import Phaser from "phaser";
import { getHeroCoordsRelativeToWindow } from "@/client/scenes/camera-zoom";

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
interface JoystickPluginManager {
  registerGameObject(type: string, factory: unknown, creator: unknown): void;
  removeGameObject(type: string, factory: boolean, creator: boolean): void;
}

/** `this` of the plugin's methods. Phaser clears these references when the plugin is destroyed. */
interface VJoyPluginInstance {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
  systems: Phaser.Scenes.Systems | null;
  pluginManager: JoystickPluginManager | null;
  joystickFactory: unknown;
  joystickCreator: unknown;
  gameDestroy: () => void;
  destroy: () => void;
}

/**
 * @classdesc
 * [description]
 *
 * @class Joystick
 * @memberOf Phaser.GameObjects
 * @constructor
 *
 * @param {Phaser.Scene} scene - [description]
 * @param {object} [settings] - [description]
 */
// Phaser.Class is the legacy class builder and has no types.
// oxlint-disable-next-line typescript/no-explicit-any
const JoystickClass = new (Phaser as any).Class({
  Extends: Phaser.GameObjects.GameObject,

  Mixins: [(Phaser.GameObjects.Components as any).Transform],

  initialize: function Joystick(this: Joystick, scene: Phaser.Scene, settings: JoystickSettings) {
    Phaser.GameObjects.GameObject.call(this, scene, "Joystick");

    /**
     * [description]
     *
     * @name Phaser.GameObjects.Joystick#cursors
     * @type {Phaser.Math.Vector2}
     */
    this.cursors = new Phaser.Math.Vector2(0, 0);

    /**
     * [description]
     *
     * @name Phaser.GameObjects.Joystick#singleDirection
     * @type {boolean}
     * @default true
     */
    this.singleDirection = settings.singleDirection === undefined ? true : settings.singleDirection;

    /**
     * [description]
     *
     * @name Phaser.GameObjects.Joystick#maxDistanceInPixels
     * @type {number}
     * @default 200
     */
    this.maxDistanceInPixels =
      settings.maxDistanceInPixels === undefined ? 200 : settings.maxDistanceInPixels;

    /**
     * [description]
     *
     * @name Phaser.GameObjects.Joystick#device
     * @type {number}
     * @default 0
     */
    this.device = settings.device === undefined ? 0 : settings.device;

    //Instanciate the Joystick sprites.
    const imageGroup: Phaser.GameObjects.Sprite[] = [];
    imageGroup.push(this.scene.add.existing(settings.sprites.cap));
    // for (var i = 0; i < this.maxDistanceInPixels; i += 100) {
    //   imageGroup.push(this.scene.add.sprite(0, 0, settings.sprites.body));
    // }
    imageGroup.push(this.scene.add.existing(settings.sprites.base));

    // Manage the Joystick sprites with a Layer.
    this.layer = this.scene.add.layer(imageGroup);
    this.layer.setVisible(false);
    // Set Joystick position to (0, 0).
    this.setPosition(0, 0);

    // Disable update logic of this Joystick.
    this.setActive(false);

    // Add input callback on the current scene.
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onKeyDown, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.onKeyUp, this);

    // Add current Joystick to the scene, it will be added to the Update List.
    this.scene.add.existing(this);
  },

  /**
   * The read-only deltaX of this Joystick.
   *
   * @name Phaser.GameObjects.Joystick#deltaX
   * @type {number}
   */
  deltaX: {
    get: function (this: Joystick) {
      return this.cursors.x / this.maxDistanceInPixels;
    },
  },

  /**
   * The read-only deltaY of this Joystick.
   *
   * @name Phaser.GameObjects.Joystick#deltaY
   * @type {number}
   */
  deltaY: {
    get: function (this: Joystick) {
      return this.cursors.y / this.maxDistanceInPixels;
    },
  },

  /**
   * [description]
   *
   * @method Phaser.GameObjects.Joystick#onKeyDown
   *
   * @param {Phaser.Input.Pointer} pointer -
   */
  onKeyDown: function (this: Joystick, pointer: Phaser.Input.Pointer) {
    // Desktop
    if (this.device === 0) {
      if (pointer?.button === 0) this.setActive(true); // on right click
      return;
    }
    // Mobile
    if (pointer.id === this.device) {
      this.layer.setVisible(true);
      this.layer.each(function (child: Phaser.GameObjects.GameObject) {
        const obj = child as Phaser.GameObjects.Sprite;
        obj.x = pointer.x;
        obj.y = pointer.y;
      }, this);
      this.setPosition(pointer.x, pointer.y);
      this.setActive(true);
    }
  },

  /**
   * [description]
   *
   * @method Phaser.GameObjects.Joystick#onKeyUp
   *
   * @param {Phaser.Input.Pointer} pointer -
   */
  onKeyUp: function (this: Joystick, pointer: Phaser.Input.Pointer) {
    // Desktop only has 1 pointer
    if (this.device === 0) {
      // on right click
      if (pointer?.button === 0) {
        this.layer.setVisible(false);
        this.setActive(false);
        this.cursors = new Phaser.Math.Vector2(0, 0);
      }
      return;
    }
    // Mobile
    if (pointer.id === this.device) {
      this.layer.setVisible(false);
      this.setActive(false);
      this.cursors = new Phaser.Math.Vector2(0, 0);
    }
  },

  /**
   * Updates this Joystick.
   *
   * Update cursors to compute new delta vector and update position of the sprites.
   *
   * @method Phaser.GameObjects.Joystick#preUpdate
   *
   * @param {number} time - The current timestamp as generated by the Request Animation Frame or SetTimeout.
   * @param {number} delta - The delta time, in ms, elapsed since the last frame.
   */
  preUpdate: function (this: Joystick) {
    // for desktop hero is always the center
    if (this.device === 0) {
      const { x, y } = getHeroCoordsRelativeToWindow(this.scene);
      this.x = x;
      this.y = y;
    }

    // Retrieve player input pointers.
    var pointers = this.scene.input.manager?.pointers ?? [];

    // Get pointer corresponding to used device.
    var pointer = pointers[this.device].position;

    // Compute delta pointer position.
    var deltaX = pointer.x - this.x;
    var deltaY = pointer.y - this.y;

    //
    var dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    //
    if (this.singleDirection) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        deltaY = 0;
      } else {
        deltaX = 0;
      }
    }

    //
    var angle = Math.atan2(deltaY, deltaX);

    //
    if (dist > this.maxDistanceInPixels) {
      deltaX = Math.cos(angle) * this.maxDistanceInPixels;
      deltaY = Math.sin(angle) * this.maxDistanceInPixels;
    }

    // Update cursors.
    this.cursors = new Phaser.Math.Vector2(deltaX, deltaY);

    var index = 0;
    this.layer.each(function (this: Joystick, child: Phaser.GameObjects.GameObject) {
      const gameObject = child as Phaser.GameObjects.Sprite;
      gameObject.x = this.x + (deltaX * index) / 3;
      gameObject.y = this.y + (deltaY * index) / 3;
      index++;
    }, this);
  },
});

/**
 * @classdesc
 * A class allowing to use a joystick in a computer or mobile game.
 *
 * This is an external plugin which you can include in your game by preloading it:
 *
 * ```javascript
 * this.load.scenePlugin('VJoyPlugin', 'plugins/VJoyPlugin.min.js', 'VJoyPlugin', 'vjoy'):
 * ```
 *
 * Once loaded you can create a virtual Joystick using the `vjoy` property of a Scene:
 *
 * ```javascript
 * var joystick = this.vjoy.add({
 *      sprites: {
 *          base: 'vjoy_base',
 *          body: 'vjoy_body',
 *          cap: 'vjoy_cap'
 *      },
 *      singleDirection: false,
 *      maxDistanceInPixels: 200,
 *      device: 0 // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
 *   });
 * ```
 *
 * See the examples for more information.
 *
 * @class VJoyPlugin
 * @constructor
 *
 * @param {Phaser.Scene} scene - A reference to the Scene that has installed this plugin.
 * @param {Phaser.Plugins.PluginManager} pluginManager - A reference to the Plugin Manager.
 */
export const VJoyPlugin = new (Phaser as any).Class({
  Extends: Phaser.Plugins.ScenePlugin,

  initialize: function VJoyPlugin(
    this: VJoyPluginInstance,
    scene: Phaser.Scene,
    pluginManager: JoystickPluginManager,
  ) {
    // The legacy class pattern: call the parent as a plain function.
    (
      Phaser.Plugins.ScenePlugin as unknown as {
        call(self: object, scene: Phaser.Scene, pluginManager: JoystickPluginManager): void;
      }
    ).call(this, scene, pluginManager);

    // Register the Joystick Game Object
    pluginManager.registerGameObject("joystick", this.joystickFactory, this.joystickCreator);
  },

  /**
   * Creates a new Joystick Game Object and adds it to the Scene.
   *
   * @method Phaser.GameObjects.GameObjectFactory#joystick
   *
   * @param {boolean} singleDirection - The horizontal position of this Game Object.
   * @param {number} maxDistanceInPixels - The vertical position of this Game Object.
   * @param {number} device - The z position of this Game Object.
   *
   * @return {Phaser.GameObjects.Joystick} The Game Object that was created.
   */
  joystickFactory: function (this: { scene: Phaser.Scene }, settings: JoystickSettings) {
    return new JoystickClass(this.scene, settings);
  },

  /**
   * Creates a new Joystick Game Object and returns it.
   *
   * @method Phaser.GameObjects.GameObjectCreator#joystick
   *
   * @param {object} config - The configuration object this Game Object will use to create itself.
   * @param {boolean} [addToScene] - Add this Game Object to the Scene after creating it? If set this argument overrides the `add` property in the config object.
   *
   * @return {Phaser.GameObjects.Joystick} The Game Object that was created.
   */
  joystickCreator: function (
    this: { scene: Phaser.Scene },
    config: Record<string, unknown> | undefined,
    addToScene?: boolean,
  ) {
    if (config === undefined) {
      config = {};
    }

    var settings = Phaser.Utils.Objects.GetValue(config, "settings", null);

    var joystick = new JoystickClass(this.scene, settings);

    if (addToScene !== undefined) {
      config.add = addToScene;
    }

    Phaser.GameObjects.BuildGameObject(this.scene, joystick, config);

    return joystick;
  },

  /**
   * This method is called automatically, only once, when the Scene is first created.
   * Do not invoke it directly.
   *
   * @method VJoyPlugin#boot
   * @private
   */
  boot: function (this: VJoyPluginInstance) {
    (this.systems as Phaser.Scenes.Systems).events.once("destroy", this.destroy, this);
    (this.game as Phaser.Game).events.once("destroy", this.gameDestroy, this);
  },

  /**
   * The Scene that owns this plugin is being destroyed.
   *
   * We need to shutdown and then kill off all external references.
   *
   * @method VJoyPlugin#destroy
   * @private
   */
  destroy: function (this: VJoyPluginInstance) {
    this.game = null;
    this.scene = null;
    this.systems = null;
  },

  /**
   * The Game that owns this plugin is being destroyed.
   *
   * Dispose of the Scene Renderer and remove the Game Objects.
   *
   * @method VJoyPlugin#gameDestroy
   * @private
   */
  gameDestroy: function (this: VJoyPluginInstance) {
    (this.pluginManager as JoystickPluginManager).removeGameObject("joystick", true, true);
    this.pluginManager = null;
  },
});
