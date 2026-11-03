import React from "react";
import { theme } from "@/ui/kit/theme";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/character";
import type { ChatMessage, ServerToClientEvents } from "@/network/messages";
import type { ClientState } from "@/network/session/client-state";

interface HeroSyncDeps {
  /** The client state, already updated by the message being handled. */
  clientState: ClientState;
  addMessage: (payload: ChatMessage) => void;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  setCheats: React.Dispatch<React.SetStateAction<boolean>>;
}

type Handlers = ServerToClientEvents;

/**
 * The HUD's reactions to hero and player messages: login and the client-only chat lines (joins,
 * level ups, loot found). The hero and players themselves are read from the client state.
 */
export function createHeroSyncHandlers({
  clientState,
  addMessage,
  setIsLoggedIn,
  setUserSettings,
  setCheats,
}: HeroSyncDeps) {
  const isSelf = (id?: string) => !!id && id === clientState.selfId;
  const levelUp = (level: unknown) =>
    addMessage({ type: "success", message: `You are now level ${level}!` });

  const onPlayerJoin: Handlers["playerJoin"] = (_player, args) => {
    /* Only show player join message if the user logged in, not if entered door */
    if (args?.isLogin) addMessage({ type: "info", message: "A player has joined the game." });
  };

  const onHeroInit: Handlers["heroInit"] = (payload, args) => {
    if (args?.isLogin) {
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
    const player = players?.find((p) => isSelf(p?.socketId));
    if (player && playerIdsThatLeveled?.includes(player.id as string)) levelUp(player.stats?.level);
  };

  const onPlayerUpdate: Handlers["playerUpdate"] = (player, args) => {
    if (isSelf(player.socketId) && args?.didLevel) levelUp(player.stats?.level);
  };

  const onLootGrabbed: Handlers["lootGrabbed"] = ({ player, loot }) => {
    if (!isSelf(player?.socketId) || !loot?.grabMessage) return;
    const item = loot?.item;
    addMessage({
      type: "muted",
      message: `Found <span style="font-weight: bold; color: ${theme.colors[item?.rarity as keyof typeof theme.colors]}">${
        item?.name
      }</span> x${item?.amount || 1}`,
    });
  };

  return { onPlayerJoin, onHeroInit, onBuffUpdate, onPlayerUpdate, onLootGrabbed };
}
