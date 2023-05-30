import { Fragment, memo } from "react";
import {
  Flex,
  Menu,
  useAppContext,
  MenuHeader,
  Text,
  Portrait,
  Grid,
  Icon,
  Button,
  ICONS,
  Box,
} from "./";
import { ThemeUIStyleObject } from "theme-ui";

const ActionButton = ({ player }) => {
  const { partyInvites, socket } = useAppContext();
  const invitation = partyInvites?.find((invite: PartyInvite) => invite?.inviterId === player?.id);
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

const MenuSocial = () => {
  const { players, hero, tabSocial, setTabSocial, party } = useAppContext();
  const partyIds = party?.members?.map((p) => p?.id);
  const otherPlayers = players?.filter((p) => !partyIds?.includes(p?.id) && hero?.id !== p?.id);
  const hasOtherPlayers = otherPlayers?.length > 0;
  const hasParty = partyIds?.length > 0;
  const hasPlayers = hasParty || hasOtherPlayers;
  return (
    <Menu sx={{ display: tabSocial ? "block" : "none" }}>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon={`../assets/icons/social.png`} onClick={() => setTabSocial(false)}>
          Social
        </MenuHeader>
        {hasPlayers && (
          <Flex sx={{ flex: 1, maxWidth: 592, gap: 2, flexDirection: "column" }}>
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
                <MenuHeader icon={`../assets/icons/social.png`} onClick={() => setTabSocial(false)}>
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
          </Flex>
        )}
      </Flex>
    </Menu>
  );
};

const COLUMN_STYLE: ThemeUIStyleObject = { textTransform: "capitalize", whiteSpace: "nowrap" };

const SocialPlayerRow = (props: { partyPlayer: any; children: any }) => {
  const { partyPlayer, children } = props;
  const { players, party } = useAppContext();
  const player = players?.find((p) => p?.id === partyPlayer?.id);
  const partyLeader = party?.members?.find((p) => p?.isLeader);
  const isLeader = partyLeader?.id === partyPlayer?.id;
  const classString = player ? `Lv. ${player?.stats?.level} ${player?.charClass}` : null;
  const playerIcon = player ? ICONS?.[player?.charClass?.toUpperCase()] : null;
  return (
    <Fragment key={partyPlayer?.id}>
      <MemoizedColumn player={player} as={Box} sx={{ position: "relative" }}>
        <Portrait
          user={player}
          scale={1}
          size={25}
          topOffset={-20}
          filterKeys={["accessory", "helmet", "boots"]}
        />
        {isLeader && (
          <Icon
            icon="../assets/icons/crown.png"
            sx={{ position: "absolute", left: "-2px", top: "-11px" }}
          />
        )}
      </MemoizedColumn>

      <MemoizedColumn player={player}>{player?.profile?.userName}</MemoizedColumn>
      <MemoizedColumn as={Icon} player={player} size={24} icon={playerIcon} />
      <MemoizedColumn player={player}>{classString}</MemoizedColumn>
      <Text sx={COLUMN_STYLE}>{partyPlayer?.roomName}</Text>
      <Flex sx={{ justifyContent: "end" }}>{children}</Flex>
    </Fragment>
  );
};

const MemoizedColumn = memo(
  (props: any) => {
    const { as: As = Text, player } = props;
    return <As sx={COLUMN_STYLE} {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
  }
);

export default MenuSocial;
