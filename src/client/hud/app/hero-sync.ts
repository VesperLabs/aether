import React from "react";
import { theme } from "@/ui";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/shared/rules/world";
import type { ChatMessage, ServerToClientEvents } from "@/shared/network";
import type { HudCharacter } from "./context";

interface HeroSyncDeps {
  addMessage: (payload: ChatMessage) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Array<HudCharacter>>>;
  setHero: React.Dispatch<React.SetStateAction<HudCharacter | null>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

type Handlers = ServerToClientEvents;

/** Handlers that keep the HUD's copy of the hero and the room's players in sync with the server. */
export function createHeroSyncHandlers({
  addMessage,
  setPlayers,
  setHero,
  setIsLoggedIn,
  setUserSettings,
}: HeroSyncDeps) {
  const onPlayerJoin: Handlers["playerJoin"] = (player, args) => {
    /* Keep room list updated */
    setPlayers((prev = []) => {
      const playerExists = prev.some((p) => p?.id === player?.id);
      return !playerExists ? prev.concat(player) : prev;
    });

    /* Only show player join message if the user logged in, not if entered door */
    if (args?.isLogin) addMessage({ type: "info", message: "A player has joined the game." });
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
      setIsLoggedIn(true);
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
    setHero((prev) => ({ ...prev, ...player }) as HudCharacter);
    /* Show a message if the hero leveled */
    if (playerIdsThatLeveled?.includes(player?.id as string)) {
      addMessage({ type: "success", message: `You are now level ${player?.stats?.level}!` });
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
        addMessage({ type: "success", message: `You are now level ${player.stats?.level}!` });
      }
    }
  };

  const onLootGrabbed: Handlers["lootGrabbed"] = ({ player, loot }) => {
    const socketId = sessionStorage.getItem("socketId");
    // only affect the player that grabbed the loot
    if (socketId === player?.socketId) {
      if (loot?.grabMessage) {
        const item = loot?.item;
        addMessage({
          type: "muted",
          message: `Found <span style="font-weight: bold; color: ${theme.colors[item?.rarity as keyof typeof theme.colors]}">${
            item?.name
          }</span> x${item?.amount || 1}`,
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
