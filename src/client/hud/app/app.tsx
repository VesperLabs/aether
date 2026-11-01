import React, { useEffect, useRef, useState } from "react";
import { theme } from "@/ui";
import { MenuHud } from "@/client/hud/menu/menu-hud";
import { ModalRespawn } from "@/client/hud/status/modal-respawn";
import { ModalDropAmount } from "@/client/hud/inventory/modal-drop-amount";
import { FlyingLoot } from "@/client/hud/inventory/flying-loot";
import { HUD_CONTAINER_ID } from "@/client/hud/app/constants";
import { ModalLogin } from "@/client/hud/auth/modal-login";
import { ModalSign } from "@/client/hud/menu/modal-sign";
import { ModalError } from "@/client/hud/menu/modal-error";
import { MenuBar } from "@/client/hud/menu/menu-bar";
import { MusicPlayer } from "@/client/hud/music/music-player";
import { ModalHome } from "@/client/hud/shop/modal-home";
import { ThemeUIProvider, Box, useViewportSizeEffect, Modal, ZoomProvider } from "@/ui";
import { getHudZoom } from "./hud-zoom";
import "react-tooltip/dist/react-tooltip.css";
import type { Theme } from "theme-ui";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { VideoFrame } from "@/client/hud/video/video-frame";
import { ModalSettings } from "@/client/hud/settings/modal-settings";
import type Phaser from "phaser";
import type Peer from "peerjs";
import type { ChatMessage, ClientGameSocket, PartyMessage } from "@/network";
import type { Sign } from "@/client/views/sign";
import {
  AppContext,
  type Cooldown,
  type DropItem,
  type ErrorModal,
  type HudCharacter,
  type KeeperView,
  type PartyInvite,
} from "./context";
import {
  bindSocketHandlers,
  bindWindowHandlers,
  latestHandlers,
  type SocketHandlers,
  type WindowHandlers,
} from "./app-events";
import { createWindowHandlers } from "./window-handlers";
import { createHeroSyncHandlers } from "./hero-sync";
import { createItemEventHandlers } from "./item-events";
import { MenuGlobalKeys } from "./menu-global-keys";
interface AppProps {
  socket: ClientGameSocket;
  peer: Peer;
  debug: string | undefined;
  game: Phaser.Game;
}

