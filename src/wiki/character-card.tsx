import { type ActorDefinition } from "@/content";
import { Box, Flex, Text } from "@/ui";
import { CARD_COLORS, CharacterFace, MobFace, keeperCharacter, raceAsset } from "./card-pool";
import { DropsSection, PassiveTag } from "./combat-sections";
import { AbilitiesSection, StatsSection } from "./stat-sections";
import { TradeSections } from "./trade-sections";
import { WalkOnHover } from "./walk-on-hover";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";

/** How an actor is drawn: a human in its gear, or its race's sprite sheet. */
export type ActorArt = {
  character?: ReturnType<typeof keeperCharacter>;
  asset?: ReturnType<typeof raceAsset>;
};

/** Built once per actor: a new character object each render would make the renderer redraw. */
export const actorArt = (actor: ActorDefinition): ActorArt =>
  actor.profile.race === "human"
    ? { character: keeperCharacter(actor) }
    : { asset: raceAsset(actor.profile.race) };

/** One actor's card: a header, the stats every actor shares, then a section for each part it has. */
export const CharacterCard = ({ actor, art }: { actor: ActorDefinition; art: ActorArt }) => (
  <WalkOnHover sx={{ ...PAPER_STYLE, p: 4 }}>
    <PaperFrame />
    {/* A wide gap, so weapons held out to the side don't run into the name. */}
    <Flex sx={{ gap: 4, alignItems: "center" }}>
      <Flex
        sx={{
          width: 64,
          height: 64,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {art.character && <CharacterFace character={art.character} />}
        {art.asset && <MobFace asset={art.asset} tint={actor.profile.tint} size={64} shadow />}
      </Flex>
      <Box sx={{ minWidth: 0 }}>
        <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0 }}>
          {actor.profile.userName}
        </Text>
        <Text as="p" sx={{ color: CARD_COLORS.character, fontSize: 1, fontWeight: 600, m: 0 }}>
          Level {actor.baseStats?.level ?? 1} {actor.charClass}
          <PassiveTag actor={actor} />
        </Text>
      </Box>
    </Flex>
    <Text
      as="p"
      sx={{
        color: PAPER.muted,
        fontSize: 1,
        lineHeight: 1.5,
        m: 0,
        mt: 4,
        minHeight: "3em",
        fontStyle: "italic",
      }}
    >
      {actor.flavor}
    </Text>
    <StatsSection actor={actor} />
    <AbilitiesSection actor={actor} />
    <TradeSections actor={actor} />
    <DropsSection actor={actor} />
  </WalkOnHover>
);
