import type { Senses } from "../senses";

/** How far apart the agent and the server may think it is, in pixels, once it stands still. */
const AGREE_DISTANCE = 2;

/** Whether the server's pose for the agent matches where the agent thinks it stands. */
export function agreesWithServer(senses: Senses) {
  const served = senses.characters.get(senses.selfId);
  return !!served && Math.hypot(served.x - senses.x, served.y - senses.y) <= AGREE_DISTANCE;
}
