import React, { useEffect, useState } from "react";
import { theme } from "@/ui";
import { MenuHud } from "@/client/hud/menu/menu-hud";
import { ModalRespawn } from "@/client/hud/status/modal-respawn";
import { ModalDropAmount } from "@/client/hud/inventory/modal-drop-amount";
import { HUD_CONTAINER_ID } from "@/client/hud/app/constants";
import { ModalLogin } from "@/client/hud/auth/modal-login";
import { ModalSign } from "@/client/hud/menu/modal-sign";
import { ModalError } from "@/client/hud/menu/modal-error";
import { MenuBar } from "@/client/hud/menu/menu-bar";
import { ModalHome } from "@/client/hud/shop/modal-home";
import { ThemeUIProvider, Box, useViewportSizeEffect, Modal } from "@/ui";
import { getSpinDirection } from "@/client/input/spin-direction";
import { getHudZoom } from "./hud-zoom";
import "react-tooltip/dist/react-tooltip.css";
import { Theme } from "theme-ui";
import { DEFAULT_USER_SETTINGS } from "@/shared/rules/world";
import { VideoFrame } from "@/client/hud/video/video-frame";
import { ModalSettings } from "@/client/hud/settings/modal-settings";
import { AppContext } from "./context";
import { createHeroSyncHandlers } from "./hero-sync";
import { createItemEventHandlers } from "./item-events";
import { MenuGlobalKeys } from "./menu-global-keys";
export function App({ socket, peer, debug, game }) {
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
  const [tabSettings, setTabSettings] = useState(false);
  const [showButtonChat, setShowButtonChat] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [zoom, setZoom] = useState(getHudZoom());
  const [bagState, setBagState] = useState([]);
  const [sign, setSign] = useState(null);
  const [error, setError] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [homeModal, setHomeModal] = useState(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => DEFAULT_USER_SETTINGS);
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

  const addMessage = (payload: Message) => {
    setMessages((prev) => [...prev, { ...payload, timestamp: Date.now() }]);
  };

  const { onPlayerJoin, onPlayerLeave, onHeroInit, onBuffUpdate, onPlayerUpdate, onLootGrabbed } =
    createHeroSyncHandlers({ addMessage, setPlayers, setHero, setIsLoggedIn, setUserSettings });

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
    setParty([]);
    setPartyInvites([]);
    setHero(null);
    setKeeper(null);
    setSign(null);
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

  function onUpdateUserSetting({ name, value }) {
    setUserSettings((prev) => ({
      ...DEFAULT_USER_SETTINGS,
      ...prev,
      [name]: value,
    }));
  }

  useEffect(() => {
    // tell the server which peer we are
    peer.on("open", (peerId) => {
      socket.emit("peerInit", peerId);
    });
    const socketHandlers = {
      connect: onConnect,
      disconnect: onDisconnect,
      heroInit: onHeroInit,
      buffUpdate: onBuffUpdate,
      playerUpdate: onPlayerUpdate,
      lootGrabbed: onLootGrabbed,
      keeperDataUpdate: onKeeperDataUpdate,
      message: addMessage,
      playerJoin: onPlayerJoin,
      remove: onPlayerLeave,
      partyInvite: onPartyInvite,
      partyUpdate: onPartyUpdate,
      updateUserSetting: onUpdateUserSetting,
    };
    const windowHandlers = {
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
    const anySocket = socket as any;
    for (const [name, handler] of Object.entries(socketHandlers)) anySocket.on(name, handler);
    for (const [name, handler] of Object.entries(windowHandlers)) {
      window.addEventListener(name, handler);
    }

    return () => {
      for (const [name, handler] of Object.entries(socketHandlers)) anySocket.off(name, handler);
      for (const [name, handler] of Object.entries(windowHandlers)) {
        window.removeEventListener(name, handler);
      }
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
          localVideoChatStream,
          setLocalVideoChatStream,
          remoteVideoStreams,
          setRemoteVideoStreams,
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
          </Box>
        )}
      </AppContext.Provider>
    </ThemeUIProvider>
  );
}
