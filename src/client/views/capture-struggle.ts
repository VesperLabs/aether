import type Phaser from "phaser";

/** How far the ball tips each way as the creature inside struggles, in degrees. */
const TIP_ANGLE = 20;
/** One struggle: a quick shake, then a held breath before the next. Three fill the struggle. */
const SHAKES = 3;
/** Share of each struggle spent shaking; the rest is the pause. */
const SHAKE_SHARE = 0.45;
/** Rocks per shake. */
const ROCKS = 2;

/**
 * A ball with a creature fighting it: three shakes with a held pause between each, building to the
 * catch or the break. Starts `elapsedMs` in, for someone who walks in mid-struggle. Rocks the ball
 * only; returns a stop that sets it straight.
 */
export function playCaptureStruggle(
  ball: Phaser.GameObjects.Image,
  durationMs: number,
  elapsedMs = 0,
) {
  const { scene } = ball;
  const startedAt = scene.time.now - elapsedMs;
  const rock = () => {
    if (!ball.active) return stop();
    const progress = Math.min(1, (scene.time.now - startedAt) / durationMs) * SHAKES;
    const within = progress % 1;
    /* Each shake a little harder than the last */
    const strength = 0.6 + 0.4 * (Math.min(Math.floor(progress), SHAKES - 1) / (SHAKES - 1));
    const isShaking = progress < SHAKES && within < SHAKE_SHARE;
    ball.setAngle(
      isShaking ? Math.sin((within / SHAKE_SHARE) * Math.PI * 2 * ROCKS) * TIP_ANGLE * strength : 0,
    );
  };
  const stop = () => {
    scene.events.off("update", rock);
    if (ball.active) ball.setAngle(0);
  };
  scene.events.on("update", rock);
  return stop;
}
