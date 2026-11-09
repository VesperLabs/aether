import Phaser from "phaser";
import type { Player } from "./player";
import { endOnDeath } from "./end-on-death";
const Sprite = Phaser.GameObjects.Sprite;

/** The icon pops to this share of the body's height (36px on a 46px human), never below the minimum. */
const POP_BODY_RATIO = 0.78;
const MIN_POP_SIZE = 16;
/** How long the pop takes. */
const POP_MS = 180;
/** It holds a beat so you notice it, then drops slowly as it fades. */
const HOLD_MS = 220;
const DROP_MS = 600;
/** How far it drops while fading, as a share of the body's height. */
const DROP_BODY_RATIO = 0.25;
/** An expanding landing swells to this many times its pop size as it fades. */
const EXPAND_SCALE = 2;

/** How a landing leaves the body: most drop away; some read better swelling out. */
type Landing = "drop" | "expand";
const LANDINGS: Partial<Record<string, Landing>> = { stealth: "expand" };

/**
 * A buff or debuff landing: its icon pops on the body, then drops a little and fades away (or, for
 * `LANDINGS` set to expand, like stealth, swells out as it fades). Its
 * icon joins the buff row after the name (shown on hover) only once this is over. Visual only.
 */
export class Buff extends Phaser.GameObjects.Container {
  declare buff: Phaser.GameObjects.Sprite;
  declare victim: Player;
  declare buffName: string;
  /** Whether this landing keeps the icon out of the row, so must let it in when done. */
  declare held: boolean;
  constructor(scene: Phaser.Scene, victim: Player, buffName: string) {
    super(scene, victim.x, victim.y);

    this.victim = victim;
    this.buff = new Sprite(scene, 0, 0, `spell-${buffName}`);
    this.buff.setOrigin(0.5);
    this.victim.add(this.buff);
    endOnDeath(victim, this);
    /* Its icon joins the buff row only once this is over */
    this.buffName = buffName;
    this.held = victim.buffRack?.holdSlot(buffName) ?? false;

    this.buff.setDisplaySize(0, 0);
    this.buff.x = this.victim.rig.x;
    this.buff.y = this.victim.rig.y + this.victim.bodyCenterY;

    const bodyHeight = victim.hitBoxSize?.height ?? 0;
    const popSize = Math.max(MIN_POP_SIZE, Math.round(bodyHeight * POP_BODY_RATIO));
    scene.tweens.chain({
      targets: this.buff,
      tweens: [
        { displayWidth: popSize, displayHeight: popSize, duration: POP_MS, ease: "Back.easeOut" },
        { displayWidth: popSize, duration: HOLD_MS },
        LANDINGS[buffName] === "expand"
          ? {
              displayWidth: popSize * EXPAND_SCALE,
              displayHeight: popSize * EXPAND_SCALE,
              alpha: 0,
              duration: DROP_MS,
              ease: "Quad.easeOut",
            }
          : {
              y: this.buff.y + Math.round(bodyHeight * DROP_BODY_RATIO),
              alpha: 0,
              duration: DROP_MS,
              ease: "Quad.easeIn",
            },
      ],
      onComplete: () => this.destroy(),
    });

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    this.victim.bringToTop(this.buff);
  }
  destroy() {
    if (this.held) this.victim?.buffRack?.releaseSlot(this.buffName);
    this.held = false;
    if (this.scene) this.scene.events.off("update", this.update, this);
    this.buff.destroy();
    super.destroy();
  }
}
