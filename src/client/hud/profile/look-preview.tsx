import type { MobProfile } from "@/content";
import { Box, PlayerPortrait, THUMB_SIZE } from "@/ui";

/** Left off the body preview, so it shows just the body. */
const BARE_SLOTS = ["hair", "face", "whiskers"];

/** A body option: the bare human in the character's skin, fitted whole into a thumbnail. */
export const BodyPreview = ({ gender, tint }: { gender: MobProfile["gender"]; tint?: string }) => (
  <Box aria-hidden sx={{ width: THUMB_SIZE, height: THUMB_SIZE, flexShrink: 0 }}>
    <PlayerPortrait
      player={{ profile: { userName: "", race: "human", gender, tint } }}
      filteredSlots={BARE_SLOTS}
      scale={1}
      sx={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  </Box>
);
