import React, { useEffect, useState, createContext, useContext } from "react";
import {
  theme,
  MenuHud,
  ModalRespawn,
  ModalDropAmount,
  HUD_CONTAINER_ID,
  ModalLogin,
  ModalSign,
  ModalError,
  MenuBar,
  ModalHome,
} from "./";
import { ThemeProvider, Box, useViewportSizeEffect, Modal, KeyboardKey } from "@aether/ui";
import { getSpinDirection, calculateZoomLevel } from "../utils";
import "react-tooltip/dist/react-tooltip.css";
import { Theme } from "theme-ui";
import { Socket } from "socket.io-client";
import { CONSUMABLES_BASES, MINI_MAP_SIZE, isMobile } from "@aether/shared";
import Peer from "peerjs";
import VideoFrame from "./VideoFrame";

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
  setError: React.Dispatch<React.SetStateAction<any>>;
  setHomeModal: React.Dispatch<React.SetStateAction<FullCharacterState | null>>;
  addMessage: React.Dispatch<React.SetStateAction<Message>>;
  setUserSettings: React.Dispatch<React.SetStateAction<any>>;
  userSettings: any;
  homeModal: FullCharacterState | null;
  error: any;
  sign: Sign | null;
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
  peer: Peer;
  debug: boolean;
  game: Phaser.Game;
  zoom: any;
  currentTooltipId: string;
  setCurrentTooltipId: React.Dispatch<React.SetStateAction<any>>;
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

