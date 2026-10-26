import React from "react";
import { theme } from "@/ui";
import { DEFAULT_USER_SETTINGS } from "@/shared/rules/world";

interface HeroSyncDeps {
  addMessage: (payload: Message) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Array<FullCharacterState>>>;
  setHero: React.Dispatch<React.SetStateAction<FullCharacterState>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

/** Handlers that keep the HUD's copy of the hero and the room's players in sync with the server. */
export function createHeroSyncHandlers({
  addMessage,
  setPlayers,
  setHero,
  setIsLoggedIn,
  setUserSettings,
}: HeroSyncDeps) {
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

  const onHeroInit = (
    payload: { players: Array<FullCharacterState>; socketId: string; userSettings: UserSettings },
    args,
  ) => {
    const { players, socketId } = payload;
    const player: FullCharacterState = players?.find((p) => p?.socketId === socketId);
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

  return { onPlayerJoin, onPlayerLeave, onHeroInit, onBuffUpdate, onPlayerUpdate, onLootGrabbed };
}
