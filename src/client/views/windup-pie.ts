import Phaser from "phaser";
import { resourceHex } from "@/ui/kit/resource-colors";
import type { Player } from "./player";

/** Sizes in world pixels: the pie, and the black edge around it. As tall as the hp bar. */
const PIE_RADIUS = 2.5;
const OUTLINE_THICKNESS = 0.5;
/** The pie is drawn this many times sharper than it shows, then scaled down smoothly. */
const SUPERSAMPLE = 8;
const TRACK_COLOR = "rgba(0, 0, 0, 0.6)";
/** Weapon attacks count down in stamina yellow, spells (lunges too) in mana blue. */
const PIE_COLORS = {
  attack: resourceHex("sp"),
  cast: resourceHex("mp"),
};
let nextTextureId = 0;
/** Drawn over every character, so one standing in front never hides another's pie. */
const PIE_DEPTH = 1_000_000;

/**
 * A tiny pie, centred just above the hp bar, that fills clockwise while a fighting NPC winds up
 * (or a player casts). Canvas arcs are antialiased and the texture filters linearly, so it stays
 * round though the game is pixel art.
 */
export class WindupPie extends Phaser.GameObjects.Image {
  /** How far the owner's current windup is. */
  windup: { progress: number; kind: keyof typeof PIE_COLORS } = { progress: 0, kind: "attack" };
  /** Fills the pie over the windup. */
  tween?: Phaser.Tweens.Tween;
  declare canvas: Phaser.Textures.CanvasTexture;
  /** What the canvas last drew, so it only redraws when that changes. */
  declare drawn: string;
  /** Height of its centre above its owner's position. */
  declare offsetY: number;
  constructor(scene: Phaser.Scene, offsetY: number) {
    const size = Math.ceil((PIE_RADIUS + OUTLINE_THICKNESS) * 2 * SUPERSAMPLE);
    const key = `windup-pie-${nextTextureId++}`;
    const canvas = scene.textures.createCanvas(key, size, size);
    super(scene, 0, 0, key);
    this.offsetY = offsetY;
    this.setDepth(PIE_DEPTH);
    if (canvas) {
      canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.canvas = canvas;
    }
    this.setScale(1 / SUPERSAMPLE);
  }
  /**
   * Lives in the scene rather than its owner, so it follows the owner's position itself.
   */
  follow(x: number, y: number) {
    this.setPosition(x, y + this.offsetY);
  }
  /** Draws the pie at the current windup, or hides it when `show` is false. */
  draw(show: boolean) {
    this.setVisible(show);
    const { progress, kind } = this.windup;
    const state = `${kind}-${progress}`;
    if (!show || !this.canvas || state === this.drawn) return;
    this.drawn = state;
    const ctx = this.canvas.getContext();
    const size = this.canvas.width;
    const centre = size / 2;
    const radius = PIE_RADIUS * SUPERSAMPLE;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = TRACK_COLOR;
    ctx.beginPath();
    ctx.arc(centre, centre, radius, 0, Math.PI * 2);
    ctx.fill();
    if (progress > 0) {
      const start = -Math.PI / 2;
      ctx.fillStyle = PIE_COLORS[kind];
      ctx.beginPath();
      ctx.moveTo(centre, centre);
      ctx.arc(centre, centre, radius, start, start + Math.min(1, progress) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = OUTLINE_THICKNESS * SUPERSAMPLE;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.arc(centre, centre, radius + ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    this.canvas.refresh();
  }
  destroy(fromScene?: boolean) {
    const { canvas } = this;
    super.destroy(fromScene);
    canvas?.destroy();
  }
}

/** Fills an NPC's windup pie as it winds up, full the moment its attack lands, then empties it. */
export function playWindupPie(attacker: Player, windupMs: number, kind: "attack" | "cast") {
  const { scene, windupPie } = attacker;
  if (!scene || !windupPie) return;
  windupPie.windup = { progress: 0, kind };
  windupPie.tween?.stop();
  windupPie.tween = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (attacker.state?.isDead) return tween.complete();
      windupPie.windup.progress = tween.getValue() ?? 0;
    },
    onComplete: () => {
      windupPie.windup.progress = 0;
    },
  });
}

/** Empties an NPC's windup pie when it calls the windup off. */
export function stopWindupPie(attacker: Player) {
  const { windupPie } = attacker;
  if (!windupPie) return;
  windupPie.tween?.stop();
  windupPie.windup.progress = 0;
}
