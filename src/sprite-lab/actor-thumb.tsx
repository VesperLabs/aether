import { Box, PlayerPortrait, SheetThumb, THUMB_SIZE } from "@/ui";
import type { ActorDefinition } from "@/content";
import { toRenderable, type ActorLook } from "./actor-looks";
import { parseLook } from "./sheets";

/**
 * An NPC as the game draws it, tints and all, fitted whole into a thumbnail. A human is dressed
 * by the game's portrait; a mob is its own sheet, as the portrait's crop is cut for a human's
 * frame and would cut a big mob wrong.
 */
export const ActorThumb = ({ actor, look }: { actor: ActorDefinition; look: ActorLook }) => {
  const body = parseLook(look.atlas);
  if (body.texture !== "human") return <SheetThumb texture={body.texture} tint={body.tint} />;
  return (
    <Box aria-hidden sx={{ width: THUMB_SIZE, height: THUMB_SIZE, flexShrink: 0 }}>
      <PlayerPortrait
        player={toRenderable(actor)}
        scale={1}
        sx={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </Box>
  );
};
