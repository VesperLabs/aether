import type { ServerWorld } from "../server-world";
/** Pauses the game loop while nobody is connected and resumes it when someone joins. */
export function shouldPause(world: ServerWorld) {
  if (Object.keys(world.players ?? {})?.length === 0) {
    world.loop?.pause();
    console.log("🚦 Game empty. Pausing.");
  } else {
    world.loop?.resume();
    console.log("🚦 Player joined. Resuming.");
  }
}
