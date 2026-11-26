import Phaser from "phaser";
import { resourceHex } from "@/ui/kit/resource-colors";
import { GAUGE_COLORS, bandLine, drawFrame, frameLine, gaugeResolution } from "./gauge-chrome";
import type { Player } from "./player";

/** Weapon attacks fill in stamina yellow, spells (lunges too) in mana blue. */
const FILL_COLORS = {
  attack: resourceHex("sp"),
  cast: resourceHex("mp"),
};
let nextTextureId = 0;

/**
 * A thin bar under the hp bar that fills while a fighting NPC winds up or a player casts, shown
 * only then. Framed like it, and drawn like
 * the hp bar, one texture pixel per screen pixel.
 */
export class CastBar extends Phaser.GameObjects.Image {
  /** How far the owner's current windup is. */
  windup: { progress: number; kind: keyof typeof FILL_COLORS } = { progress: 0, kind: "attack" };
  /** Fills the bar over the windup. */
  tween?: Phaser.Tweens.Tween;
  declare canvas: Phaser.Textures.CanvasTexture;
  /** What the canvas last drew, so it only redraws when that changes. */
  declare drawn: string;
  declare barWidth: number;
  declare barHeight: number;
  /** The hp bar's bottom left corner, which it hangs from. */
  declare anchorX: number;
  declare anchorY: number;
  /**
   * Hangs under an hp bar `width` wide whose bottom left is at (x, y) in its owner's rig, `height`
   * world pixels tall. As wide, it shares the hp bar's bottom cream band, so the two read as one
   * gauge and their fills start and end together.
   */
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    const key = `cast-bar-${nextTextureId++}`;
    const canvas = scene.textures.createCanvas(key, 1, 1);
    super(scene, x, y, key);
    this.setOrigin(0, 0);
    this.anchorX = x;
    this.anchorY = y;
    this.barWidth = width;
    this.barHeight = height;
    if (canvas) {
      canvas.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.canvas = canvas;
    }
  }
  /** Whether a windup is filling it now. */
  get isFilling() {
    return this.windup.progress > 0;
  }
  /** Draws the bar at the current windup, or hides it when `show` is false. */
  draw(show: boolean) {
    this.setVisible(show);
    if (!show || !this.canvas || !this.scene) return;
    const { progress, kind } = this.windup;
    const resolution = gaugeResolution(this.scene);
    const state = `${resolution}-${kind}-${progress}`;
    if (state === this.drawn) return;
    this.drawn = state;
    /*
     * A whole framed bar with its top outline cut off, tucked up so its top cream band lies over
     * the hp bar's bottom one: one shared band between the two fills, the outline only outside.
     */
    const line = frameLine(resolution);
    const full = this.barHeight * resolution;
    const width = this.barWidth * resolution;
    const height = full - line;
    this.setPosition(this.anchorX, this.anchorY - (line + bandLine(resolution)) / resolution);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.setSize(width, height);
      this.setSize(width, height).updateDisplayOrigin();
    }
    this.setScale(1 / resolution);
    const ctx = this.canvas.getContext();
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, -line);
    const inset = drawFrame(ctx, width, full, resolution);
    const inner = width - inset * 2;
    ctx.fillStyle = GAUGE_COLORS.track;
    ctx.fillRect(inset, inset, inner, full - inset * 2);
    ctx.fillStyle = FILL_COLORS[kind];
    ctx.fillRect(inset, inset, Math.round(inner * Math.min(1, progress)), full - inset * 2);
    ctx.restore();
    this.canvas.refresh();
  }
  destroy(fromScene?: boolean) {
    const { canvas } = this;
    this.tween?.stop();
    super.destroy(fromScene);
    canvas?.destroy();
  }
}

/** Fills a character's cast bar over its windup, full the moment it lands, then hides it. */
export function playCastBar(attacker: Player, windupMs: number, kind: "attack" | "cast") {
  const { scene, castBar } = attacker;
  if (!scene || !castBar) return;
  castBar.windup = { progress: 0, kind };
  castBar.tween?.stop();
  castBar.tween = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (attacker.state?.isDead) return tween.complete();
      /* Never exactly 0 while filling, so the bar shows from the first frame */
      castBar.windup.progress = Math.max(0.001, tween.getValue() ?? 0);
    },
    onComplete: () => {
      castBar.windup.progress = 0;
    },
  });
  castBar.windup.progress = 0.001;
}

/** Empties and hides a character's cast bar when its windup is called off. */
export function stopCastBar(attacker: Player) {
  const { castBar } = attacker;
  if (!castBar) return;
  castBar.tween?.stop();
  castBar.windup.progress = 0;
}
