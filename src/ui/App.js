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
  MenuKeeper,
  MenuHud,
  ModalRespawn,
  ModalDropAmount,
  KeyboardKey,
} from "./";
import { isMobile, getSpinDirection } from "../utils";
import "react-tooltip/dist/react-tooltip.css";

const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug, game }) {
  const [isConnected, setIsConnected] = useState(true);
  const [dropItem, setDropItem] = useState();
  const [hero, setHero] = useState();
  const [keeper, setKeeper] = useState(); // data related to NPC you are chatting with
  const [tabKeeper, setTabKeeper] = useState(false);
  const [tabEquipment, setTabEquipment] = useState(false);
  const [tabInventory, setTabInventory] = useState(false);
  const [showButtonChat, setShowButtonChat] = useState(false);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onHeroInit = (payload = {}) => {
      const { players, socketId } = payload;
      const player = players?.find((p) => p?.socketId === socketId);
      localStorage.setItem("socketId", socketId);
      setHero(player);
    };

    const onPlayerUpdate = (player = {}) => {
      const socketId = localStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        setHero(player);
      }
    };

    const onKeeperDataUpdate = (args) => {
      const scene = game.scene.getScene("SceneMain");
      const hero = scene.hero;
      const npc = scene.npcs.getChildren().find((n) => n?.id === args?.npcId);
      if (hero?.state?.targetNpcId === args?.npcId) {
        setKeeper({ ...npc, keeperData: args?.keeperData });
        setTabKeeper(true);
      }
    };

    const onHeroChatNpc = () => {
      const scene = game.scene.getScene("SceneMain");
      const hero = scene.hero;
      const npcId = scene?.hero?.state?.targetNpcId;
      const npc = scene.npcs.getChildren().find((n) => n?.id === npcId);
      const direction = getSpinDirection(hero, npc);

      setTabKeeper((prev) => {
        if (!prev) {
          socket.emit("chatNpc", { npcId: hero?.state?.targetNpcId });
          if (hero?.direction !== direction) socket.emit("changeDirection", direction);
        }
        if (prev) {
          return false;
        }
      });
    };

    const onLootGrabbed = ({ player }) => {
      const socketId = localStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        setHero(player);
      }
    };

    const onUpdateHud = () => {
      const hero = game.scene.getScene("SceneMain").hero;
      setHero((prev) => ({ ...prev, state: hero?.state, stats: hero?.stats }));
    };

    const onNearNpc = (e) => {
      setShowButtonChat(!!e?.detail);
      if (!e?.detail) {
        setTabKeeper(false);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("heroInit", onHeroInit);
    socket.on("playerUpdate", onPlayerUpdate);
    socket.on("lootGrabbed", onLootGrabbed);
    socket.on("keeperDataUpdate", onKeeperDataUpdate);
    window.addEventListener("HERO_NEAR_NPC", onNearNpc);
    window.addEventListener("HERO_CHAT_NPC", onHeroChatNpc);
    window.addEventListener("UPDATE_HUD", onUpdateHud);
    window.addEventListener("HERO_RESPAWN", onUpdateHud);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("heroInit", onHeroInit);
      socket.off("playerUpdate", onPlayerUpdate);
      socket.off("lootGrabbed", onLootGrabbed);
      socket.off("keeperDataUpdate", onKeeperDataUpdate);
      window.removeEventListener("HERO_NEAR_NPC", onNearNpc);
      window.removeEventListener("HERO_CHAT_NPC", onHeroChatNpc);
      window.removeEventListener("UPDATE_HUD", onUpdateHud);
      window.removeEventListener("HERO_RESPAWN", onUpdateHud);
    };
  }, []);

  if (!hero) return;

  return (
    <ThemeProvider theme={theme}>
      <AppContext.Provider
        value={{
          isConnected,
          showButtonChat,
          setShowButtonChat,
          setIsConnected,
          setTabEquipment,
          setTabInventory,
          setTabKeeper,
          setKeeper,
          dropItem,
          setDropItem,
          tabEquipment,
          tabInventory,
          keeper,
          tabKeeper,
          hero,
          socket,
          debug,
          game,
        }}
      >
        <GameWrapper>
          {hero?.state?.isDead && <ModalRespawn />}
          {dropItem && <ModalDropAmount />}
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
        <SkillButton size={24} iconName="chat" eventName="HERO_CHAT_NPC" keyboardKey="C" />
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
  const {
    isConnected,
    tabEquipment,
    setTabEquipment,
    tabInventory,
    setTabInventory,
    setTabKeeper,
  } = useAppContext();
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
      <MenuKeeper />
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
          keyboardKey="D"
          iconName="bag"
          isActive={tabInventory}
          onClick={() => setTabInventory((prev) => !prev)}
        />
        <KeyboardKey
          name={"ESCAPE"}
          hidden={true}
          onKeyUp={(e) => {
            setTabEquipment(false);
            setTabInventory(false);
            setTabKeeper(false);
          }}
        />
      </Flex>
    </Flex>
  );
};

export default App;
