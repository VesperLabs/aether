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
  Input,
  MessageBox,
  MenuButton,
  MenuProfile,
  MenuStats,
  MenuQuests,
  MenuAbilities,
  HUD_CONTAINER_ID,
  Menu,
  ModalLogin,
  MenuSocial,
} from "./";
import { isMobile, getSpinDirection, calculateZoomLevel } from "../utils";
import "react-tooltip/dist/react-tooltip.css";
import { useViewportSizeEffect } from "./hooks";
import { Theme } from "theme-ui";
import { Socket } from "socket.io-client";

interface AppContextValue {
  isLoggedIn: boolean;
  isConnected: boolean;
  isLoaded: boolean;
  showButtonChat: boolean;
  setShowButtonChat: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setTabEquipment: React.Dispatch<React.SetStateAction<boolean>>;
  setTabInventory: React.Dispatch<React.SetStateAction<boolean>>;
  setTabKeeper: React.Dispatch<React.SetStateAction<boolean>>;
  setKeeper: React.Dispatch<React.SetStateAction<undefined>>;
  setTabChat: React.Dispatch<React.SetStateAction<boolean>>;
  setTabProfile: React.Dispatch<React.SetStateAction<boolean>>;
  setTabStats: React.Dispatch<React.SetStateAction<boolean>>;
  setTabSocial: React.Dispatch<React.SetStateAction<boolean>>;
  setTabQuests: React.Dispatch<React.SetStateAction<boolean>>;
  setDropItem: React.Dispatch<React.SetStateAction<Item | null | false>>;
  setTabAbilities: React.Dispatch<React.SetStateAction<boolean>>;
  messages: Message[];
  bottomOffset: number;
  dropItem: any;
  tabEquipment: boolean;
  tabQuests: boolean;
  tabInventory: boolean;
  tabChat: boolean;
  tabProfile: boolean;
  tabStats: boolean;
  tabSocial: boolean;
  tabAbilities: boolean;
  keeper: any; // data related to NPC you are chatting with
  tabKeeper: boolean;
  hero: FullCharacterState;
  socket: Socket;
  debug: boolean;
  game: Phaser.Game;
  zoom: any;
}

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useAppContext = () => {
  return useContext(AppContext);
};

const getHudZoom = () => {
  const viewportArea = window.innerWidth * window.innerHeight;
  return calculateZoomLevel({
    viewportArea,
    baseZoom: 0.75,
    maxZoom: 2,
    divisor: 3000000,
  });
};

