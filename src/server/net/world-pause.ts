import type { ServerWorld } from "../server-world";
/** Pauses the game loop while nobody is playing or watching and resumes it when someone joins. */
export function shouldPause(world: ServerWorld) {
  const loop = world.loop;
  if (!loop) return;
  /* Every player is a person; NPCs alone don't keep it running, since nobody would see them. */
  const isEmpty = Object.keys(world.players ?? {}).length === 0 && !world.observers?.size;
  if (isEmpty && loop.isRunning()) {
    loop.pause();
    console.log("🚦 Game empty. Pausing.");
  } else if (!isEmpty && !loop.isRunning()) {
    loop.resume();
    console.log("🚦 Player joined. Resuming.");
  }
}