function App({ socket, peer, debug, game }) {
  const [currentTooltipId, setCurrentTooltipId] = useState(null);
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
  const [error, setError] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [homeModal, setHomeModal] = useState(null);
  const [userSettings, setUserSettings] = useState({ showMinimap: !isMobile });

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

  const addMessage = (payload: Message) => {
    setMessages((prev) => [...prev, { ...payload, timestamp: Date.now() }]);
  };

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

  const onSettingToggled = (e) => {
    const setting = e?.detail;
    addMessage({ type: "info", message: setting?.message });
    setUserSettings((prev) => {
      return { ...prev, [setting?.name]: setting?.value };
    });
  };

  const onPlayerJoin = (player, args) => {
    /* Keep room list updated */
    setPlayers((prev = []) => {
      const playerExists = prev.some((p) => p?.id === player?.id);
      return !playerExists ? prev.concat(player) : prev;
    });

    /* Only show player join message if the user logged in, not if entered door */
    if (args?.isLogin) addMessage({ type: "info", message: "A player has joined the game." });
  };

  const onPlayerLeave = (socketId) => {
    setPlayers((prev) => prev.filter((player) => player.socketId !== socketId));
  };

  const onHeroInit = (payload: { players: Array<FullCharacterState>; socketId: string }, args) => {
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
      addMessage({ type: "success", message: `You are now level ${player?.stats?.level}!` });
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
    const currentPlayerSocketId = sessionStorage.getItem("socketId");
    const isCurrentPlayer = currentPlayerSocketId === player.socketId;
    setPlayers((prev) => {
      return prev.map((p) => (p.id === player.id ? player : p));
    });

    if (isCurrentPlayer) {
      setHero(player);
      if (args?.didLevel) {
        addMessage({ type: "success", message: `You are now level ${player.stats?.level}!` });
      }
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
      return addMessage({ type: "error", message: "Who are you talking to?" });
    }

    if (target.kind === "keeper") {
      return setTabKeeper((prev) => {
        if (prev) return false; //already talking
        socket.emit("chatNpc", { npcId: hero?.state?.targetNpcId });
      });
    }

    if (target.kind === "sign") {
      setSign(target);
    }

    const direction = getSpinDirection(hero, target);
    if (hero?.direction !== direction) socket.emit("changeDirection", { direction });
  };

  const onLootGrabbed = ({ player, loot }) => {
    const socketId = sessionStorage.getItem("socketId");
    // only affect the player that grabbed the loot
    if (socketId === player?.socketId) {
      if (loot?.grabMessage) {
        const item = loot?.item;
        addMessage({
          type: "muted",
          message: `Found <span style="font-weight: bold; color: ${theme.colors[item?.rarity]}">${
            item?.name
          }</span> x${item?.amount || 1}`,
        } as Message);
      }
      /* Both quests and inventory only need to be updated when we pick an item */
      setHero((prev) => ({
        ...prev,
        inventory: player?.inventory,
        quests: player?.quests,
        abilities: player?.abilities,
      }));
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
    addMessage({
      type: "party",
      message: `${inviteData?.inviter?.profile?.userName} has invited you to their party.`,
    });
    // Party invite doesn't exist, add it to the list
    setPartyInvites((prevInvites) => [...prevInvites, inviteData]);
  };

  const onPartyUpdate = ({ message, party, partyId }) => {
    // remove the invite
    setPartyInvites([]);
    setParty(party);
    if (message) {
      addMessage({ type: "party", message });
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
    const { spellName, duration, startTime, sharedDuration } = e?.detail ?? {};
    setCooldowns((prev) => {
      // spellName !== 'attack', 'potion' update the shared base cooldown
      if (sharedDuration) {
        prev["global"] = { duration: sharedDuration, startTime };
      }
      return { ...prev, [spellName]: { duration, startTime } };
    });
  };

  const onLoadError = () => {
    setError({
      title: "Error",
      description:
        "There was a problem loading some assets.  This is probably because I'm in the process of deploying a new version.  Refresh and come back later if stuff isn't loading.",
    });
  };

  const onGameLoaded = () => {
    setIsLoaded(true);
  };

  function onDoubleClickItem(e) {
    const { item, location } = e?.detail ?? {};
    if (!["inventory", "abilities", "bag"].includes(location)) return;
    /* If it is food we are trying to consume it */
    if (CONSUMABLES_BASES.includes(item?.base)) {
      window.dispatchEvent(
        new CustomEvent("HERO_USE_ITEM", {
          detail: { item, location },
        })
      );
    }
    /* If it is a bag, we open it */
    if (item?.base === "bag") {
      toggleBagState(item?.id);
    }
  }

  function onDropItem(e) {
    const { target, location, bagId, slotKey, item } = e?.detail ?? {};
    const { nodeName, dataset } = target ?? {};
    if (hero?.state?.isDead) return;
    /* Not moving an item anywhere. (Same slot) */
    if (dataset?.location === location && dataset?.slotKey === slotKey && dataset.bagId === bagId) {
      return;
    }
    /* Anywhere -> Ground */
    if (nodeName == "CANVAS" && location !== "shop") {
      if (item?.amount > 1) {
        /* If more than 1, open up the drop modal */
        return setDropItem({ ...item, location, bagId, action: "DROP" });
      } else {
        if (["set", "rare", "unique"]?.includes(item?.rarity)) {
          return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
        }
        if (["bag"]?.includes(item?.base)) {
          /* Close open bag */
          if (bagState?.find?.((id) => id === item?.id)) {
            toggleBagState(item?.id);
          }
          return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
        }
        return socket.emit("dropItem", { item, bagId, location });
      }
    }
    /* Anywhere -> Shop */
    if (target?.closest(".menu-keeper")) {
      if (item?.amount > 1) {
        /* If more than 1, open up the drop modal */
        return setDropItem({ ...item, location, bagId, action: "SHOP_SELL_AMOUNT", slotKey });
      } else {
        if (["set", "rare", "unique"]?.includes(item?.rarity) || ["bag"]?.includes(item?.base)) {
          /* Close open bag */
          if (bagState?.find?.((id) => id === item?.id)) {
            toggleBagState(item?.id);
          }
          return setDropItem({
            ...item,
            location,
            action: "SHOP_SELL_CONFIRM",
            slotKey,
            bagId,
          });
        } else {
          // so that we can play the sell sound
          if (location !== "shop") {
            window.dispatchEvent(
              new CustomEvent("AUDIO_ITEM_SELL", {
                detail: item,
              })
            );
          }
          return socket.emit("moveItem", {
            to: {
              location: "shop",
            },
            from: { bagId, slot: slotKey, location },
          });
        }
      }
    }
    /* Anywhere -> Anywhere */
    if (dataset?.slotKey) {
      if (location === "shop") {
        if (item?.slot === "stackable") {
          return setDropItem({
            ...item,
            location,
            action: "SHOP_BUY_AMOUNT",
            slotKey,
            bagId,
            dataset,
          });
        }
      }
      /* Dragging directly on to a bag */
      if (item?.base !== "bag" && dataset?.base === "bag") {
        return socket.emit("moveItem", {
          to: {
            bagId: dataset?.id, //if we have a bag
            slot: null,
            location: "bag",
          },
          from: { bagId, slot: slotKey, location },
        });
      }
      return socket.emit("moveItem", {
        to: {
          bagId: dataset?.bagId, //if we have a bag
          slot: dataset?.slotKey,
          location: dataset?.location,
        },
        from: { bagId, slot: slotKey, location },
      });
    }
  }

  useEffect(() => {
    // tell the server which peer we are
    peer.on("open", (peerId) => {
      socket.emit("peerInit", peerId);
    });
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("heroInit", onHeroInit);
    socket.on("buffUpdate", onBuffUpdate);
    socket.on("playerUpdate", onPlayerUpdate);
    socket.on("lootGrabbed", onLootGrabbed);
    socket.on("keeperDataUpdate", onKeeperDataUpdate);
    socket.on("message", addMessage);
    socket.on("playerJoin", onPlayerJoin);
    socket.on("remove", onPlayerLeave);
    socket.on("partyInvite", onPartyInvite);
    socket.on("partyUpdate", onPartyUpdate);
    window.addEventListener("HERO_NEAR_NPC", onNearNpc);
    window.addEventListener("HERO_CHAT_NPC", onHeroChatNpc);
    window.addEventListener("UPDATE_HUD", onUpdateHud);
    window.addEventListener("UPDATE_ROOM_PLAYERS", onUpdateRoomPlayers);
    window.addEventListener("HERO_RESPAWN", onUpdateHud);
    window.addEventListener("LOAD_ERROR", onLoadError);
    window.addEventListener("GAME_LOADED", onGameLoaded);
    window.addEventListener("HERO_START_COOLDOWN", onStartCooldown);
    window.addEventListener("HERO_DROP_ITEM", onDropItem);
    window.addEventListener("HERO_DOUBLE_CLICK_ITEM", onDoubleClickItem);
    window.addEventListener("SETTING_TOGGLED", onSettingToggled);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("heroInit", onHeroInit);
      socket.off("buffUpdate", onBuffUpdate);
      socket.off("playerUpdate", onPlayerUpdate);
      socket.off("lootGrabbed", onLootGrabbed);
      socket.off("keeperDataUpdate", onKeeperDataUpdate);
      socket.off("message", addMessage);
      socket.off("playerJoin", onPlayerJoin);
      socket.off("partyInvite", onPartyInvite);
      socket.off("partyUpdate", onPartyUpdate);
      socket.off("remove", onPlayerLeave);
      window.removeEventListener("HERO_NEAR_NPC", onNearNpc);
      window.removeEventListener("HERO_CHAT_NPC", onHeroChatNpc);
      window.removeEventListener("UPDATE_HUD", onUpdateHud);
      window.removeEventListener("UPDATE_ROOM_PLAYERS", onUpdateRoomPlayers);
      window.removeEventListener("HERO_RESPAWN", onUpdateHud);
      window.removeEventListener("LOAD_ERROR", onLoadError);
      window.removeEventListener("GAME_LOADED", onGameLoaded);
      window.removeEventListener("HERO_START_COOLDOWN", onStartCooldown);
      window.removeEventListener("HERO_DROP_ITEM", onDropItem);
      window.removeEventListener("HERO_DOUBLE_CLICK_ITEM", onDoubleClickItem);
      window.removeEventListener("SETTING_TOGGLED", onSettingToggled);
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
          addMessage,
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
          setError,
          setHomeModal,
          homeModal,
          error,
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
          peer,
          debug,
          game,
          zoom,
          currentTooltipId,
          setCurrentTooltipId,
          userSettings,
          setUserSettings,
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
          <Modal.Overlay sx={{ backgroundImage: "url(./assets/images/bg.jpg)" }} />
          {!isLoggedIn && <ModalLogin />}
          {error && <ModalError />}
        </Box>
        <VideoFrame />
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
            {homeModal?.profile && <ModalHome />}
            <MenuGlobalKeys />
            <MenuHud />
            <MenuBar />
          </Box>
        )}
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const MenuGlobalKeys = () => {
  const { userSettings } = useAppContext();
  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: MINI_MAP_SIZE + 6,
          right: MINI_MAP_SIZE - 12,
          zIndex: 100000,
        }}
      >
        <KeyboardKey
          name="N"
          hidden={!userSettings?.showMinimap}
          onKeyUp={() => {
            window.dispatchEvent(new CustomEvent("TOGGLE_MINIMAP"));
          }}
        />
      </Box>
      <KeyboardKey
        name="M"
        hidden={true}
        onKeyUp={() => {
          window.dispatchEvent(new CustomEvent("TOGGLE_MUSIC"));
        }}
      />
    </>
  );
};

export default App;
