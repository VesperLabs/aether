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
  KeyboardKey,
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
  const [showButtonChat, setShowButtonChat] = useState(false);

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

    const nearNpc = (e) => {
      const hero = game.scene.getScene("SceneMain").hero;
      setShowButtonChat(!!e?.detail);
    };

    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("heroInit", heroInit);
    socket.on("playerUpdate", playerUpdate);
    socket.on("lootGrabbed", lootGrabbed);
    window.addEventListener("HERO_NEAR_NPC", nearNpc);
    window.addEventListener("UPDATE_HUD", updateHud);
    window.addEventListener("HERO_RESPAWN", updateHud);
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("heroInit", heroInit);
      socket.off("playerUpdate", playerUpdate);
      socket.off("lootGrabbed", lootGrabbed);
      window.removeEventListener("HERO_NEAR_NPC", nearNpc);
      window.removeEventListener("UPDATE_HUD", updateHud);
      window.removeEventListener("HERO_RESPAWN", updateHud);
    };
  }, []);

  if (!hero) return;

  return (
    <ThemeProvider theme={theme}>
      <AppContext.Provider
        value={{
          showButtonChat,
          setShowButtonChat,
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
      <KeyboardKey
        name={keyboardKey}
        hidden={isMobile}
        onKeyUp={(e) => {
          window.dispatchEvent(new Event(eventName));
        }}
      />
    </Box>
  );
};

const SkillButtons = () => {
  const { showButtonChat } = useAppContext();
  return (
    <Flex
      sx={{
        gap: 2,
        p: 1,
        py: 2,
        justifyContent: "end",
        alignItems: "flex-end",
      }}
    >
      {showButtonChat && (
        <SkillButton size={24} iconName="chat" eventName="HERO_INTERACT" keyboardKey="C" />
      )}
      <SkillButton size={24} iconName="grab" eventName="HERO_GRAB" keyboardKey="F" />
      <SkillButton size={24} iconName="handRight" eventName="HERO_ATTACK" keyboardKey="SPACE" />
    </Flex>
  );
};

const MenuButton = ({ keyboardKey, onClick, iconName, isActive }) => {
  return (
    <Box sx={{ position: "relative" }}>
      <Button variant="menu" className={isActive ? "active" : ""} onClick={onClick}>
        <Icon icon={`../assets/icons/${iconName}.png`} />
      </Button>
      {!isMobile && (
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name={keyboardKey} onKeyUp={onClick} />
      )}
    </Box>
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
        <MenuButton
          keyboardKey="E"
          iconName="helmet"
          isActive={tabEquipment}
          onClick={() => setTabEquipment((prev) => !prev)}
        />
        <MenuButton
          keyboardKey="I"
          iconName="bag"
          isActive={tabInventory}
          onClick={() => setTabInventory((prev) => !prev)}
        />
      </Flex>
    </Flex>
  );
};

export default App;
