/**
 * @author       Florian Vazelle <ponythugflorian@gmail.com>
 * @license      {@link https://opensource.org/licenses/MIT | MIT License}
 */
import Phaser from "phaser";
import { getHeroCoordsRelativeToWindow } from "@/client/scenes/camera-zoom";
import type { Joystick, JoystickSettings } from "./joystick-types";

/** Phaser's legacy class builder, which Phaser 4's types leave out. */
export type LegacyClass = new <T extends new (...args: never[]) => unknown>(
  definition: object,
) => T;
export const PhaserClass = (Phaser as unknown as { Class: LegacyClass }).Class;
const { Transform } = Phaser.GameObjects.Components as unknown as { Transform: object };

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
export const JoystickClass = new PhaserClass<
  new (scene: Phaser.Scene, settings: JoystickSettings) => Joystick
>({
  Extends: Phaser.GameObjects.GameObject,

  Mixins: [Transform],

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
