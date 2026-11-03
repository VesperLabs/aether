import type { GameEventBus } from "@/rules/world";
import type { GameIo } from "@/network";

/** Sends debug-only game events to the clients in that room. */
export function subscribeDebugMessages(bus: GameEventBus, io: GameIo) {
  return bus.on("spellHitShapes", ({ roomName, ...shapes }) => {
    io.to(roomName).emit("spellHitShapes", shapes);
  });
}
