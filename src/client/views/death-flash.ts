import Phaser from "phaser";
import type { Player } from "./player";

/** A dying body shows solid white for this long, and at least this many drawn frames. */
export const FLASH_MS = 90;
const FLASH_FRAMES = 5;
/** The flash ends by this much real time, whatever. */
const FLASH_MAX_MS = 250;

/**
 * Calls `done` once the flash has lasted `FLASH_MS` and at least `FLASH_FRAMES` drawn frames, so a
 * slow frame (building the dissolve) can't eat it. Never later than `FLASH_MAX_MS` of real time,
 * even with no frames drawn (the tab hidden mid-flash).
 */
export function holdFlash(scene: Phaser.Scene, done: () => void) {
  let frames = 0;
  let isTimeUp = false;
  let isDone = false;
  const stop = () => scene.events.off(Phaser.Scenes.Events.RENDER, countFrame);
  const end = () => {
    if (isDone) return;
    isDone = true;
    window.clearTimeout(cap);
    stop();
    done();
  };
  const finish = () => {
    if (frames >= FLASH_FRAMES && isTimeUp) end();
  };
  const cap = window.setTimeout(end, FLASH_MAX_MS);
  const countFrame = () => {
    frames++;
    finish();
  };
  scene.events.on(Phaser.Scenes.Events.RENDER, countFrame);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    isDone = true;
    window.clearTimeout(cap);
    stop();
  });
  scene.time.delayedCall(FLASH_MS, () => {
    isTimeUp = true;
    finish();
  });
}

/**
 * A copy of a dying character's shadow, left where it stood and faded out over the dissolve, since
 * the real one hides the moment it dies.
 */
export function fadeShadow(player: Player, durationMs: number) {
  const { shadow, scene } = player;
  if (!shadow?.visible) return;
  const copy = scene.add.image(
    player.x + player.rig.x + shadow.x,
    player.y + player.rig.y + shadow.y,
    shadow.texture.key,
    shadow.frame.name,
  );
  copy.setOrigin(shadow.originX, shadow.originY).setScale(shadow.scaleX, shadow.scaleY);
  copy.setAlpha(shadow.alpha).setDepth(player.depth);
  scene.tweens.add({
    targets: copy,
    alpha: 0,
    duration: durationMs,
    onComplete: () => copy.destroy(),
  });
}