export function App({ socket, peer, debug, game }: AppProps) {
  const [currentTooltipId, setCurrentTooltipId] = useState<string | null>(null);
  const [partyInvites, setPartyInvites] = useState<Array<PartyInvite>>([]);
  const [party, setParty] = useState<PartyMessage | null>();
  const [players, setPlayers] = useState<Array<HudCharacter>>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dropItem, setDropItem] = useState<DropItem | null>(null);
  const [hero, setHero] = useState<HudCharacter | null>(null);
  const [keeper, setKeeper] = useState<KeeperView>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tabKeeper, setTabKeeper] = useState(false);
  const [tabEquipment, setTabEquipment] = useState(false);
  const [tabInventory, setTabInventory] = useState(false);
  const [tabChat, setTabChat] = useState(false);
  const [tabProfile, setTabProfile] = useState(false);
  const [tabStats, setTabStats] = useState(false);
  const [tabSocial, setTabSocial] = useState(false);
  const [tabQuests, setTabQuests] = useState(false);
  const [tabAbilities, setTabAbilities] = useState(false);
  const [tabSettings, setTabSettings] = useState(false);
  const [showButtonChat, setShowButtonChat] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [zoom, setZoom] = useState(getHudZoom());
  const [bagState, setBagState] = useState<string[]>([]);
  const [sign, setSign] = useState<Sign | null>(null);
  const [error, setError] = useState<ErrorModal | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, Cooldown>>({});
  const [homeModal, setHomeModal] = useState<KeeperView | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => DEFAULT_USER_SETTINGS);
  const [cheats, setCheats] = useState(false);
  const [localVideoChatStream, setLocalVideoChatStream] = useState<MediaStream | null>(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});

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

  const addMessage = (payload: ChatMessage) => {
    setMessages((prev) => [...prev, { ...payload, timestamp: Date.now() }]);
  };

  const { onPlayerJoin, onPlayerLeave, onHeroInit, onBuffUpdate, onPlayerUpdate, onLootGrabbed } =
    createHeroSyncHandlers({
      addMessage,
      setPlayers,
      setHero,
      setIsLoggedIn,
      setUserSettings,
      setCheats,
    });

  const { onDoubleClickItem, onDropItem } = createItemEventHandlers({
    hero,
    bagState,
    toggleBagState,
    setDropItem,
    socket,
  });

  const onConnect = () => {
    setIsConnected(true);
  };

  const onDisconnect = () => {
    setIsConnected(false);
    setIsLoggedIn(false);
    setUserSettings(DEFAULT_USER_SETTINGS);
    setLocalVideoChatStream(null);
    setRemoteVideoStreams({});
    setTabSettings(false);
    setTabKeeper(false);
    setMessages([]);
    setPlayers([]);
    setParty(null);
    setPartyInvites([]);
    setHero(null);
    setKeeper(undefined);
    setSign(null);
  };

  const {
    onKeeperDataUpdate,
    onHeroChatNpc,
    onUpdateHud,
    onUpdateRoomPlayers,
    onNearNpc,
    onStartCooldown,
    onLoadError,
    onGameLoaded,
  } = createWindowHandlers({
    game,
    socket,
    addMessage,
    setKeeper,
    setHero,
    setPlayers,
    tabKeeper,
    setTabKeeper,
    setSign,
    setShowButtonChat,
    setCooldowns,
    setError,
    setIsLoaded,
  });

  const onPartyInvite: SocketHandlers["partyInvite"] = (inviteData) => {
    // Check if the party invite already exists
    const existingInvite = partyInvites.find((invite) => invite.partyId === inviteData.partyId);
    // Party invite already exists, do not add it again
    if (existingInvite) return;
    addMessage({
      type: "party",
      message: `${inviteData?.inviter?.profile?.userName} has invited you to their party.`,
    });
    // Party invite doesn't exist, add it to the list
    setPartyInvites((prevInvites) => [...prevInvites, inviteData as PartyInvite]);
  };

  const onPartyUpdate: SocketHandlers["partyUpdate"] = ({ message, party }) => {
    // remove the invite
    setPartyInvites([]);
    setParty(party);
    if (message) {
      addMessage({ type: "party", message });
    }
  };

  const onUpdateUserSetting: SocketHandlers["updateUserSetting"] = ({ name, value }) => {
    setUserSettings((prev) => ({
      ...DEFAULT_USER_SETTINGS,
      ...prev,
      [name]: value,
    }));
  };

  const socketHandlers: SocketHandlers = {
    connect: onConnect,
    disconnect: onDisconnect,
    heroInit: onHeroInit,
    buffUpdate: onBuffUpdate,
    playerUpdate: onPlayerUpdate,
    lootGrabbed: onLootGrabbed,
    keeperDataUpdate: onKeeperDataUpdate,
    message: (message) => addMessage(message as ChatMessage), // called without one when there is nothing to say
    playerJoin: onPlayerJoin,
    remove: onPlayerLeave,
    partyInvite: onPartyInvite,
    partyUpdate: onPartyUpdate,
    updateUserSetting: onUpdateUserSetting,
  };
  const windowHandlers: WindowHandlers = {
    HERO_NEAR_NPC: onNearNpc,
    HERO_CHAT_NPC: onHeroChatNpc,
    UPDATE_HUD: onUpdateHud,
    UPDATE_ROOM_PLAYERS: onUpdateRoomPlayers,
    HERO_RESPAWN: onUpdateHud,
    LOAD_ERROR: onLoadError,
    GAME_LOADED: onGameLoaded,
    HERO_START_COOLDOWN: onStartCooldown,
    HERO_DROP_ITEM: onDropItem,
    HERO_DOUBLE_CLICK_ITEM: onDoubleClickItem,
  };
  /* Handlers are bound once but read state, so the bound wrappers call this render's copies. */
  const socketHandlersRef = useRef(socketHandlers);
  const windowHandlersRef = useRef(windowHandlers);
  useEffect(() => {
    socketHandlersRef.current = socketHandlers;
    windowHandlersRef.current = windowHandlers;
  });

  useEffect(() => {
    // tell the server which peer we are
    peer.on("open", (peerId) => {
      socket.emit("peerInit", peerId);
    });
    const unbindSocket = bindSocketHandlers(socket, latestHandlers(socketHandlersRef));
    const unbindWindow = bindWindowHandlers(latestHandlers(windowHandlersRef));

    return () => {
      unbindSocket();
      unbindWindow();
    };
  }, [peer, socket]);

  useViewportSizeEffect(() => {
    const windowHeight = window.innerHeight;
    const bodyHeight = (window.visualViewport as VisualViewport).height;
    let offset = windowHeight - bodyHeight;
    setBottomOffset(offset > 0 ? offset : 0);
    setZoom(getHudZoom());
  });

  const showLogin = !isLoggedIn && isLoaded;

  return (
    <ThemeUIProvider theme={theme as Theme}>
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
          setTabSettings,
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
          tabSettings,
          tabChat,
          keeper,
          tabKeeper,
          hero: hero as HudCharacter,
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
          cheats,
          localVideoChatStream,
          setLocalVideoChatStream,
          remoteVideoStreams,
          setRemoteVideoStreams,
        }}
      >
        <ZoomProvider value={Number(zoom) || 1.25}>
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
            <Modal.Overlay
              sx={{ backgroundImage: "url(./assets/images/bg.jpg)", pointerEvents: "none" }}
            />
            {!isLoggedIn && <ModalLogin />}
            {error && <ModalError />}
          </Box>
          <VideoFrame />
          {isLoggedIn && tabSettings && <ModalSettings />}
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
              <MusicPlayer />
              <FlyingLoot />
            </Box>
          )}
        </ZoomProvider>
      </AppContext.Provider>
    </ThemeUIProvider>
  );
}
