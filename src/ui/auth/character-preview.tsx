import { useState } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex, Icon, Text } from "@/ui/kit";
import { PlayerRender, type RenderablePlayer } from "@/ui/character";
import { CLASS_ICON_MAP } from "@/content";
import type { LoginCharacter } from "@/network";
import { CHAR_CLASS_SELECT, TOP_SLOT_SX } from "./char-class-select";

const PORTRAIT_WIDTH = 44;
/** Taller than the box, so the head rises out of its top. */
const PORTRAIT_HEIGHT = 50;

/** Down the sprite's 160px frame: where the legs start to fade, gone just above the email input. */
const LEG_FADE = "linear-gradient(to bottom, black 85px, transparent 110px)";

const CARD_SX: ThemeUIStyleObject = {
  position: "relative",
  height: "100%",
  alignItems: "center",
  gap: 3,
  bg: "shadow.20",
  borderRadius: 4,
  pr: 2,
};

/** The bare body that holds the place of a character. */
const BODY: RenderablePlayer = { profile: { userName: "", race: "human", gender: "male" } };
const BODY_HIDDEN_SLOTS = ["hair", "face", "whiskers"];

const PORTRAIT_SLOT_SX: ThemeUIStyleObject = {
  position: "relative",
  alignSelf: "flex-end",
  flexShrink: 0,
  width: PORTRAIT_WIDTH,
  height: PORTRAIT_HEIGHT,
};

const SPRITE_LAYER_SX: ThemeUIStyleObject = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const SPRITE_SX: ThemeUIStyleObject = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%,-50%)",
  mt: 10,
  maskImage: LEG_FADE,
};

const SkeletonBar = ({ width }: { width: number }) => (
  <Box sx={{ width, height: 8, bg: "shadow.10", borderRadius: 2 }} />
);

const BodyLayer = ({ sx }: { sx?: ThemeUIStyleObject }) => (
  <Box sx={{ ...SPRITE_LAYER_SX, opacity: 0.3, ...sx }}>
    <PlayerRender player={BODY} filteredSlots={BODY_HIDDEN_SLOTS} sx={SPRITE_SX} />
  </Box>
);

/** No character to show, or none yet. */
const PlaceholderCard = () => (
  <Flex sx={CARD_SX}>
    <Box sx={PORTRAIT_SLOT_SX}>
      <BodyLayer />
    </Box>
    <Flex sx={{ flexDirection: "column", gap: 1 }}>
      <SkeletonBar width={72} />
      <SkeletonBar width={44} />
    </Flex>
  </Flex>
);

/* Whole-number scale, so the sprite's pixels stay even. The body holds the place until the sprite
   is drawn, then fades out as the character rises in, so there is never an empty frame. */
const RisingPortrait = ({ character }: { character: LoginCharacter }) => {
  const [isDrawn, setIsDrawn] = useState(false);
  return (
    <>
      <BodyLayer
        sx={{
          animation: isDrawn ? "portrait-fade-out .35s ease-out both" : "none",
          "@keyframes portrait-fade-out": {
            to: { opacity: 0 },
          },
        }}
      />
      <Box
        sx={{
          ...SPRITE_LAYER_SX,
          opacity: isDrawn ? 1 : 0,
          animation: isDrawn ? "portrait-rise .35s ease-out both" : "none",
          "@keyframes portrait-rise": {
            from: { opacity: 0, transform: "translateY(12px)" },
          },
        }}
      >
        <PlayerRender
          player={{ ...character, equipment: { ...character.equipment, handRight: null } }}
          onLoadComplete={setIsDrawn}
          sx={SPRITE_SX}
        />
      </Box>
    </>
  );
};

const CharacterCard = ({
  character,
  isActive,
}: {
  character: LoginCharacter;
  isActive: boolean;
}) => {
  const { charClass, level, profile } = character;
  return (
    <Flex sx={CARD_SX}>
      <Box sx={PORTRAIT_SLOT_SX}>
        {/* Remounted on landing on the tab or a new character, which replays the rise */}
        {isActive && <RisingPortrait key={profile?.userName} character={character} />}
      </Box>
      <Flex sx={{ flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Text sx={{ fontSize: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
          {profile?.userName}
        </Text>
        {level != null && <Text sx={{ fontSize: 0, opacity: 0.7 }}>Lv. {level}</Text>}
      </Flex>
      {charClass && (
        <Icon
          size={22}
          data-tooltip-id="login"
          data-tooltip-content={`${charClass[0].toUpperCase()}${charClass.slice(1)}`}
          icon={CLASS_ICON_MAP[charClass.toUpperCase() as keyof typeof CLASS_ICON_MAP]}
          sx={{ flexShrink: 0 }}
        />
      )}
    </Flex>
  );
};

/** The login tab's top slot: whose account this is.  */
export const CharacterPreview = ({
  character,
  isActive,
}: {
  character: LoginCharacter | null;
  isActive: boolean;
}) => (
  <Box className={CHAR_CLASS_SELECT} sx={TOP_SLOT_SX}>
    {character ? <CharacterCard character={character} isActive={isActive} /> : <PlaceholderCard />}
  </Box>
);
