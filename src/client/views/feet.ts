import type { Player } from "./player";
import { bodyExtentOf } from "./body-extent";

/**
 * Where a body's feet are drawn, as px below its rig, measured from the art as drawn when dry and
 * standing: the bottom of the skin. Bodies whose art can't be measured yet stand on their `bodySize`.
 */
export function feetOffsetOf(player: Player) {
  const skin = player.skin;
  const extent = bodyExtentOf(skin, player.direction);
  const skinTop = player.bodyOffsetY - skin.displayOriginY * skin.scaleY;
  return extent ? skinTop + (extent.bottom + 1) * skin.scaleY : player.bodySize;
}
