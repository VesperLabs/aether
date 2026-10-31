import Phaser from "phaser";
import React, { createContext, useContext } from "react";
import Peer from "peerjs";
import type { BuiltItem, MobProfile, Quest } from "@/content";
import type { ChatMessage, ClientGameSocket, FullCharacterWire, PartyMessage } from "@/network";
import type { UserSettings } from "@/rules/world";
import type { Player } from "@/client/views/player";
import type { Sign } from "@/client/views/sign";

/** A character in the HUD's lists: the party, the room's players. */
export type HudCharacter = FullCharacterWire;

/** A party invite the server sent. */
export interface PartyInvite {
  inviter: HudCharacter;
  partyId: string;
}

/** What the server says about the keeper the hero is chatting with. */
export interface KeeperChatData {
  dialogues?: { greet?: string; quests?: string; shop?: string; home?: string };
  quests?: Quest[];
  shop?: Array<{ item: BuiltItem; stock?: number }>;
  home?: { x: number; y: number };
}

/** The keeper the hero is chatting with: its sprite's state plus the keeper data. */
export type KeeperView = Partial<Player> & { keeperData: KeeperChatData; profile?: MobProfile };

/** The item the drop, sell or buy modal is asking about. */
export type DropAction =
  | "DROP"
  | "DROP_CONFIRM"
  | "SHOP_SELL_AMOUNT"
  | "SHOP_SELL_CONFIRM"
  | "SHOP_BUY_AMOUNT";

export type DropItem = BuiltItem & {
  location: string;
  action: DropAction;
  bagId?: string;
  slotKey?: string;
  dataset?: DOMStringMap;
};

export interface ErrorModal {
  title: string;
  description: string;
}

/** How long a cooldown runs and when it started. */
export interface Cooldown {
  duration: number;
  startTime: number;
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface AppContextValue {
  isLoggedIn: boolean;
  isConnected: boolean;
  isLoaded: boolean;
  showButtonChat: boolean;
  setShowButtonChat: SetState<boolean>;
  setIsConnected: SetState<boolean>;
  setIsLoaded: SetState<boolean>;
  setIsLoggedIn: SetState<boolean>;
  setTabEquipment: SetState<boolean>;
  setTabInventory: SetState<boolean>;
  setTabKeeper: SetState<boolean>;
  setKeeper: SetState<KeeperView | undefined>;
  setTabChat: SetState<boolean>;
  setTabProfile: SetState<boolean>;
  setTabStats: SetState<boolean>;
  setTabSocial: SetState<boolean>;
  setTabQuests: SetState<boolean>;
  setDropItem: SetState<DropItem | null>;
  setTabAbilities: SetState<boolean>;
  setTabSettings: SetState<boolean>;
  toggleBagState: (id: string) => void;
  setCooldowns: SetState<Record<string, Cooldown>>;
  setSign: SetState<Sign | null>;
  setError: SetState<ErrorModal | null>;
  setHomeModal: SetState<KeeperView | null>;
  addMessage: (message: ChatMessage) => void;
  setUserSettings: SetState<UserSettings>;
  userSettings: UserSettings;
  /** Whether the server has cheat chat commands on. */
  cheats: boolean;
  /** Local camera stream when video chat is enabled (for HUD portrait + WebRTC). */
  localVideoChatStream: MediaStream | null;
  setLocalVideoChatStream: SetState<MediaStream | null>;
  /** Remote camera streams keyed by PeerJS id (HUD portrait overlay). */
  remoteVideoStreams: Record<string, MediaStream>;
  setRemoteVideoStreams: SetState<Record<string, MediaStream>>;
  homeModal: KeeperView | null;
  error: ErrorModal | null;
  sign: Sign | null;
  bagState: Array<string>;
  cooldowns: Record<string, Cooldown>;
  messages: ChatMessage[];
  bottomOffset: number;
  dropItem: DropItem | null;
  tabEquipment: boolean;
  tabQuests: boolean;
  tabInventory: boolean;
  tabChat: boolean;
  tabProfile: boolean;
  tabStats: boolean;
  tabSocial: boolean;
  tabAbilities: boolean;
  tabSettings: boolean;
  keeper: KeeperView | undefined; // data related to NPC you are chatting with
  tabKeeper: boolean;
  /** The HUD only renders once the hero exists (after login), so this is never null in it. */
  hero: HudCharacter;
  players: Array<HudCharacter>;
  partyInvites: Array<PartyInvite>;
  setPartyInvites: SetState<Array<PartyInvite>>;
  party: PartyMessage | null | undefined;
  socket: ClientGameSocket;
  peer: Peer;
  debug: string | undefined;
  game: Phaser.Game;
  /** The HUD scale, as a number in a string (see `getHudZoom`). */
  zoom: string;
  currentTooltipId: string | null;
  setCurrentTooltipId: SetState<string | null>;
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useAppContext = () => {
  return useContext(AppContext);
};
