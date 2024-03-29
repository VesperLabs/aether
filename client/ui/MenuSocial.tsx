import { Fragment, memo } from "react";
import { Menu, useAppContext, MenuHeader, Portrait, MENU_MAX_WIDTH } from "./";
import { ThemeUIStyleObject } from "theme-ui";
import { Flex, Text, Grid, Icon, Button, Box } from "@aether/ui";
import { CLASS_ICON_MAP, arePropsEqualWithKeys } from "@aether/shared";

const ActionButton = ({ player }) => {
  const { partyInvites, socket } = useAppContext();
  const invitation = partyInvites?.find(
    (invite: PartyInvite) => invite?.inviter?.id === player?.id
  );
  if (invitation) {
    return (
      <Button
        variant="wood"
        onClick={() => {
          // join the party
          socket.emit("partyAccept", invitation.partyId);
        }}
      >
        Accept
      </Button>
    );
  }
  return (
    <Button variant="wood" onClick={() => socket.emit("inviteToParty", player?.socketId)}>
      Invite
    </Button>
  );
};

const PartyActionButton = ({ player }) => {
  const { hero, socket } = useAppContext();

  if (hero?.id === player?.id) {
    return (
      <Button variant="wood" onClick={() => socket.emit("partyLeave", player?.id)}>
        Leave
      </Button>
    );
  }
  return;
};

const SocialGrid = (props) => {
  return (
    <Grid
      sx={{
        maxWidth: MENU_MAX_WIDTH,
        width: "100%",
        flex: 1,
        borderRadius: 5,
        bg: "shadow.10",
        p: 1,
        gridTemplateColumns: "min-content 1fr min-content min-content min-content 1fr",
        alignItems: "center",
        gap: 1,
        justifyContent: "end",
        columnGap: 2,
      }}
      {...props}
    />
  );
};

const MenuSocial = memo(({ players, hero, isOpen, setIsOpen, party }: any) => {
  const partyIds = party?.members?.map((p) => p?.id);
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
                {party?.members?.map((player) => {
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
}, arePropsEqualWithKeys(["isOpen", "party", "hero.id", "players"]));

const COLUMN_STYLE: ThemeUIStyleObject = { textTransform: "capitalize", whiteSpace: "nowrap" };

const SocialPlayerRow = (props: { partyPlayer: any; children: any }) => {
  const { partyPlayer, children } = props;
  const { players, party } = useAppContext();
  const player = players?.find((p) => p?.id === partyPlayer?.id);
  const partyLeader = party?.members?.find((p) => p?.isLeader);
  const isLeader = partyLeader?.id === partyPlayer?.id;
  const classString = player ? `Lv. ${player?.stats?.level} ${player?.charClass}` : null;
  const playerIcon = player ? CLASS_ICON_MAP?.[player?.charClass?.toUpperCase()] : null;
  return (
    <Fragment key={partyPlayer?.id}>
      <MemoizedColumn player={player} as={Box} sx={{ position: "relative" }}>
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
    </Fragment>
  );
};

const MemoizedColumn = memo(
  (props: any) => {
    const { as: As = Text } = props;
    return <As sx={COLUMN_STYLE} {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
  }
);

export default MenuSocial;
