import Phaser from "phaser";
import { getSwingShape, type SwingPlan } from "@/rules/spells";
import { DEBUG_COLORS, DEBUG_FILL_ALPHA } from "./debug-palette";

/**
 * The wedge a swing hits, drawn with the physics debug view: the same rule the server sweeps
 * with, following the caster and growing with the blade. Debug only.
 */
export class SwingDebug extends Phaser.GameObjects.Graphics {
  declare plan: SwingPlan;
  declare caster: { x: number; y: number; active: boolean };
  declare startedAt: number;
  declare lastsMs: number;
  constructor(
    scene: Phaser.Scene,
    plan: SwingPlan,
    caster: { x: number; y: number; active: boolean },
    lastsMs: number,
  ) {
    super(scene);
    this.plan = plan;
    this.caster = caster;
    this.startedAt = scene.time.now;
    this.lastsMs = lastsMs;
    this.setDepth(Number.MAX_SAFE_INTEGER);
    scene.add.existing(this);
    scene.events.on("update", this.draw, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off("update", this.draw, this));
    this.draw();
  }
  draw() {
    const elapsed = this.scene.time.now - this.startedAt;
    if (!this.caster.active || elapsed > this.lastsMs) return void this.destroy();
    const shape = getSwingShape(this.plan, this.caster, elapsed);
    if (shape.kind !== "sector") return;
    const from = Phaser.Math.DegToRad(shape.from);
    const to = Phaser.Math.DegToRad(shape.from + shape.span);
    this.clear();
    this.fillStyle(DEBUG_COLORS.attack, DEBUG_FILL_ALPHA).lineStyle(1, DEBUG_COLORS.attack, 1);
    this.beginPath();
    this.moveTo(shape.x, shape.y);
    this.arc(shape.x, shape.y, shape.radius, from, to);
    this.closePath();
    this.fillPath().strokePath();
  }
}