function App({ socket, debug, game }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dropItem, setDropItem] = useState();
  const [hero, setHero] = useState<FullCharacterState>();
  const [keeper, setKeeper] = useState();
  const [messages, setMessages] = useState([]);
  const [tabKeeper, setTabKeeper] = useState(false);
  const [tabEquipment, setTabEquipment] = useState(false);
  const [tabInventory, setTabInventory] = useState(false);
  const [tabChat, setTabChat] = useState(false);
  const [tabProfile, setTabProfile] = useState(false);
  const [tabStats, setTabStats] = useState(false);
  const [tabSocial, setTabSocial] = useState(false);
  const [tabQuests, setTabQuests] = useState(false);
  const [tabAbilities, setTabAbilities] = useState(false);
  const [showButtonChat, setShowButtonChat] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [zoom, setZoom] = useState(getHudZoom());

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsLoggedIn(false);
      socket.connect();
    };

    const onMessage = (payload: Message) => {
      setMessages((prev) => [...prev, payload]);
    };

    const onPlayerJoin = (_, args) => {
      /* Only show player join message if the user logged in, not if entered door */
      if (args?.isLogin)
        setMessages((prev) => [
          ...prev,
          { type: "info", message: "A player has joined the game." },
        ]);
    };

    const onHeroInit = (
      payload: { players: Array<FullCharacterState>; socketId: string },
      args
    ) => {
      const { players, socketId } = payload;
      const player: FullCharacterState = players?.find((p) => p?.socketId === socketId);
      localStorage.setItem("socketId", socketId);
      setHero(player);
      if (args?.isLogin) setIsLoggedIn(true);
    };

    const onBuffUpdate = (payload: { players: Array<FullCharacterState>; socketId: string }) => {
      const { players } = payload;
      const socketId = localStorage.getItem("socketId");
      const player: FullCharacterState = players?.find((p) => p?.socketId === socketId);
      setHero((prev) => ({ ...prev, ...player }));
    };

    const onPlayerUpdate = (player: FullCharacterState, args) => {
      const socketId = localStorage.getItem("socketId");
      /* If the player is the current player */
      if (socketId === player?.socketId) {
        setHero(player);
        if (args?.didLevel) {
          setMessages((prev) => [
            ...prev,
            { type: "success", message: `You are now level ${player?.stats?.level}!` },
          ]);
        }
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
      const hero: FullCharacterState = game.scene.getScene("SceneMain").hero;
      setHero((prev) => ({ ...prev, state: hero?.state, stats: hero?.stats }));
    };

    const onNearNpc = (e) => {
      setShowButtonChat(!!e?.detail);
      if (!e?.detail) {
        setTabKeeper(false);
      }
    };

    const onGameLoaded = () => {
      setIsLoaded(true);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("heroInit", onHeroInit);
    socket.on("buffUpdate", onBuffUpdate);
    socket.on("playerUpdate", onPlayerUpdate);
    socket.on("lootGrabbed", onLootGrabbed);
    socket.on("keeperDataUpdate", onKeeperDataUpdate);
    socket.on("message", onMessage);
    socket.on("playerJoin", onPlayerJoin);
    window.addEventListener("HERO_NEAR_NPC", onNearNpc);
    window.addEventListener("HERO_CHAT_NPC", onHeroChatNpc);
    window.addEventListener("UPDATE_HUD", onUpdateHud);
    window.addEventListener("HERO_RESPAWN", onUpdateHud);
    window.addEventListener("GAME_LOADED", onGameLoaded);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("heroInit", onHeroInit);
      socket.off("buffUpdate", onBuffUpdate);
      socket.off("playerUpdate", onPlayerUpdate);
      socket.off("lootGrabbed", onLootGrabbed);
      socket.off("keeperDataUpdate", onKeeperDataUpdate);
      socket.off("message", onMessage);
      socket.off("playerJoin", onPlayerJoin);
      window.removeEventListener("HERO_NEAR_NPC", onNearNpc);
      window.removeEventListener("HERO_CHAT_NPC", onHeroChatNpc);
      window.removeEventListener("UPDATE_HUD", onUpdateHud);
      window.removeEventListener("HERO_RESPAWN", onUpdateHud);
      window.removeEventListener("GAME_LOADED", onGameLoaded);
    };
  }, []);

  useViewportSizeEffect(() => {
    const windowHeight = window.innerHeight;
    const bodyHeight = window.visualViewport.height;
    let offset = windowHeight - bodyHeight;
    setBottomOffset(offset > 0 ? offset : 0);
    setZoom(getHudZoom());
  });

  const showLogin = !isLoggedIn && isLoaded;

  return (
    <ThemeProvider theme={theme as Theme}>
      <AppContext.Provider
        value={{
          isLoaded,
          setIsLoaded,
          isConnected,
          showButtonChat,
          setShowButtonChat,
          setIsConnected,
          isLoggedIn,
          setIsLoggedIn,
          setTabEquipment,
          setTabInventory,
          setTabKeeper,
          setKeeper,
          setTabChat,
          setDropItem,
          setTabProfile,
          setTabStats,
          setTabSocial,
          setTabQuests,
          setTabAbilities,
          tabSocial,
          tabQuests,
          tabAbilities,
          tabStats,
          messages,
          bottomOffset,
          dropItem,
          tabEquipment,
          tabInventory,
          tabProfile,
          tabChat,
          keeper,
          tabKeeper,
          hero,
          socket,
          debug,
          game,
          zoom,
        }}
      >
        <Box
          sx={{
            inset: 0,
            position: "fixed",
            backgroundColor: "black",
            opacity: showLogin ? 1 : 0,
            transition: "opacity 1s ease-out",
            pointerEvents: "none",
            zIndex: "modal",
            transitionDelay: "0.5s",
          }}
        >
          {!isLoggedIn && <ModalLogin />}
        </Box>
        {isLoggedIn && (
          <Box
            id={HUD_CONTAINER_ID}
            sx={{
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {hero?.state?.isDead && <ModalRespawn />}
            {dropItem && <ModalDropAmount />}
            <MenuHud />
            <MenuBar />
          </Box>
        )}
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const SkillButton = ({
  eventName,
  eventDetail,
  icon,
  iconName,
  size,
  keyboardKey,
}: {
  eventDetail?: any;
  eventName: string;
  icon?: string;
  iconName?: string;
  size: number;
  keyboardKey: string;
}) => {
  return (
    <Box sx={{ position: "relative", flexShrink: 0 }}>
      <Button
        variant="menu"
        onTouchStart={(e) => {
          window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
        }}
        sx={{
          p: size,
          borderRadius: "100%",
          backdropFilter: "blur(2px)",
        }}
      >
        <Icon icon={icon || `../assets/icons/${iconName}.png`} />
      </Button>
      <KeyboardKey
        name={keyboardKey}
        hidden={isMobile}
        onKeyUp={() => {
          window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
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
        <SkillButton size={16} iconName="chat" eventName="HERO_CHAT_NPC" keyboardKey="X" />
      )}
      <SkillButton size={16} iconName="grab" eventName="HERO_GRAB" keyboardKey="F" />
      <SkillButton size={16} iconName="handRight" eventName="HERO_ATTACK" keyboardKey="SPACE" />
    </Flex>
  );
};

const AbilityButtons = () => {
  const { hero } = useAppContext();
  /* Only make buttons for abilities that can be worn */
  const abilities = Object.entries(hero?.abilities || {})?.filter(([slotKey, _]) =>
    hero.activeItemSlots.includes(slotKey)
  );
  return (
    <Flex
      sx={{
        flexDirection: "column",
        gap: 2,
        px: 1,
        justifyContent: "end",
        alignItems: "flex-end",
      }}
    >
      {abilities
        ?.filter(([_, item]) => !!item)
        ?.map(([slotKey, item]) => {
          let texture = item?.texture;
          if (item.type === "spell") {
            texture = "spell-" + item.base;
          }
          const icon = item
            ? `../assets/atlas/${item?.type}/${texture}.png`
            : "./assets/icons/blank.png";
          return (
            <SkillButton
              key={slotKey}
              size={16}
              icon={icon}
              eventName={`HERO_ABILITY`}
              eventDetail={slotKey}
              keyboardKey={slotKey}
            />
          );
        })}
    </Flex>
  );
};

const MenuBar = () => {
  const {
    isConnected,
    tabEquipment,
    setTabEquipment,
    tabInventory,
    setTabInventory,
    tabChat,
    setTabKeeper,
    setTabChat,
    tabKeeper,
    dropItem,
    setDropItem,
    tabProfile,
    setTabProfile,
    tabStats,
    setTabStats,
    bottomOffset,
    tabQuests,
    setTabQuests,
    setTabSocial,
    tabSocial,
    socket,
    tabAbilities,
    setTabAbilities,
    zoom,
  } = useAppContext();

  const escCacheKey = JSON.stringify([
    tabChat,
    dropItem,
    tabEquipment,
    tabInventory,
    tabKeeper,
    tabProfile,
    tabStats,
    tabQuests,
    tabAbilities,
  ]);

  return (
    <Flex
      sx={{
        flexDirection: "column",
        pointerEvents: "none",
        boxSizing: "border-box",
        position: "fixed",
        bottom: bottomOffset,
        left: 0,
        width: `calc(100% / ${zoom})`,
        transform: `scale(${zoom})`,
        transformOrigin: "bottom left",
      }}
    >
      <Flex sx={{ flex: 1, alignItems: "end" }}>
        <MessageBox />
        <Flex sx={{ flexDirection: "column" }}>
          <AbilityButtons />
          <SkillButtons />
        </Flex>
      </Flex>
      <Box
        sx={{
          backdropFilter: "blur(10px)",
        }}
      >
        {tabKeeper && <MenuKeeper />}
        <MenuAbilities />
        <MenuEquipment />
        <MenuInventory />
        <MenuProfile />
        <MenuQuests />
        <MenuStats />
        <MenuSocial />
        <Menu
          sx={{
            gap: 1,
            alignItems: "center",
          }}
        >
          <Box>
            {isConnected ? (
              <Icon icon="../assets/icons/success.png" sx={{ opacity: 0.5 }} />
            ) : (
              <Icon icon="../assets/icons/danger.png" sx={{ opacity: 0.5 }} />
            )}
          </Box>
          <Box sx={{ flex: tabChat ? "unset" : 1 }} />
          <MenuButton
            keyboardKey={tabChat ? "ENTER" : "T"}
            iconName="chat"
            sx={{ flex: tabChat ? 1 : "unset" }}
            isActive={tabChat}
            onClick={() => setTabChat((prev) => !prev)}
          >
            {tabChat && (
              <Input
                sx={{ flex: 1 }}
                autoFocus={true}
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  const message = target?.value;
                  if (e.keyCode === 13) {
                    if (message?.trim() !== "") socket.emit("message", { message });
                    setTabChat(false);
                  }
                }}
                onClickOutside={() => {
                  setTabChat(false);
                }}
                onBlur={(e) => {
                  /* Hack to send if `Done` button is pushed */
                  const message = e?.target?.value;
                  if (message && isMobile) {
                    if (message?.trim() !== "") socket.emit("message", { message });
                  }
                  setTabChat(false);
                }}
              />
            )}
          </MenuButton>
          {!tabChat && (
            <>
              <MenuButton
                keyboardKey="S"
                iconName="chat"
                isActive={tabSocial}
                onClick={() => setTabSocial((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="A"
                iconName="book"
                isActive={tabAbilities}
                onClick={() => setTabAbilities((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="Q"
                iconName="quests"
                isActive={tabQuests}
                onClick={() => setTabQuests((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="C"
                iconName="stats"
                isActive={tabStats}
                onClick={() => setTabStats((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="P"
                iconName="mirror"
                isActive={tabProfile}
                onClick={() => setTabProfile((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="E"
                iconName="helmet"
                isActive={tabEquipment}
                onClick={() => {
                  setTabEquipment((prev) => !prev);
                }}
              />
              <MenuButton
                keyboardKey="D"
                iconName="bag"
                isActive={tabInventory}
                onClick={() => setTabInventory((prev) => !prev)}
              />
            </>
          )}
          <KeyboardKey
            key={escCacheKey}
            name={"ESCAPE"}
            hidden={true}
            onKeyUp={() => {
              if (dropItem) return setDropItem(false);
              if (tabKeeper) return setTabKeeper(false);
              if (tabSocial) return setTabSocial(false);
              if (tabAbilities) return setTabAbilities(false);
              if (tabEquipment) return setTabEquipment(false);
              if (tabInventory) return setTabInventory(false);
              if (tabProfile) return setTabProfile(false);
              if (tabQuests) return setTabQuests(false);
              if (tabStats) return setTabStats(false);
              if (tabChat) return setTabChat(false);
            }}
          />
        </Menu>
      </Box>
    </Flex>
  );
};

export default App;
