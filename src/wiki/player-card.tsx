import { Box, Flex, PlayerRender, Text } from "@/ui";
import { questList } from "@/content";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import type { WikiPlayer } from "./page-players";
import { CARD_COLORS } from "./card-pool";

/** The character, drawn small: the head and shoulders fill the box. */
export const PlayerFace = ({ player }: { player: WikiPlayer }) => (
  <Flex
    sx={{ width: 64, height: 64, flexShrink: 0, alignItems: "center", justifyContent: "center" }}
  >
    <PlayerRender player={player} sx={{ width: 80, height: 80 }} />
  </Flex>
);

/**
 * A player on parchment, laid out like the keeper cards: their face, name, level and class, and a
 * line about them. Always the same size; selecting it opens the player's menus in a drawer.
 */
export const PlayerCard = ({
  player,
  selected,
  onSelect,
}: {
  player: WikiPlayer;
  selected: boolean;
  onSelect: () => void;
}) => (
  <Box
    as="button"
    onClick={player.isGhost ? undefined : onSelect}
    sx={{
      ...PAPER_STYLE,
      display: "block",
      width: "100%",
      p: 4,
      font: "inherit",
      textAlign: "left",
      cursor: player.isGhost ? "default" : "pointer",
      opacity: player.isGhost ? 0.5 : 1,
      /* The selected card is ringed just outside its edge; darkening the paper would leave the
         corner ornaments' paper-coloured fill showing. */
      outline: selected ? `1px solid ${PAPER.fill}` : "none",
      outlineOffset: "3px",
    }}
  >
    <PaperFrame />
    {/* A wide gap, so weapons held out to the side don't run into the name. */}
    <Flex sx={{ gap: 4, alignItems: "center" }}>
      <PlayerFace player={player} />
      <Box sx={{ minWidth: 0 }}>
        <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0, ...ONE_LINE }}>
          {player.profile?.userName}
        </Text>
        <Text as="p" sx={{ color: CARD_COLORS.player, fontSize: 1, fontWeight: 600, m: 0 }}>
          {player.isGhost ? (
            <>&nbsp;</>
          ) : (
            `Level ${player.stats?.level ?? 1} ${player.charClass ?? ""}`
          )}
        </Text>
        <Text as="p" sx={{ color: PAPER.muted, fontSize: 0, m: 0, mt: 1, ...ONE_LINE }}>
          <About player={player} />
        </Text>
      </Box>
    </Flex>
  </Box>
);

const ONE_LINE = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** When a player last played and how many quests they've done; where a keeper stands. */
export const About = ({ player }: { player: WikiPlayer }) => {
  if (player.isGhost) return <>&nbsp;</>;
  if (player.kind === "keeper") return <>{player.roomName}</>;
  const done = player.quests?.filter((quest) => quest?.isCompleted).length ?? 0;
  const lastLogin = new Date(player.updatedAt ?? NaN).toLocaleDateString("en-US");
  return (
    <>
      Last seen {lastLogin} · {done}/{Object.keys(questList).length} quests
    </>
  );
};
