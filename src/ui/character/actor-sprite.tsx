import { actors, assetList, getBody, isActorId, type ActorDefinition } from "@/content";
import { PlayerRender } from "./player-render";
import { WalkingSprite } from "./walking-sprite";

/**
 * An actor standing and facing out, by its content name: its race's sheet, or for a layered body
 * (people) the body in its own skin, hair and face. Nothing for a name that isn't an actor.
 */
export const ActorSprite = ({
  name,
  size = 32,
  maxScale,
}: {
  name: string;
  size?: number;
  /** A race sheet grows by whole steps up to this scale, within `size`, rather than filling it. */
  maxScale?: number;
}) => {
  const actor = isActorId(name) ? (actors[name] as ActorDefinition) : undefined;
  if (!actor) return null;
  const { race, tint } = actor.profile;
  if (getBody(race).layered) {
    return <PlayerRender player={{ profile: actor.profile }} sx={{ width: size, height: size }} />;
  }
  const asset = assetList.find((a) => a?.texture === race);
  if (!asset) return null;
  return <WalkingSprite asset={asset} tint={tint} size={size} maxScale={maxScale} />;
};
