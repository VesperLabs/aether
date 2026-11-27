import Phaser from "phaser";
import { theme } from "@/ui/kit/theme";
import { GAUGE_COLORS, drawFrame, gaugeResolution } from "./gauge-chrome";

/** After a drop, the ghost strip waits this long and then drains to the new value, in ms. */
const GHOST_DELAY_MS = 250;
const GHOST_DRAIN_MS = 300;
/** The hud's hp bar red. */
const FILL_COLOR = theme.colors.red[700];
/** A pale strip behind the fill that drains slowly, showing how much was just lost. */
const GHOST_COLOR = "#a8945f";
let nextTextureId = 0;

/**
 * An hp bar `width` by `height` world pixels, its top left at (x, y), drawn into its own canvas at
 * screen resolution (see `gaugeResolution`).
 */
export class HpBar extends Phaser.GameObjects.Image {
  declare canvas: Phaser.Textures.CanvasTexture;
  declare percent: number;
  /** Where the ghost strip has drained to, from 0 to 1. */
  ghost = { value: 0 };
  declare ghostTween?: Phaser.Tweens.Tween;
  /** What the canvas last drew, so it only redraws when that changes. */
  declare drawn: string;
  declare barWidth: number;
  declare barHeight: number;
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    const key = `hp-bar-${nextTextureId++}`;
    const canvas = scene.textures.createCanvas(key, 1, 1);
    super(scene, x, y, key);
    this.setOrigin(0, 0);
    this.barWidth = width;
    this.barHeight = height;
    if (canvas) {
      canvas.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.canvas = canvas;
    }
    this.setPercent(0);
  }
  setPercent(percent: number) {
    if (percent === this.percent) return;
    const isDrop = this.percent !== undefined && percent < this.percent;
    this.percent = percent;
    this.ghostTween?.stop();
    /* Healing (or the first fill) moves the ghost with the bar; a drop drains it after a beat */
    if (!isDrop) {
      this.ghost.value = percent;
      this.redraw();
      return;
    }
    this.redraw();
    this.ghostTween = this.scene.tweens.add({
      targets: this.ghost,
      value: percent,
      delay: GHOST_DELAY_MS,
      duration: GHOST_DRAIN_MS,
      ease: "Quad.easeIn",
      onUpdate: () => this.redraw(),
    });
  }
  setVisible(value: boolean) {
    super.setVisible(value);
    /* Catches up with a zoom change made while hidden */
    if (value) this.redraw();
    return this;
  }
  redraw() {
    if (!this.canvas || !this.scene) return;
    const resolution = gaugeResolution(this.scene);
    const state = `${resolution}:${this.percent}:${this.ghost.value}`;
    if (state === this.drawn) return;
    this.drawn = state;
    const width = this.barWidth * resolution;
    const height = this.barHeight * resolution;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.setSize(width, height);
      this.setSize(width, height).updateDisplayOrigin();
    }
    this.setScale(1 / resolution);
    const ctx = this.canvas.getContext();
    const inset = drawFrame(ctx, width, height, resolution);
    const inner = width - inset * 2;
    ctx.fillStyle = GAUGE_COLORS.track;
    ctx.fillRect(inset, inset, inner, height - inset * 2);
    ctx.fillStyle = GHOST_COLOR;
    ctx.fillRect(inset, inset, Math.round(inner * this.ghost.value), height - inset * 2);
    ctx.fillStyle = FILL_COLOR;
    ctx.fillRect(inset, inset, Math.round(inner * this.percent), height - inset * 2);
    this.canvas.refresh();
  }
  destroy(fromScene?: boolean) {
    const { canvas } = this;
    this.ghostTween?.stop();
    super.destroy(fromScene);
    canvas?.destroy();
  }
}
