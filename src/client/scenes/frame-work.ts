import Phaser from "phaser";

/** How many recent frames the numbers cover. */
const KEPT = 120;

const works: number[] = [];
let started = 0;
let canvas: HTMLCanvasElement | undefined;

/**
 * Times how long each frame's own work takes, from the start of its update to the end of handing
 * its drawing to the graphics card. If that is short while the frame rate is low, the time is
 * going to the graphics card drawing pixels, not to our code.
 */
export function watchFrameWork(game: Phaser.Game) {
  canvas = game.canvas;
  game.events.on(Phaser.Core.Events.PRE_STEP, () => {
    started = performance.now();
  });
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    works.push(performance.now() - started);
    if (works.length > KEPT) works.shift();
  });
}

/** The average and worst frame work over the last couple of seconds, ms, and the canvas's size in pixels. */
export function readFrameWork() {
  const average = works.length ? works.reduce((sum, ms) => sum + ms, 0) / works.length : 0;
  return {
    averageMs: average,
    maxMs: works.length ? Math.max(...works) : 0,
    width: canvas?.width ?? 0,
    height: canvas?.height ?? 0,
  };
}
