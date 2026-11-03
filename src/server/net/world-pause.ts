import type { GameEventBus } from "@/rules/world/event-bus";
import type { ServerWorld } from "@/server/world/server-world";

/** Pauses the game loop while nobody is connected and resumes it when someone joins. */
function shouldPause(world: ServerWorld) {
  const loop = world.loop;
  if (!loop) return;
  const isEmpty = Object.keys(world.players ?? {}).length === 0;
  if (isEmpty && loop.isRunning()) {
    loop.pause();
    world.log.info("🚦 Game empty. Pausing.");
  } else if (!isEmpty && !loop.isRunning()) {
    loop.resume();
    world.log.info("🚦 Player joined. Resuming.");
  }
}

/** Pauses or resumes the loop whenever a player joins or leaves. */
export function subscribeWorldPause(events: GameEventBus, world: ServerWorld) {
  const update = () => shouldPause(world);
  events.on("playerJoined", update);
  events.on("playerLeft", update);
}
