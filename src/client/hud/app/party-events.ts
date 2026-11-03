import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_USER_SETTINGS } from "@/rules/character";
import type { ChatMessage } from "@/network/messages";
import type { SocketHandlers } from "./app-events";
import type { PartyInvite } from "./context";

interface PartyDeps {
  partyInvites: PartyInvite[];
  addMessage: (payload: ChatMessage) => void;
  setPartyInvites: Dispatch<SetStateAction<PartyInvite[]>>;
  setUserSettings: Dispatch<SetStateAction<UserSettings>>;
}

/** Socket handlers for party invites and updates, and for the settings the server pushes. */
export function createPartyHandlers({
  partyInvites,
  addMessage,
  setPartyInvites,
  setUserSettings,
}: PartyDeps) {
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

  /* The party itself is in the client state. */
  const onPartyUpdate: SocketHandlers["partyUpdate"] = ({ message }) => {
    // remove the invite
    setPartyInvites([]);
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

  return { onPartyInvite, onPartyUpdate, onUpdateUserSetting };
}
