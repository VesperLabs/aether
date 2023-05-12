import { Fragment } from "react";
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
} from "./";

const ActionButton = ({ player }) => {
  const { partyInvites, hero, socket, party } = useAppContext();
  const invitation = partyInvites?.find((invite: PartyInvite) => invite?.inviterId === player?.id);
  const playerInParty = party?.members?.find((p) => p?.id === player?.id);
  const isLeader = party?.members?.find((p) => p?.id === hero?.id)?.isLeader;
  if (playerInParty) {
    return isLeader ? (
      <Button variant="wood">🥾 Kick</Button>
    ) : (
      <Button disabled variant="wood">
        Partied
      </Button>
    );
  }
  if (invitation) {
    return (
      <Button variant="wood" onClick={() => socket.emit("partyAccept", invitation.partyId)}>
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

const MenuSocial = () => {
  const { hero, players, tabSocial, setTabSocial } = useAppContext();
  const otherPlayers = players?.filter((p) => p?.id !== hero?.id);
  return tabSocial ? (
    <Menu>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="social" onClick={() => setTabSocial(false)}>
          Social
        </MenuHeader>
        <Grid
          sx={{
            flex: 1,
            borderRadius: 5,
            bg: "shadow.10",
            p: 1,
            gridTemplateColumns: "min-content 18em min-content 1fr min-content",
            alignItems: "center",
            gap: 1,
            justifyContent: "end",
            maxWidth: 592,
            columnGap: 2,
          }}
        >
          {otherPlayers?.map((player) => {
            return (
              <Fragment key={player?.id}>
                <Portrait
                  user={player}
                  scale={1}
                  size={25}
                  topOffset={-20}
                  filterKeys={["accessory", "helmet", "boots"]}
                />
                <Text>{player?.profile?.userName}</Text>
                <Icon size={24} icon={ICONS?.[player?.charClass?.toUpperCase()]} />
                <Text sx={{ textTransform: "capitalize" }}>
                  Lv. {player?.stats?.level} {player?.charClass}
                </Text>
                <Flex>
                  <ActionButton player={player} />
                </Flex>
              </Fragment>
            );
          })}
        </Grid>
      </Flex>
    </Menu>
  ) : (
    <></>
  );
};

export default MenuSocial;
