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

const MenuSocial = () => {
  const { hero, players, tabSocial, setTabSocial } = useAppContext();
  const otherPlayers = players?.filter((p) => p);
  return tabSocial ? (
    <Menu>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="social" onClick={() => setTabSocial(false)}>
          Social
        </MenuHeader>
        <Grid
          sx={{
            gridTemplateColumns: "min-content 1fr min-content 1fr min-content",
            alignItems: "center",
            gap: 1,
            justifyContent: "end",
            maxWidth: 592,
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
                  <Button variant="wood">Invite</Button>
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
