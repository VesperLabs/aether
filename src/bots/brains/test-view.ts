import { createClientState, type ClientCharacter } from "@/network/session/client-state";
import { STAND_STILL, type BotIntent, type BotView } from "./brain";

/** A character with just the fields brains read. */
export const character = (id: string, x: number, y: number, extra: Partial<ClientCharacter> = {}) =>
  ({
    id,
    socketId: id,
    x,
    y,
    bodySize: 8,
    state: {},
    roomName: "grassland",
    ...extra,
  }) as ClientCharacter;

/** A view of a hero alone in grassland, plus `npcs`. */
export function testView(npcs: ClientCharacter[] = [], last: BotIntent = STAND_STILL): BotView {
  const clientState = createClientState();
  const self = character("me", 100, 100);
  clientState.selfId = "me";
  clientState.roomName = "grassland";
  clientState.players.set("me", self);
  for (const npc of npcs) clientState.npcs.set(npc.id, npc);
  return { clientState, self, last };
}
