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
import { isMobile } from "../utils";
import "react-tooltip/dist/react-tooltip.css";

const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug, game }) {
  const [isConnected, setIsConnected] = useState(true);
  const [hero, setHero] = useState();
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
      setHero(player);
    };

    const playerUpdate = (player = {}) => {
      const socketId = localStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        setHero(player);
      }
    };

    const lootGrabbed = ({ player }) => {
      const socketId = localStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        setHero(player);
      }
    };

    const updateHud = () => {
      const hero = game.scene.getScene("SceneMain").hero;
      setHero((prev) => ({ ...prev, state: hero?.state, stats: hero?.stats }));
    };

    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("heroInit", heroInit);
    socket.on("playerUpdate", playerUpdate);
    socket.on("lootGrabbed", lootGrabbed);
    window.addEventListener("UPDATE_HUD", updateHud);
    window.addEventListener("HERO_RESPAWN", updateHud);
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("heroInit", heroInit);
      socket.off("playerUpdate", playerUpdate);
      socket.on("lootGrabbed", lootGrabbed);
      window.removeEventListener("UPDATE_HUD", updateHud);
      window.removeEventListener("HERO_RESPAWN", updateHud);
    };
  }, []);

  if (!hero) return;

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
          hero,
          socket,
          debug,
          game,
        }}
      >
        <GameWrapper>
          {hero?.state?.isDead && <ModalRespawn />}
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

const KeyboardKey = ({ name }) => {
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        right: 0,
        bg: "#EEE",
        px: "5px",
        pb: "4px",
        lineHeight: 1,
        borderRadius: 3,
        textShadow: "none",
        color: "#000",
        fontSize: "10px",
        fontWeight: "bold",
        boxShadow: `#CCCCCC 0px -2px 0px 2px inset,
                     #000000 0px 0px 0px 1px,
                     #ffffff 0px -1px 0px 2px inset`,
      }}
    >
      {name}
    </Box>
  );
};

const SkillButton = ({ eventName, iconName, size, keyboardKey }) => {
  return (
    <Box sx={{ position: "relative" }}>
      <Button
        variant="menu"
        onTouchStart={(e) => {
          window.dispatchEvent(new Event(eventName));
        }}
        sx={{
          p: size,
          borderRadius: "100%",
        }}
      >
        <Icon icon={`../assets/icons/${iconName}.png`} />
      </Button>
      {!isMobile && <KeyboardKey name={keyboardKey} />}
    </Box>
  );
};

const SkillButtons = () => {
  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        justifyContent: "end",
        alignItems: "flex-end",
      }}
    >
      <SkillButton size={24} iconName="grab" eventName="HERO_GRAB" keyboardKey="F" />
      <SkillButton size={24} iconName="handRight" eventName="HERO_ATTACK" keyboardKey="SPACE" />
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
      <SkillButtons />
      <MenuEquipment />
      <MenuInventory />
      <Flex sx={{ gap: 1, alignItems: "center", bg: "shadow.30", p: 2 }}>
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
