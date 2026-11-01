import type { GameEventBus } from "@/rules/world";
import type { GameIo } from "@/network";

/** Turns NPC game events into the socket messages the clients in that room play back. */
export function subscribeNpcMessages(bus: GameEventBus, io: GameIo) {
  const offs = [
    bus.on("npcAttacked", ({ npcId, roomName, ...attack }) => {
      io.to(roomName).emit("npcAttack", { id: npcId, ...attack });
    }),
    bus.on("npcCast", ({ npcId, roomName, abilitySlot, castAngle }) => {
      io.to(roomName).emit("npcCastSpell", { id: npcId, abilitySlot, castAngle });
    }),
    bus.on("npcWindupStarted", ({ npcId, roomName, ...windup }) => {
      io.to(roomName).emit("npcWindup", { id: npcId, ...windup });
    }),
    bus.on("npcRespawned", ({ npcId, roomName, x, y, at }) => {
      io.to(roomName).emit("respawnNpc", { id: npcId, x, y, respawnTime: at });
    }),
  ];
  return () => offs.forEach((off) => off());
}
