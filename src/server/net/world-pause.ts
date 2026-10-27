import type { ServerWorld } from "../server-world";
/** Pauses the game loop while nobody is connected and resumes it when someone joins. */
export function shouldPause(world: ServerWorld) {
  const loop = world.loop;
  if (!loop) return;
  const isEmpty = Object.keys(world.players ?? {}).length === 0;
  if (isEmpty && loop.isRunning()) {
    loop.pause();
    console.log("🚦 Game empty. Pausing.");
  } else if (!isEmpty && !loop.isRunning()) {
    loop.resume();
    console.log("🚦 Player joined. Resuming.");
  }
}
