import React, { useEffect, useState, createContext, useContext } from "react";
import {
  SkillButton,
  theme,
  MenuEquipment,
  MenuInventory,
  MenuKeeper,
  MenuHud,
  ModalRespawn,
  ModalDropAmount,
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
  MenuBag,
} from "./";
import {
  ThemeProvider,
  Box,
  Flex,
  Icon,
  KeyboardKey,
  Input,
  useViewportSizeEffect,
} from "@aether/ui";
import { getSpinDirection, calculateZoomLevel } from "../utils";
import { isMobile } from "@aether/shared";
import "react-tooltip/dist/react-tooltip.css";
import { Donut, Theme } from "theme-ui";
import { Socket } from "socket.io-client";
import ModalSign from "./ModalSign";

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
  toggleBagState: React.Dispatch<React.SetStateAction<any>>;
  setCooldowns: React.Dispatch<React.SetStateAction<any>>;
  setSign: React.Dispatch<React.SetStateAction<any>>;
  sign: string | null;
  bagState: Array<string>;
  cooldowns: Record<string, any>;
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
  players: Array<FullCharacterState>;
  partyInvites: Array<PartyInvite>;
  setPartyInvites: React.Dispatch<React.SetStateAction<Array<PartyInvite>>>;
  party: any;
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
  const [partyInvites, setPartyInvites] = useState<Array<PartyInvite>>([]);
  const [party, setParty] = useState<any>();
  const [players, setPlayers] = useState<Array<FullCharacterState>>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dropItem, setDropItem] = useState();
  const [hero, setHero] = useState<FullCharacterState>(null);
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
  const [bagState, setBagState] = useState([]);
  const [sign, setSign] = useState(null);
  const [cooldowns, setCooldowns] = useState({
    ATTACK: { duration: 0, startTime: Date.now() },
    POTION: { duration: 0, startTime: Date.now() },
    SPELL: { duration: 0, startTime: Date.now() },
  });

  /* Is the bag open or closed */
  const toggleBagState = (id: string) => {
    setBagState((prev) => {
      if (prev.includes(id)) {
        // If id is already present, remove it from the array
        return prev.filter((itemId) => itemId !== id);
      } else {
        // If id is not present, add it to the array
        return [...prev, id];
      }
    });
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsLoggedIn(false);
      setTabKeeper(false);
      setMessages([]);
      setPlayers([]);
      setParty([]);
      setPartyInvites([]);
      setHero(null);
      setKeeper(null);
      setSign(null);
    };

    const onMessage = (payload: Message) => {
      setMessages((prev) => [...prev, payload]);
    };

    const onPlayerJoin = (player, args) => {
      /* Keep room list updated */
      setPlayers((prev) => {
        const playerExists = prev.some((p) => p?.id === player?.id);
        return !playerExists ? [...prev, player] : prev;
      });
      /* Only show player join message if the user logged in, not if entered door */
      if (args?.isLogin)
        setMessages((prev) => [
          ...prev,
          { type: "info", message: "A player has joined the game." },
        ]);
    };

    const onPlayerLeave = (socketId) => {
      setPlayers((prev) => prev.filter((player) => player.socketId !== socketId));
    };

    const onHeroInit = (
      payload: { players: Array<FullCharacterState>; socketId: string },
      args
    ) => {
      const { players, socketId } = payload;
      const player: FullCharacterState = players?.find((p) => p?.socketId === socketId);
      //TODO: get rid of this session storage reference. i think we can just use a state callback here
      sessionStorage.setItem("socketId", socketId);
      setPlayers(players);
      setHero(player);
      if (args?.isLogin) setIsLoggedIn(true);
    };

    const onBuffUpdate = (payload: {
      players: Array<FullCharacterState>;
      socketId: string;
      playerIdsThatLeveled?: Array<string>;
    }) => {
      const { players, playerIdsThatLeveled } = payload;
      const socketId = sessionStorage.getItem("socketId");
      const player: FullCharacterState = players?.find((p) => p?.socketId === socketId);
      /* Keep the hero updated */
      setHero((prev) => ({ ...prev, ...player }));
      /* Show a message if the hero leveled */
      if (playerIdsThatLeveled?.includes(player?.id)) {
        setMessages((prev) => [
          ...prev,
          { type: "success", message: `You are now level ${player?.stats?.level}!` },
        ]);
      }
      /* Merge updates into player */
      setPlayers((prev) => {
        return prev.map((p: any) => {
          const foundPlayer = players?.find((x) => p?.id === x?.id);
          const newPlayerState = foundPlayer ? { ...p, ...foundPlayer } : p;
          return newPlayerState as FullCharacterState;
        });
      });
    };

    const onPlayerUpdate = (player: FullCharacterState, args) => {
      /* Keep room list updated */
      setPlayers((prev) => {
        return prev.map((p) => (p.id === player?.id ? player : p));
      });
      /* If the player is the current player */
      if (sessionStorage.getItem("socketId") === player?.socketId) {
        setHero(player);
        // quests can trigger this didLevel
        if (args?.didLevel) {
          setMessages((prev) => [
            ...prev,
            { type: "success", message: `You are now level ${player?.stats?.level}!` },
          ]);
        }
      } else {
        console.log("arf");
      }
    };

    const onKeeperDataUpdate = (args) => {
      const scene = game.scene.getScene("SceneMain");
      const hero = scene.hero;
      const npc = scene.npcs.getChildren().find((n) => n?.id === args?.npcId);
      if (hero?.state?.targetNpcId === args?.npcId) {
        setKeeper({ ...npc, keeperData: args?.keeperData });
        setHero((prev) => ({ ...prev, quests: args?.playerQuests }));
        setTabKeeper(true);
      }
    };

    const onHeroChatNpc = () => {
      const scene = game.scene.getScene("SceneMain");
      const hero = scene.hero;
      const npcId = scene?.hero?.state?.targetNpcId;
      const npcs = scene.npcs.getChildren();
      const signs = scene.signs.getChildren();

      const target = [...npcs, ...signs].find((n) => n?.id === npcId);

      if (!target) {
        return setMessages((prev) => [
          ...prev,
          { type: "error", message: "Who are you talking to?" },
        ]);
      }

      if (target.kind === "keeper") {
        return setTabKeeper((prev) => {
          if (prev) return false; //already talking
          socket.emit("chatNpc", { npcId: hero?.state?.targetNpcId });
        });
      }

      if (target.kind === "sign") {
        setSign(target?.text);
      }

      const direction = getSpinDirection(hero, target);
      if (hero?.direction !== direction) socket.emit("changeDirection", direction);
    };

    const onLootGrabbed = ({ player }) => {
      const socketId = sessionStorage.getItem("socketId");
      if (socketId === player?.socketId) {
        /* Both quests and inventory only need to be updated when we pick an item */
        setHero((prev) => ({ ...prev, inventory: player?.inventory, quests: player?.quests }));
      }
    };

    const onUpdateHud = () => {
      const hero: FullCharacterState = game.scene.getScene("SceneMain").hero;
      setHero((prev) => ({ ...prev, state: hero?.state, stats: hero?.stats }));
    };

    /* Splice in some updates for keeping the party UI in sync */
    const onUpdateRoomPlayers = (e) => {
      const otherPlayers = e?.detail?.players?.filter((p) => !p.isHero);

      setPlayers((players) => {
        return players.map((player) => {
          if (otherPlayers.some((p) => p.id === player.id)) {
            const foundPlayer = otherPlayers?.find((p) => p.id === player.id);
            return {
              ...player,
              stats: foundPlayer?.stats,
              equipment: foundPlayer?.equipment,
              profile: foundPlayer?.profile,
            };
          } else {
            return player;
          }
        });
      });
    };

    const onPartyInvite = (inviteData: PartyInvite) => {
      // Check if the party invite already exists
      const existingInvite = partyInvites.find((invite) => invite.partyId === inviteData.partyId);
      // Party invite already exists, do not add it again
      if (existingInvite) return;
      // Party invite doesn't exist, add it to the list
      setPartyInvites((prevInvites) => [...prevInvites, inviteData]);
    };

    const onPartyUpdate = ({ message, party, partyId }) => {
      // remove the invite
      setPartyInvites([]);
      setParty(party);
      if (message) {
        setMessages((prev) => [...prev, { type: "party", message }]);
      }
    };

    const onNearNpc = (e) => {
      setShowButtonChat(!!e?.detail);
      if (!e?.detail) {
        setTabKeeper(false);
        setSign(false);
      }
    };

    const onStartCooldown = (e) => {
      const { type, duration, startTime } = e?.detail ?? {};
      setCooldowns((prev) => ({ ...prev, [type]: { duration, startTime } }));
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
    socket.on("remove", onPlayerLeave);
    socket.on("partyInvite", onPartyInvite);
    socket.on("partyUpdate", onPartyUpdate);
    window.addEventListener("HERO_NEAR_NPC", onNearNpc);
    window.addEventListener("HERO_CHAT_NPC", onHeroChatNpc);
    window.addEventListener("UPDATE_HUD", onUpdateHud);
    window.addEventListener("UPDATE_ROOM_PLAYERS", onUpdateRoomPlayers);
    window.addEventListener("HERO_RESPAWN", onUpdateHud);
    window.addEventListener("GAME_LOADED", onGameLoaded);
    window.addEventListener("HERO_START_COOLDOWN", onStartCooldown);

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
      socket.off("partyInvite", onPartyInvite);
      socket.off("partyUpdate", onPartyUpdate);
      socket.off("remove", onPlayerLeave);
      window.removeEventListener("HERO_NEAR_NPC", onNearNpc);
      window.removeEventListener("HERO_CHAT_NPC", onHeroChatNpc);
      window.removeEventListener("UPDATE_HUD", onUpdateHud);
      window.removeEventListener("UPDATE_ROOM_PLAYERS", onUpdateRoomPlayers);
      window.removeEventListener("HERO_RESPAWN", onUpdateHud);
      window.removeEventListener("GAME_LOADED", onGameLoaded);
      window.removeEventListener("HERO_START_COOLDOWN", onStartCooldown);
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
          toggleBagState,
          setCooldowns,
          setSign,
          sign,
          cooldowns,
          bagState,
          players,
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
          partyInvites,
          setPartyInvites,
          party,
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
            {sign && <ModalSign />}
            <MenuHud />
            <MenuBar />
          </Box>
        )}
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const SkillButtons = () => {
  const { showButtonChat, cooldowns } = useAppContext();

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
      <SkillButton
        size={16}
        iconName="chat"
        onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_CHAT_NPC"))}
        keyboardKey="X"
        sx={{ opacity: showButtonChat ? 1 : 0.5 }}
      />
      <SkillButton
        size={16}
        iconName="grab"
        onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_GRAB"))}
        keyboardKey="F"
      />
      <SkillButton
        size={16}
        iconName="handRight"
        onTouchStart={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"))}
        onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK"))}
        keyboardKey="SPACE"
      >
        <CooldownTimer cooldown={"ATTACK"} />
      </SkillButton>
    </Flex>
  );
};

