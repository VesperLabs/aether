import React from "react";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/world";
import type { ChatMessage, ServerToClientEvents } from "@/network";
import type { BuiltItem } from "@/content";
import { chatLinkText } from "@/client/hud/chat/chat-links";
import type { HudCharacter } from "./context";

interface HeroSyncDeps {
  addMessage: (payload: ChatMessage) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Array<HudCharacter>>>;
  setHero: React.Dispatch<React.SetStateAction<HudCharacter | null>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  setCheats: React.Dispatch<React.SetStateAction<boolean>>;
}

type Handlers = ServerToClientEvents;

/** Handlers that keep the HUD's copy of the hero and the room's players in sync with the server. */
export function createHeroSyncHandlers({
  addMessage,
  setMessages,
  setPlayers,
  setHero,
  setIsLoggedIn,
  setUserSettings,
  setCheats,
}: HeroSyncDeps) {
  const onPlayerJoin: Handlers["playerJoin"] = (player, args) => {
    /* Keep room list updated */
    setPlayers((prev = []) => {
      const playerExists = prev.some((p) => p?.id === player?.id);
      return !playerExists ? prev.concat(player) : prev;
    });

    /* Only show player join message if the user logged in, not if entered door */
    if (args?.isLogin) addMessage({ type: "system", message: "A player has joined the game." });
  };

  const onPlayerLeave: Handlers["remove"] = (socketId) => {
    setPlayers((prev) => prev.filter((player) => player.socketId !== socketId));
  };

  const onHeroInit: Handlers["heroInit"] = (payload, args) => {
    const { players, socketId } = payload;
    const player = players?.find((p) => p?.socketId === socketId) as HudCharacter;
    //TODO: get rid of this session storage reference. i think we can just use a state callback here
    sessionStorage.setItem("socketId", socketId);
    setPlayers(players);
    setHero(player);
    if (args?.isLogin) {
      /* Whatever the room said while we watched from the login screen */
      setMessages([]);
      setIsLoggedIn(true);
      setCheats(!!payload?.cheats);
      setUserSettings({
        ...DEFAULT_USER_SETTINGS,
        ...payload?.userSettings,
      });
    }
  };

  const onBuffUpdate: Handlers["buffUpdate"] = (payload) => {
    const { players, playerIdsThatLeveled } = payload;
    const socketId = sessionStorage.getItem("socketId");
    const player = players?.find((p) => p?.socketId === socketId);
    /* Keep the hero updated */
    if (player) setHero((prev) => ({ ...prev, ...player }) as HudCharacter);
    /* Show a message if the hero leveled */
    if (playerIdsThatLeveled?.includes(player?.id as string)) {
      addMessage({ type: "reward", message: `You are now level ${player?.stats?.level}!` });
    }
    /* Merge updates into player */
    setPlayers((prev) => {
      return prev.map((p) => {
        const foundPlayer = players?.find((x) => p?.id === x?.id);
        const newPlayerState = foundPlayer ? { ...p, ...foundPlayer } : p;
        return newPlayerState as HudCharacter;
      });
    });
  };

  const onPlayerUpdate: Handlers["playerUpdate"] = (player, args) => {
    const currentPlayerSocketId = sessionStorage.getItem("socketId");
    const isCurrentPlayer = currentPlayerSocketId === player.socketId;
    setPlayers((prev) => {
      return prev.map((p) => (p.id === player.id ? player : p));
    });

    if (isCurrentPlayer) {
      setHero(player);
      if (args?.didLevel) {
        addMessage({ type: "reward", message: `You are now level ${player.stats?.level}!` });
      }
    }
  };

  const onLootGrabbed: Handlers["lootGrabbed"] = ({ player, loot }) => {
    const socketId = sessionStorage.getItem("socketId");
    // only affect the player that grabbed the loot
    if (socketId === player?.socketId) {
      if (loot?.grabMessage) {
        const item = loot?.item;
        const amount = Number(item?.amount) > 1 ? ` x${item?.amount}` : "";
        addMessage({
          type: "reward",
          message: `Found ${chatLinkText(item)}${amount}`,
          links: [item as unknown as BuiltItem],
        });
      }
      /* Both quests and inventory only need to be updated when we pick an item */
      setHero(
        (prev) =>
          ({
            ...prev,
            inventory: player?.inventory,
            quests: player?.quests,
            abilities: player?.abilities,
          }) as HudCharacter,
      );
    }
  };

  return { onPlayerJoin, onPlayerLeave, onHeroInit, onBuffUpdate, onPlayerUpdate, onLootGrabbed };
}
