import { memo, type ComponentProps, type ElementType, type ReactNode } from "react";
import type { PartyMessage } from "@/network";
import type { HudCharacter } from "@/client/hud/app/context";
import { useAppContext } from "@/client/hud/app/context";
import { Portrait } from "@/client/hud/status/portrait";
import type { ThemeUIStyleObject } from "theme-ui";
import { Flex, Text, Grid, Icon, Button, Box, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { CLASS_ICON_MAP } from "@/content";
import { arePropsEqualWithKeys } from "@/ui";

type SocialPlayer = Partial<HudCharacter> | undefined;

/** Action buttons fill their column, so Invite, Pending and Accept are all the same width. */
const ACTION_BUTTON_STYLE: ThemeUIStyleObject = { width: "100%", justifyContent: "center" };

const ActionButton = ({ player }: { player: SocialPlayer }) => {
  const { partyInvites, party, hero, socket } = useAppContext();
  const isPending = party?.invitees?.some(
    (invitee: { id?: string; inviterId?: string }) =>
      invitee?.id === player?.id && invitee?.inviterId === hero?.id,
  );
  const invitation = partyInvites?.find((invite) => invite?.inviter?.id === player?.id);
  if (invitation) {
    return (
      <Button
        variant="wood"
        sx={ACTION_BUTTON_STYLE}
        onClick={() => {
          // join the party
          socket.emit("partyAccept", invitation.partyId);
        }}
      >
        Accept
      </Button>
    );
  }
  if (isPending) {
    return (
      <Button variant="wood" sx={ACTION_BUTTON_STYLE} disabled>
        Pending
      </Button>
    );
  }
  return (
    <Button
      variant="wood"
      sx={ACTION_BUTTON_STYLE}
      onClick={() => player?.socketId && socket.emit("inviteToParty", player.socketId)}
    >
      Invite
    </Button>
  );
};

const PartyActionButton = ({ player }: { player: SocialPlayer }) => {
  const { hero, socket } = useAppContext();

  if (hero?.id === player?.id) {
    return (
      <Button
        variant="wood"
        sx={ACTION_BUTTON_STYLE}
        onClick={() => socket.emit("partyLeave", player?.id)}
      >
        Leave
      </Button>
    );
  }
  return;
};

const SocialGrid = (props: ComponentProps<typeof Grid>) => {
  return (
    <Grid
      sx={{
        maxWidth: MENU_MAX_WIDTH,
        width: "100%",
        flex: 1,
        gridTemplateColumns: SOCIAL_COLUMNS,
        alignItems: "center",
        gap: 1,
        justifyContent: "end",
        columnGap: 2,
      }}
      {...props}
    />
  );
};

interface MenuSocialProps {
  players: HudCharacter[];
  hero: HudCharacter;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  party: PartyMessage | null | undefined;
}

export const MenuSocial = memo(
  ({ players, hero, isOpen, setIsOpen, party }: MenuSocialProps) => {
    const partyIds = party?.members?.map((p: SocialPlayer) => p?.id);
    const otherPlayers = players?.filter((p) => !partyIds?.includes(p?.id) && hero?.id !== p?.id);
    const hasOtherPlayers = otherPlayers?.length > 0;
    const hasParty = partyIds?.length > 0;
    const hasPlayers = hasParty || hasOtherPlayers;
    return (
      <Menu
        sx={{
          display: isOpen ? "flex" : "none",
          flex: 1,
          alignItems: "end",
          flexDirection: "column",
        }}
      >
        <MenuHeader icon={`./assets/icons/social.png`} onClick={() => setIsOpen(false)}>
          Social
        </MenuHeader>
        {hasPlayers && (
          <>
            {hasOtherPlayers && (
              <SocialGrid>
                {otherPlayers?.map((player) => {
                  return (
                    <SocialPlayerRow partyPlayer={player} key={player?.id}>
                      <ActionButton player={player} />
                    </SocialPlayerRow>
                  );
                })}
              </SocialGrid>
            )}
            {hasParty && (
              <>
                <MenuHeader icon={`./assets/icons/social.png`} onClick={() => setIsOpen(false)}>
                  Party
                </MenuHeader>
                <SocialGrid>
                  {party?.members?.map((player: SocialPlayer) => {
                    return (
                      <SocialPlayerRow partyPlayer={player} key={player?.id}>
                        <PartyActionButton player={player} />
                      </SocialPlayerRow>
                    );
                  })}
                </SocialGrid>
              </>
            )}
          </>
        )}
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "party", "hero.id", "players"]),
);

const COLUMN_STYLE: ThemeUIStyleObject = {
  textTransform: "capitalize",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
/** One player's tile: spans their six columns and lines its cells up with them. */
const TILE_STYLE: ThemeUIStyleObject = {
  gridColumn: "span 6",
  display: "grid",
  gridTemplateColumns: "subgrid",
  alignItems: "center",
  bg: "shadow.20",
  borderRadius: 4,
  p: 1,
};

/**
 * Two player tiles per row, six cells each. Fixed widths so the players list and the party list
 * line up; each tile is a subgrid, so its cells follow these columns too.
 */
const PLAYER_COLUMNS = "28px minmax(0, 1fr) 24px 84px minmax(0, 1fr) 80px";
const SOCIAL_COLUMNS = `${PLAYER_COLUMNS} ${PLAYER_COLUMNS}`;

const SocialPlayerRow = (props: { partyPlayer: SocialPlayer; children: ReactNode }) => {
  const { partyPlayer, children } = props;
  const { players, party } = useAppContext();
  const player = players?.find((p) => p?.id === partyPlayer?.id);
  const partyLeader = party?.members?.find((p: { isLeader?: boolean }) => p?.isLeader);
  const isLeader = partyLeader?.id === partyPlayer?.id;
  const classString = player ? `Lv. ${player?.stats?.level} ${player?.charClass}` : null;
  const playerIcon = player
    ? CLASS_ICON_MAP?.[player?.charClass?.toUpperCase() as keyof typeof CLASS_ICON_MAP]
    : null;
  return (
    <Box sx={TILE_STYLE}>
      <MemoizedColumn player={player} as={Box} sx={{ position: "relative", overflow: "visible" }}>
        <Portrait
          player={player}
          scale={0.5}
          size={25}
          topOffset={13}
          filteredSlots={["boots", "pants", "hands", "gloves"]}
        />
        {isLeader && (
          <Icon
            icon="./assets/icons/crown.png"
            sx={{ position: "absolute", left: "-2px", top: "-11px" }}
          />
        )}
      </MemoizedColumn>
      <MemoizedColumn player={player}>{player?.profile?.userName}</MemoizedColumn>
      <MemoizedColumn player={player} as={Icon} size={24} icon={playerIcon} />
      <MemoizedColumn player={player}>{classString}</MemoizedColumn>
      <Text sx={COLUMN_STYLE}>{partyPlayer?.roomName}</Text>
      <Flex sx={{ justifyContent: "end" }}>{children}</Flex>
    </Box>
  );
};

const MemoizedColumn = memo(
  (props: { as?: ElementType; player?: SocialPlayer } & Record<string, unknown>) => {
    const { as: As = Text } = props;
    return <As sx={COLUMN_STYLE} {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
    return false;
  },
);
