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
} from "./";
import { isMobile, getSpinDirection } from "../utils";
import "react-tooltip/dist/react-tooltip.css";
import { useViewportSizeEffect } from "./hooks";
import { Theme } from "theme-ui";
import { Socket } from "socket.io-client";

interface AppContextValue {
  isConnected: boolean;
  showButtonChat: boolean;
  setShowButtonChat: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setTabEquipment: React.Dispatch<React.SetStateAction<boolean>>;
  setTabInventory: React.Dispatch<React.SetStateAction<boolean>>;
  setTabKeeper: React.Dispatch<React.SetStateAction<boolean>>;
  setKeeper: React.Dispatch<React.SetStateAction<undefined>>;
  setTabChat: React.Dispatch<React.SetStateAction<boolean>>;
  setDropItem: React.Dispatch<React.SetStateAction<Item | null | false>>;
  messages: Message[];
  bottomOffset: number;
  dropItem: any;
  tabEquipment: boolean;
  tabInventory: boolean;
  tabChat: boolean;
  keeper: any;
  tabKeeper: boolean;
  hero: CharacterState;
  socket: Socket;
  debug: boolean;
  game: Phaser.Game;
}

const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug, game }) {
  const [isConnected, setIsConnected] = useState(true);
  const [dropItem, setDropItem] = useState();
  const [hero, setHero] = useState<CharacterState>();
  const [keeper, setKeeper] = useState(); // data related to NPC you are chatting with
  const [messages, setMessages] = useState([]);
  const [tabKeeper, setTabKeeper] = useState(false);
  const [tabEquipment, setTabEquipment] = useState(false);
  const [tabInventory, setTabInventory] = useState(false);
  const [tabChat, setTabChat] = useState(false);
  const [showButtonChat, setShowButtonChat] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onMessage = (payload: Message) => {
      setMessages((prev) => [...prev, payload]);
    };

    const onPlayerJoin = (payload) => {
      setMessages((prev) => [...prev, { type: "info", message: "A player has joined the game." }]);
    };

    const onHeroInit = (payload: { players: Array<CharacterState>; socketId: string }) => {
      const { players, socketId } = payload;
      const player: CharacterState = players?.find((p) => p?.socketId === socketId);
      localStorage.setItem("socketId", socketId);
      setHero(player);
    };

    const onPlayerUpdate = (player: CharacterState) => {
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
      const hero: CharacterState = game.scene.getScene("SceneMain").hero;
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
    socket.on("message", onMessage);
    socket.on("playerJoin", onPlayerJoin);
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
      socket.off("message", onMessage);
      socket.off("playerJoin", onPlayerJoin);
      window.removeEventListener("HERO_NEAR_NPC", onNearNpc);
      window.removeEventListener("HERO_CHAT_NPC", onHeroChatNpc);
      window.removeEventListener("UPDATE_HUD", onUpdateHud);
      window.removeEventListener("HERO_RESPAWN", onUpdateHud);
    };
  }, []);

  useViewportSizeEffect(() => {
    const windowHeight = window.innerHeight;
    const bodyHeight = window.visualViewport.height;
    let offset = windowHeight - bodyHeight;
    setBottomOffset(offset > 0 ? offset : 0);
  });

  if (!hero) return;

  return (
    <ThemeProvider theme={theme as Theme}>
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
          setTabChat,
          setDropItem,
          messages,
          bottomOffset,
          dropItem,
          tabEquipment,
          tabInventory,
          tabChat,
          keeper,
          tabKeeper,
          hero,
          socket,
          debug,
          game,
        }}
      >
        {hero?.state?.isDead && <ModalRespawn />}
        {dropItem && <ModalDropAmount />}
        <MenuHud />
        <MenuBar />
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const SkillButton = ({ eventName, iconName, size, keyboardKey }) => {
  return (
    <Box sx={{ position: "relative", flexShrink: 0 }}>
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
        onKeyUp={(e: KeyboardEvent) => {
          window.dispatchEvent(new KeyboardEvent(eventName));
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
    bottomOffset,
    socket,
  } = useAppContext();

  return (
    <Flex
      sx={{
        flexDirection: "column",
        pointerEvents: "none",
        boxSizing: "border-box",
        position: "fixed",
        bottom: bottomOffset,
        left: 0,
        right: 0,
      }}
    >
      <Flex sx={{ flex: 1 }}>
        <MessageBox />
        <SkillButtons />
      </Flex>
      <MenuKeeper />
      <MenuEquipment />
      <MenuInventory />
      <Flex
        sx={{
          gap: 1,
          alignItems: "center",
          justifyContent: "end",
          bg: "shadow.30",
          p: 2,
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
          key={`esc-${tabChat}-${dropItem}-${tabEquipment}-${tabInventory}-${tabKeeper}`}
          name={"ESCAPE"}
          hidden={true}
          onKeyUp={(e) => {
            if (dropItem) return setDropItem(false);
            if (tabKeeper) return setTabKeeper(false);
            if (tabEquipment) return setTabEquipment(false);
            if (tabInventory) return setTabInventory(false);
            if (tabChat) return setTabChat(false);
          }}
        />
      </Flex>
    </Flex>
  );
};

export default App;
