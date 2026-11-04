import Phaser from "phaser";
import type { SceneMain } from "./main-scene";

/* Not 0: Phaser skips a camera at 0, which would leave the first texture upload for the reveal. */
const HIDDEN_ALPHA = 0.001;
/* Matches WORLD_REVEAL_MS in client/hud/app/use-world-ready.ts, so the title and world cross. */
const REVEAL_MS = 800;
const SETTLED_FRAME_MS = 34;

/* About half a second at 60fps: short runs of smooth frames still fall between later stalls. */
const SETTLED_FRAMES = 30;
const SETTLE_LIMIT_MS = 2500;

const worldCameras = (scene: SceneMain) =>
  scene.minimap ? [scene.cameras.main, scene.minimap] : [scene.cameras.main];

/** Keeps the world drawing but unseen, so it can only ever appear by fading up. */
export function hideWorld(scene: SceneMain) {
  worldCameras(scene).forEach((camera) => camera.setAlpha(HIDDEN_ALPHA));
}

/**
 * Crosses the login cover into the world once frames run smoothly: building the map, uploading its
 * textures and mounting the HUD all stall the first few.
 * Capped, so a slow device still gets in.
 */
export function revealWorldWhenSettled(scene: SceneMain) {
  const { game } = scene;
  const start = performance.now();
  let lastFrame = start;
  let smoothFrames = 0;
  const onFrame = () => {
    /* Measured here: game.loop.delta is a smoothed average, which hides the very stalls we want. */
    const now = performance.now();
    smoothFrames = now - lastFrame < SETTLED_FRAME_MS ? smoothFrames + 1 : 0;
    lastFrame = now;
    if (smoothFrames < SETTLED_FRAMES && now - start < SETTLE_LIMIT_MS) return;
    game.events.off(Phaser.Core.Events.POST_RENDER, onFrame);
    window.dispatchEvent(new Event("WORLD_READY"));
    scene.tweens.add({ targets: worldCameras(scene), alpha: 1, duration: REVEAL_MS });
  };
  game.events.on(Phaser.Core.Events.POST_RENDER, onFrame);
}
