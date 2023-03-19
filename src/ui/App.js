import React, { useEffect, useState, createContext, useContext } from "react";
import {
  ThemeProvider,
  Box,
  Button,
  theme,
  Flex,
  Icon,
  MenuEquipment,
  MenuInventory,
  MenuHud,
  ModalRespawn,
} from "./";

const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug, game }) {
  const [isConnected, setIsConnected] = useState(true);
  const [player, setPlayer] = useState();
  const [tabEquipment, setTabEquipment] = useState(false);
  const [tabInventory, setTabInventory] = useState(false);

  useEffect(() => {
    const connect = () => {
      setIsConnected(true);
    };

    const disconnect = () => {
      setIsConnected(false);
    };

    const heroInit = (payload = {}) => {
      const { players, socketId } = payload;
      const player = players?.find((p) => p?.socketId === socketId);
      localStorage.setItem("socketId", socketId);
      setPlayer(player);
    };

    const playerUpdate = (player = {}) => {
      const socketId = localStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        setPlayer(player);
      }
    };

    const updateHud = () => {
      const hero = game.scene.getScene("SceneMain").hero;
      setPlayer((prev) => ({ ...prev, state: hero?.state, stats: hero?.stats }));
    };

    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("heroInit", heroInit);
    socket.on("playerUpdate", playerUpdate);
    window.addEventListener("UPDATE_HUD", updateHud);
    window.addEventListener("HERO_RESPAWN", updateHud);
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("heroInit", heroInit);
      socket.off("playerUpdate", playerUpdate);
      window.removeEventListener("UPDATE_HUD", updateHud);
      window.removeEventListener("HERO_RESPAWN", updateHud);
    };
  }, []);

  if (!player) return;

  return (
    <ThemeProvider theme={theme}>
      <AppContext.Provider
        value={{
          isConnected,
          setIsConnected,
          setTabEquipment,
          setTabInventory,
          tabEquipment,
          tabInventory,
          player,
          socket,
          debug,
          game,
        }}
      >
        <GameWrapper>
          {player?.state?.isDead && <ModalRespawn />}
          <MenuHud />
          <MenuBar />
        </GameWrapper>
      </AppContext.Provider>
    </ThemeProvider>
  );
}

/* Holds all HUD elements. Ignores clicks. */
const GameWrapper = (props) => {
  return (
    <Box
      sx={{
        inset: "0 0 0 0",
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
        {...props}
      />
    </Box>
  );
};

const AttackPad = () => {
  return (
    <Flex
      sx={{
        p: 2,
        justifyContent: "end",
      }}
    >
      <Button
        variant="menu"
        onTouchStart={(e) => {
          window.dispatchEvent(new Event("HERO_ATTACK"));
        }}
        sx={{
          p: 44,
          borderRadius: "100%",
        }}
      >
        <Icon icon="../assets/icons/handRight.png" />
      </Button>
    </Flex>
  );
};

const MenuBar = () => {
  const { isConnected, tabEquipment, setTabEquipment, tabInventory, setTabInventory } =
    useAppContext();
  return (
    <Flex
      sx={{
        bottom: 0,
        right: 0,
        left: 0,
        flexDirection: "column",
        position: "fixed",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <AttackPad />
      <MenuEquipment />
      <MenuInventory />
      <Flex sx={{ gap: 1, alignItems: "center", bg: "shadow.10", p: 2 }}>
        <Box>
          {isConnected ? (
            <Icon icon="../assets/icons/success.png" sx={{ opacity: 0.5 }} />
          ) : (
            <Icon icon="../assets/icons/danger.png" sx={{ opacity: 0.5 }} />
          )}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="menu"
          className={tabEquipment ? "active" : ""}
          onClick={() => setTabEquipment((prev) => !prev)}
        >
          <Icon icon="../assets/icons/helmet.png" />
        </Button>
        <Button
          variant="menu"
          className={tabInventory ? "active" : ""}
          onClick={() => setTabInventory((prev) => !prev)}
        >
          <Icon icon="../assets/icons/bag.png" />
        </Button>
      </Flex>
    </Flex>
  );
};

export default App;
