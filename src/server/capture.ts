import { buffList, type BuffDefinition } from "@/content";
import { isCatchable, rollCatch } from "@/rules/capture";
import type { GameEventBus } from "@/rules/world";
import { catchAsCompanion } from "./catching";
import { canTame } from "./companions";
import { catchTargetOf } from "./catch-target";
import { isInRoom } from "./player-room";
import type { ServerWorld } from "./server-world";

/*
 * Capture: a thrown ball is the `pokeball` spell, and whoever it hits struggles in the `capturing`
 * debuff. When a buff with the `catch` hook runs out, its caster may catch its wearer: still wild,
 * both still in the same room, and the roll goes their way (better balls put on a higher level). Otherwise it simply breaks free.
 */
export function subscribeCapture(bus: GameEventBus, world: ServerWorld) {
  return bus.on("buffExpired", ({ name, wearerId, casterId, level }) => {
    const definition = (buffList as Record<string, BuffDefinition>)[name];
    if (definition?.onExpire !== "catch" || !casterId) return;
    const wild = world.npcs[wearerId];
    const thrower = world.players[casterId];
    if (!wild || !canTame(wild) || !isCatchable(catchTargetOf(wild)) || !isInRoom(thrower)) return;
    if (wild.room.name !== thrower.roomName || !rollCatch(world.dice.random, level)) return;
    catchAsCompanion(world, thrower, wild);
  });
}
