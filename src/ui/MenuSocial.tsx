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
  const { hero, socket, party } = useAppContext();

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
        gridTemplateColumns: "min-content 1fr min-content min-content 1fr",
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
  const hasParty = partyIds?.length > 0;

  return tabSocial ? (
    <Menu>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="social" onClick={() => setTabSocial(false)}>
          Social
        </MenuHeader>

        <Flex sx={{ flex: 1, maxWidth: 592, gap: 2, flexDirection: "column" }}>
          <SocialGrid>
            {otherPlayers?.map((player) => {
              return (
                <SocialPlayerRow partyPlayer={player} key={player?.id}>
                  <ActionButton player={player} />
                </SocialPlayerRow>
              );
            })}
          </SocialGrid>
          {hasParty && (
            <>
              <MenuHeader icon="social" onClick={() => setTabSocial(false)}>
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
      </Flex>
    </Menu>
  ) : (
    <></>
  );
};

const SocialPlayerRow = (props: { partyPlayer: any; children: any }) => {
  const { partyPlayer, children } = props;
  const { players, party } = useAppContext();
  const player = players?.find((p) => p?.id === partyPlayer?.id);
  const partyLeader = party?.members?.find((p) => p?.isLeader);
  const isLeader = partyLeader?.id === partyPlayer?.id;
  return (
    <Fragment key={player?.id}>
      <Box sx={{ position: "relative" }}>
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
      </Box>
      <Text>{player?.profile?.userName}</Text>
      <Icon size={24} icon={ICONS?.[player?.charClass?.toUpperCase()]} />
      <Text sx={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
        Lv. {player?.stats?.level} {player?.charClass}
      </Text>
      <Flex sx={{ justifyContent: "end" }}>{children}</Flex>
    </Fragment>
  );
};

export default MenuSocial;
