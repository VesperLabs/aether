import { createMirror, type MirrorCharacter } from "@/network/session/mirror";
import { STAND_STILL, type BotIntent, type BotView } from "./brain";

/** A character with just the fields brains read. */
export const character = (id: string, x: number, y: number, extra: Partial<MirrorCharacter> = {}) =>
  ({
    id,
    socketId: id,
    x,
    y,
    bodySize: 8,
    state: {},
    roomName: "grassland",
    ...extra,
  }) as MirrorCharacter;

/** A view of a hero alone in grassland, plus `npcs`. */
export function testView(npcs: MirrorCharacter[] = [], last: BotIntent = STAND_STILL): BotView {
  const mirror = createMirror();
  const self = character("me", 100, 100);
  mirror.selfId = "me";
  mirror.roomName = "grassland";
  mirror.players.set("me", self);
  for (const npc of npcs) mirror.npcs.set(npc.id, npc);
  return { mirror, self, last };
}