const CooldownTimer = ({ cooldown }) => {
  const { cooldowns } = useAppContext();
  const [percentage, setPercentage] = useState(0);
  const duration = cooldowns[cooldown]?.duration;
  const startTime = cooldowns[cooldown]?.startTime;

  useEffect(() => {
    const triggerTimer = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      const percentageElapsed = elapsedTime / duration;

      setPercentage(percentageElapsed);

      if (elapsedTime >= duration) {
        setPercentage(1);
        //setCooldowns((prev) => ({ ...prev, [cooldown]: 0 }));
        if (interval) clearInterval(interval);
      }
    };

    const interval = setInterval(triggerTimer, 16);
    triggerTimer();

    return () => {
      clearInterval(interval);
    };
  }, [startTime, duration]);

  return (
    <Box>
      <Donut
        value={Math.abs(percentage) || 0}
        size="16"
        sx={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -1,
          "& circle:first-of-type": {
            opacity: 0,
            color: "#000",
          },
          "& circle:last-of-type": {
            opacity: 0.25,
            color: "#FFF",
          },
        }}
      />
    </Box>
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

          /* Spells and non-potion items share a cooldown for now */
          const cooldown = item?.base === "potion" ? "POTION" : "SPELL";

          return (
            <SkillButton
              key={slotKey}
              size={16}
              icon={icon}
              onTouchStart={() =>
                window.dispatchEvent(new CustomEvent("HERO_AIM_START", { detail: slotKey }))
              }
              onTouchEnd={() =>
                window.dispatchEvent(new CustomEvent("HERO_ABILITY", { detail: slotKey }))
              }
              keyboardKey={slotKey}
            >
              <CooldownTimer cooldown={cooldown} />
            </SkillButton>
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
    bagState,
    toggleBagState,
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
    ...bagState,
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
        {bagState?.map((id) => {
          return <MenuBag key={id} id={id} />;
        })}
        <MenuInventory />
        <MenuProfile />
        <MenuQuests />
        <MenuStats />
        <MenuSocial />
        <Menu
          sx={{
            gap: 1,
            alignItems: "center",
            pointerEvents: "none",
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
          <ChatButton />
          {!tabChat && (
            <>
              <MenuButton
                keyboardKey="P"
                iconName="social"
                isActive={tabSocial}
                onClick={() => setTabSocial((prev) => !prev)}
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
                keyboardKey="G"
                iconName="mirror"
                isActive={tabProfile}
                onClick={() => setTabProfile((prev) => !prev)}
              />
              <MenuButton
                keyboardKey="V"
                iconName="book"
                isActive={tabAbilities}
                onClick={() => setTabAbilities((prev) => !prev)}
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
                keyboardKey="I"
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
              if (tabQuests) return setTabQuests(false);
              if (tabStats) return setTabStats(false);
              if (tabProfile) return setTabProfile(false);
              if (tabAbilities) return setTabAbilities(false);
              if (tabEquipment) return setTabEquipment(false);
              if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
              if (tabInventory) return setTabInventory(false);
              if (tabChat) return setTabChat(false);
            }}
          />
        </Menu>
      </Box>
    </Flex>
  );
};

const ChatButton = () => {
  const { tabChat, setTabChat, socket, messages, hero } = useAppContext();
  const [chatValue, setChatValue] = useState<string>("");
  const [messageIndex, setMessageIndex] = useState<number>(-1);

  useEffect(() => {
    if (!tabChat) {
      setChatValue("");
      setMessageIndex(-1);
    }
  }, [tabChat]);

  return (
    <MenuButton
      keyboardKey={tabChat ? "ENTER" : "T"}
      iconName="chat"
      sx={{
        flex: tabChat ? 1 : "unset",
        "&.active::before, &:has(.pressed)::before": { boxShadow: "none" },
      }}
      isActive={tabChat}
      disabled={tabChat} //hack to prevent double clicks
      onClick={() => setTabChat((prev) => !prev)}
    >
      {tabChat && (
        <Input
          sx={{ flex: 1 }}
          autoFocus={true}
          value={chatValue}
          onKeyDown={(e) => {
            const target = e.target as HTMLInputElement;
            const message = target?.value;

            if (e.code === "Enter") {
              if (message?.trim() !== "") {
                socket.emit("message", { message });
              }
              setTabChat(false);
            }

            if (e.code === "ArrowUp" || e.code === "ArrowDown") {
              e.preventDefault();
              const lastMessageIndex =
                messages?.filter?.((m) => m?.from === hero?.profile?.userName)?.length - 1;
              let newIndex = messageIndex;

              if (e.code === "ArrowUp") {
                if (newIndex === -1) {
                  newIndex = lastMessageIndex;
                } else {
                  newIndex = newIndex === 0 ? lastMessageIndex : newIndex - 1;
                }
              }

              if (e.code === "ArrowDown") {
                newIndex = newIndex === lastMessageIndex ? 0 : newIndex + 1;
              }

              setChatValue(messages?.[newIndex]?.message || "");
              setMessageIndex(newIndex);
            }
          }}
          onChange={(e: any) => setChatValue(e.target.value)}
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
  );
};

export default App;
