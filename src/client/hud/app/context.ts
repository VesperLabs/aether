import Phaser from "phaser";
import React, { createContext, useContext } from "react";
import Peer from "peerjs";
import type { ClientGameSocket } from "@/shared/network";

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
  setTabSettings: React.Dispatch<React.SetStateAction<boolean>>;
  toggleBagState: React.Dispatch<React.SetStateAction<any>>;
  setCooldowns: React.Dispatch<React.SetStateAction<any>>;
  setSign: React.Dispatch<React.SetStateAction<any>>;
  setError: React.Dispatch<React.SetStateAction<any>>;
  setHomeModal: React.Dispatch<React.SetStateAction<FullCharacterState | null>>;
  addMessage: React.Dispatch<React.SetStateAction<Message>>;
  setUserSettings: React.Dispatch<React.SetStateAction<any>>;
  userSettings: UserSettings;
  /** Local camera stream when video chat is enabled (for HUD portrait + WebRTC). */
  localVideoChatStream: MediaStream | null;
  setLocalVideoChatStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  /** Remote camera streams keyed by PeerJS id (HUD portrait overlay). */
  remoteVideoStreams: Record<string, MediaStream>;
  setRemoteVideoStreams: React.Dispatch<React.SetStateAction<Record<string, MediaStream>>>;
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
  tabSettings: boolean;
  keeper: any; // data related to NPC you are chatting with
  tabKeeper: boolean;
  hero: FullCharacterState;
  players: Array<FullCharacterState>;
  partyInvites: Array<PartyInvite>;
  setPartyInvites: React.Dispatch<React.SetStateAction<Array<PartyInvite>>>;
  party: any;
  socket: ClientGameSocket;
  peer: Peer;
  debug: boolean;
  game: Phaser.Game;
  zoom: any;
  currentTooltipId: string;
  setCurrentTooltipId: React.Dispatch<React.SetStateAction<any>>;
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue);

export const useAppContext = () => {
  return useContext(AppContext);
};
