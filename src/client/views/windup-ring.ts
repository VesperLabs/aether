import Phaser from "phaser";
import { theme } from "@/ui/kit/theme";
import type { Player } from "./player";

/** Middle of the ring's band and how thick it is, in pixels: the bags' little donut, in the world. */
const RING_RADIUS = 4;
const RING_THICKNESS = 3;
/** The empty part of the ring, like the donut's dark track. */
const TRACK_ALPHA = 0.25;

const toColor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const SET = toColor(theme.colors.set);
const YELLOW = toColor(theme.colors.yellow[200]);
const DANGER = toColor(theme.colors.danger);

/** Same steps as the bags' donut: calm, then yellow, then red right before it lands. */
function getRingColor(progress: number) {
  if (progress > 0.75) return DANGER;
  if (progress > 0.5) return YELLOW;
  return SET;
}

/** A ring over the head that fills up as an NPC winds up, full the moment its attack lands. */
export function playWindupRing(attacker: Player, windupMs: number) {
  const { scene } = attacker;
  if (!scene) return;
  const ring = scene.add.graphics();
  ring.setPosition(0, attacker.headY);
  attacker.add(ring);
  const draw = (progress: number) => {
    ring.clear();
    ring.lineStyle(RING_THICKNESS, 0x000000, TRACK_ALPHA);
    ring.strokeCircle(0, 0, RING_RADIUS);
    if (progress <= 0) return;
    const start = -Math.PI / 2;
    ring.lineStyle(RING_THICKNESS, getRingColor(progress), 1);
    ring.beginPath();
    ring.arc(0, 0, RING_RADIUS, start, start + progress * Math.PI * 2);
    ring.strokePath();
  };
  draw(0);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (!ring.active) return;
      if (attacker.state?.isDead) return tween.complete();
      draw(tween.getValue() ?? 0);
    },
    onComplete: () => ring.destroy(),
  });
}
