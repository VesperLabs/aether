import Phaser from "phaser";
import { theme } from "@/ui/kit/theme";
import type { Player } from "./player";

/** Sizes in world pixels: the middle of the band, its width, and the black edge on each side. */
const RING_RADIUS = 2.75;
const RING_THICKNESS = 2;
const OUTLINE_THICKNESS = 0.5;
/** The ring is drawn this many times sharper than it shows, then scaled down smoothly. */
const SUPERSAMPLE = 8;
const TRACK_COLOR = "rgba(0, 0, 0, 0.6)";
/** Weapon attacks count down in yellow, spells (lunges too) in blue, the colour of magic items. */
const RING_COLORS = {
  attack: theme.colors.yellow[400],
  cast: theme.colors.blue[400],
};
let nextTextureId = 0;
/** Drawn over every character, so one standing in front never hides another's ring. */
const RING_DEPTH = 1_000_000;

/**
 * The donut centred above a fighting NPC's hp bar, filled while it winds up. Canvas arcs are
 * antialiased and the texture filters linearly, so it stays round though the game is pixel art.
 */
export class WindupRing extends Phaser.GameObjects.Image {
  /** How far the owner's current windup is. */
  windup: { progress: number; kind: keyof typeof RING_COLORS } = { progress: 0, kind: "attack" };
  declare canvas: Phaser.Textures.CanvasTexture;
  /** What the canvas last drew, so it only redraws when that changes. */
  declare drawn: string;
  /** Height above its owner's position. */
  declare offsetY: number;
  constructor(scene: Phaser.Scene, offsetY: number) {
    const size = Math.ceil(
      (RING_RADIUS + RING_THICKNESS / 2 + OUTLINE_THICKNESS) * 2 * SUPERSAMPLE,
    );
    const key = `windup-ring-${nextTextureId++}`;
    const canvas = scene.textures.createCanvas(key, size, size);
    super(scene, 0, 0, key);
    this.offsetY = offsetY;
    this.setDepth(RING_DEPTH);
    if (canvas) {
      canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.canvas = canvas;
    }
    this.setScale(1 / SUPERSAMPLE);
  }
  /** Lives in the scene rather than its owner, so it follows the owner's position itself. */
  follow(x: number, y: number) {
    this.setPosition(x, y + this.offsetY);
  }
  /** Draws the ring at the current windup, or hides it when `show` is false. */
  draw(show: boolean) {
    this.setVisible(show);
    const { progress, kind } = this.windup;
    const state = `${kind}-${progress}`;
    if (!show || !this.canvas || state === this.drawn) return;
    this.drawn = state;
    const ctx = this.canvas.getContext();
    const size = this.canvas.width;
    const centre = size / 2;
    const radius = RING_RADIUS * SUPERSAMPLE;
    const band = RING_THICKNESS * SUPERSAMPLE;
    const outline = OUTLINE_THICKNESS * SUPERSAMPLE;
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = outline;
    ctx.strokeStyle = "#000";
    for (const edge of [radius + (band + outline) / 2, radius - (band + outline) / 2]) {
      ctx.beginPath();
      ctx.arc(centre, centre, edge, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = band;
    ctx.strokeStyle = TRACK_COLOR;
    ctx.beginPath();
    ctx.arc(centre, centre, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (progress > 0) {
      const start = -Math.PI / 2;
      ctx.strokeStyle = RING_COLORS[kind];
      ctx.beginPath();
      ctx.arc(centre, centre, radius, start, start + Math.min(1, progress) * Math.PI * 2);
      ctx.stroke();
    }
    this.canvas.refresh();
  }
  destroy(fromScene?: boolean) {
    const { canvas } = this;
    super.destroy(fromScene);
    canvas?.destroy();
  }
}

/** Fills an NPC's windup ring as it winds up, full the moment its attack lands, then empties it. */
export function playWindupRing(attacker: Player, windupMs: number, kind: "attack" | "cast") {
  const { scene, windupRing } = attacker;
  if (!scene || !windupRing) return;
  windupRing.windup = { progress: 0, kind };
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (attacker.state?.isDead) return tween.complete();
      windupRing.windup.progress = tween.getValue() ?? 0;
    },
    onComplete: () => {
      windupRing.windup.progress = 0;
    },
  });
}
